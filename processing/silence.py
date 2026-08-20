import os
import re

from .common import run_cmd, get_duration


def detect_silence(path, noise_db, min_dur):
    # silencedetect writes its findings to stderr, not stdout, ffmpeg is weird like that
    cmd = [
        "ffmpeg", "-i", path, "-af",
        f"silencedetect=noise={noise_db}:d={min_dur}",
        "-f", "null", "-"
    ]
    result = run_cmd(cmd)
    log_text = result.stderr

    starts = [float(x) for x in re.findall(r"silence_start:\s*([\d.]+)", log_text)]
    ends = [float(x) for x in re.findall(r"silence_end:\s*([\d.]+)", log_text)]

    if len(starts) > len(ends):
        ends.append(get_duration(path))

    return list(zip(starts, ends))


def invert_to_keep_segments(silences, total_duration, pad_start, pad_end):
    """
    Turn silence windows into the segments we actually want to keep.
    pad_end shrinks each silence window from the front (giving trailing speech
    more room before a cut), pad_start shrinks it from the back (giving the
    next bit of speech more room at its start).
    """
    keep = []
    cursor = 0.0

    for s_start, s_end in silences:
        adj_start = min(s_end, s_start + pad_end)
        adj_end = max(adj_start, s_end - pad_start)

        if adj_start > cursor:
            keep.append((cursor, adj_start))
        cursor = max(cursor, adj_end)

    if cursor < total_duration:
        keep.append((cursor, total_duration))

    return [(a, b) for a, b in keep if b - a > 0.05]


def cut_segment(path, start, end, out_path, use_copy):
    duration = end - start
    if use_copy:
        cmd = [
            "ffmpeg", "-y", "-ss", str(start), "-i", path, "-t", str(duration),
            "-c", "copy", "-avoid_negative_ts", "make_zero",
            out_path
        ]
    else:
        cmd = [
            "ffmpeg", "-y", "-i", path, "-ss", str(start), "-t", str(duration),
            "-c:v", "libx264", "-crf", "16", "-preset", "slow",
            "-c:a", "aac", "-b:a", "192k",
            out_path
        ]
    result = run_cmd(cmd)
    return result.returncode == 0


def run_remove_silence(input_path, noise="-30dB", duration=0.5, pad_start=0.15,
                        pad_end=0.4, use_copy=False, dry_run=False, log=print):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"can't find {input_path}")

    log("checking duration...")
    total = get_duration(input_path)

    log("scanning for silence...")
    silences = detect_silence(input_path, noise, duration)

    if not silences:
        log("didn't find any silence with these settings")
        return {"silences": [], "clips": [], "out_dir": None, "stats": {}}

    if dry_run:
        report = [{"start": s, "end": e, "length": e - s} for s, e in silences]
        lengths = sorted(e - s for s, e in silences)
        stats = {
            "shortest": lengths[0], "longest": lengths[-1],
            "median": lengths[len(lengths) // 2]
        } if lengths else {}
        log(f"found {len(silences)} silent stretch(es)")
        return {"silences": report, "stats": stats, "clips": [], "out_dir": None}

    input_dir = os.path.dirname(os.path.abspath(input_path))
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    out_dir = os.path.join(input_dir, base_name)
    os.makedirs(out_dir, exist_ok=True)

    keep_segments = invert_to_keep_segments(silences, total, pad_start, pad_end)
    log(f"found {len(silences)} silent stretch(es), keeping {len(keep_segments)} segment(s)")
    log(f"saving clips to {out_dir}")

    clips = []
    for i, (start, end) in enumerate(keep_segments, start=1):
        clip_name = f"{i:02d}.mp4"
        clip_path = os.path.join(out_dir, clip_name)
        ok = cut_segment(input_path, start, end, clip_path, use_copy)
        status = "saved" if ok else "FAILED"
        log(f"  {status} {clip_name}: {start:.2f}s to {end:.2f}s")
        clips.append({"name": clip_name, "start": start, "end": end, "status": status})

    log(f"done, {len(keep_segments)} clip(s) saved to {out_dir}")
    return {
        "silences": [{"start": s, "end": e, "length": e - s} for s, e in silences],
        "clips": clips,
        "out_dir": out_dir
    }

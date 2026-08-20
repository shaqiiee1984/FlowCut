import glob
import os
import re
import tempfile

from .common import run_cmd, get_duration, get_dimensions


def natural_sort_key(path):
    # pulls the number out of "02.mp4" etc so 2 sorts before 10
    digits = re.findall(r"\d+", os.path.basename(path))
    return int(digits[0]) if digits else 0


def find_clips(folder):
    files = glob.glob(os.path.join(folder, "*.mp4"))
    files.sort(key=natural_sort_key)
    return files


def make_even(n):
    n = round(n)
    return n if n % 2 == 0 else n + 1


def process_clip(src, out_path, zoom, orig_w, orig_h):
    """Re-encode one clip, applying a center zoom-in if zoom > 0."""
    if zoom > 0:
        factor = 1 + (zoom / 100)
        new_w = make_even(orig_w * factor)
        new_h = make_even(orig_h * factor)
        vf = f"scale={new_w}:{new_h},crop={orig_w}:{orig_h}"
        cmd = [
            "ffmpeg", "-y", "-i", src,
            "-vf", vf,
            "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            out_path
        ]
    else:
        # still re-encode with the same settings so every clip matches for a clean concat
        cmd = [
            "ffmpeg", "-y", "-i", src,
            "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            out_path
        ]
    result = run_cmd(cmd)
    return result.returncode == 0


def run_combine(folder, zoom=10, start_zoomed=False, output=None, log=print):
    if not os.path.isdir(folder):
        raise NotADirectoryError(f"can't find folder {folder}")

    clips = find_clips(folder)
    if not clips:
        raise FileNotFoundError(f"no .mp4 files found in {folder}")

    log(f"found {len(clips)} clip(s), checking durations...")

    valid_clips = []
    skipped = []
    for path in clips:
        dur = get_duration(path)
        if dur < 0.05:
            log(f"  skipping {os.path.basename(path)}: zero/near-zero duration ({dur:.3f}s)")
            skipped.append(os.path.basename(path))
        else:
            valid_clips.append(path)

    if not valid_clips:
        raise ValueError("no valid (non-empty) clips left after filtering")

    dims = get_dimensions(valid_clips[0])
    if not dims:
        raise ValueError(f"couldn't read video dimensions from {valid_clips[0]}")
    orig_w, orig_h = dims
    log(f"source resolution: {orig_w}x{orig_h}")

    # alternation is based on position among the VALID clips, so a skipped
    # clip doesn't throw off the pattern for the ones after it
    plan = []
    for i, path in enumerate(valid_clips):
        is_zoomed = (i % 2 == 1) if not start_zoomed else (i % 2 == 0)
        plan.append((path, is_zoomed))

    log(f"combine plan ({len(plan)} clip(s), zoom = {zoom:.0f}% on alternates):")
    for path, is_zoomed in plan:
        tag = f"ZOOM +{zoom:.0f}%" if is_zoomed else "original"
        log(f"  {os.path.basename(path):<12} -> {tag}")

    if output:
        output_path = output
    else:
        folder_name = os.path.basename(os.path.normpath(folder))
        parent_dir = os.path.dirname(os.path.abspath(folder))
        output_path = os.path.join(parent_dir, f"{folder_name}_combined.mp4")

    with tempfile.TemporaryDirectory() as tmp:
        list_path = os.path.join(tmp, "concat_list.txt")
        processed_paths = []

        for i, (path, is_zoomed) in enumerate(plan):
            zoom_amount = zoom if is_zoomed else 0
            processed_path = os.path.join(tmp, f"proc_{i:04d}.mp4")
            log(f"processing {os.path.basename(path)} ({'zoomed' if is_zoomed else 'original'})...")
            ok = process_clip(path, processed_path, zoom_amount, orig_w, orig_h)
            if not ok:
                raise RuntimeError(f"ffmpeg failed processing {path}")
            processed_paths.append(processed_path)

        with open(list_path, "w") as f:
            for p in processed_paths:
                f.write(f"file '{p}'\n")

        log("stitching all clips together...")
        concat_cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_path,
            "-c", "copy", output_path
        ]
        run_cmd(concat_cmd)

    if not (os.path.exists(output_path) and os.path.getsize(output_path) > 0):
        raise RuntimeError("something went wrong, output file wasn't created")

    log(f"done, combined video saved to {output_path}")
    return {
        "output_path": output_path,
        "plan": [{"name": os.path.basename(p), "zoomed": z} for p, z in plan],
        "skipped": skipped
    }

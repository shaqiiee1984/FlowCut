import subprocess


def run_cmd(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def get_duration(path):
    out = run_cmd([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path
    ])
    try:
        return float(out.stdout.strip())
    except (ValueError, AttributeError):
        return 0.0


def get_dimensions(path):
    out = run_cmd([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=s=x:p=0", path
    ])
    try:
        w, h = out.stdout.strip().split("x")
        return int(w), int(h)
    except (ValueError, AttributeError):
        return None

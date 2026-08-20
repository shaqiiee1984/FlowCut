import os


def format_timestamp(seconds):
    if seconds < 0:
        seconds = 0
    total_ms = round(seconds * 1000)
    hours, remainder = divmod(total_ms, 3600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, ms = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def segments_to_srt(segments):
    lines = []
    for i, seg in enumerate(segments, start=1):
        start = format_timestamp(seg["start"])
        end = format_timestamp(seg["end"])
        text = seg["text"].strip()
        lines.append(str(i))
        lines.append(f"{start} --> {end}")
        lines.append(text)
        lines.append("")  # blank line between entries, SRT needs this
    return "\n".join(lines)


# keeps loaded whisper models around between jobs so repeated same-day use
# doesn't reload multi-hundred-MB weights every single time
_model_cache = {}


def run_captions(input_path, model="small", language=None, output=None, log=print):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"can't find {input_path}")

    try:
        import whisper
    except ImportError:
        raise RuntimeError(
            "the 'openai-whisper' package isn't installed. run: pip install -U openai-whisper"
        )

    output_path = output or os.path.splitext(input_path)[0] + ".srt"

    if model not in _model_cache:
        log(f"loading whisper model '{model}'... (first run downloads it, can take a bit)")
        _model_cache[model] = whisper.load_model(model)
    else:
        log(f"using already-loaded '{model}' model...")
    whisper_model = _model_cache[model]

    log(f"transcribing {input_path}... (this can take a while depending on length and model size)")
    result = whisper_model.transcribe(input_path, language=language, verbose=False)

    segments = result.get("segments", [])
    detected_lang = result.get("language", "unknown")
    log(f"detected language: {detected_lang}")
    log(f"got {len(segments)} caption segment(s)")

    if not segments:
        log("warning: whisper didn't detect any spoken words. output file will be empty.")
        srt_content = ""
    else:
        srt_content = segments_to_srt(segments)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(srt_content)

    log(f"done, captions saved to {output_path}")
    preview = " ".join(s["text"].strip() for s in segments[:5]) if segments else ""
    return {
        "output_path": output_path,
        "language": detected_lang,
        "segment_count": len(segments),
        "preview": preview
    }

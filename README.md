# Video Tools (local webapp)

Wraps three things into one local web UI:
- Remove Silence
- Combine Clips (with alternating zoom)
- Extract Captions (Whisper, runs locally, no API key needed)

## Setup (one time)

Needs ffmpeg already installed and on your PATH (`ffmpeg -version` should print
something in Terminal, not an error). If it doesn't, install via `brew install ffmpeg`
or see https://www.gyan.dev/ffmpeg/builds/ for a direct download.

1. Open Terminal, `cd` into this folder
2. `python3 -m venv venv`
3. `source venv/bin/activate`
4. `pip install -r requirements.txt`

Step 4 pulls in Flask, openai-whisper, and PyTorch. The torch download is a
few hundred MB, so it'll take a minute or two depending on your connection.
This only needs to happen once.

## Running it

```
cd video_tools_webapp
source venv/bin/activate
python app.py
```

Then open http://127.0.0.1:5050 in your browser. Leave the Terminal window
open while you use it, closing it stops the server. Ctrl+C in that window
shuts it down cleanly.

## Notes

- Only listens on 127.0.0.1 (your machine), nothing is exposed on your network.
- The "Browse" buttons open native macOS file/folder pickers via osascript,
  so you're not uploading large video files anywhere, just pointing at the
  path on disk.
- The whisper model downloads once per size the first time you use it, then
  it's cached (usually under ~/.cache/whisper) and reused after that. It also
  stays loaded in memory between jobs while the server's running, so repeat
  transcriptions the same day are faster after the first one.
- All three jobs run in a background thread, with the log box on the page
  polling for progress every ~0.8s, so the page stays responsive during
  long transcriptions.

## If you want this always running in the background

Right now you start it manually each time from Terminal. If that gets old,
say the word and I can set it up as a macOS LaunchAgent so it starts
automatically at login and just quietly runs in the background, no Terminal
window needed. Just didn't want to add that complexity up front until you've
actually used the app a bit and know it does what you want.

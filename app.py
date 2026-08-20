import os
import platform
import subprocess
import threading
import uuid

from flask import Flask, jsonify, render_template, request, send_file

from processing.silence import run_remove_silence
from processing.combine import run_combine
from processing.captions import run_captions

app = Flask(__name__)

JOBS = {}
LOCK = threading.Lock()


def new_job():
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"status": "running", "log": [], "result": None, "error": None}
    return job_id


def append_log(job_id, msg):
    with LOCK:
        JOBS[job_id]["log"].append(msg)


def finish_job(job_id, result):
    with LOCK:
        JOBS[job_id]["status"] = "done"
        JOBS[job_id]["result"] = result


def fail_job(job_id, error):
    with LOCK:
        JOBS[job_id]["status"] = "error"
        JOBS[job_id]["error"] = str(error)


def run_in_thread(job_id, target, kwargs):
    def wrapper():
        try:
            result = target(log=lambda m: append_log(job_id, m), **kwargs)
            finish_job(job_id, result)
        except Exception as e:
            append_log(job_id, f"ERROR: {e}")
            fail_job(job_id, e)
    threading.Thread(target=wrapper, daemon=True).start()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/browse", methods=["POST"])
def browse():
    data = request.get_json(force=True)
    mode = data.get("mode", "file")
    path = None
    
    current_os = platform.system()
    if current_os == "Darwin":
        if mode == "folder":
            script = 'POSIX path of (choose folder with prompt "Select folder")'
        elif mode == "save":
            script = 'POSIX path of (choose file name with prompt "Save as")'
        else:
            script = 'POSIX path of (choose file with prompt "Select video")'

        result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
        path = result.stdout.strip()
        if result.returncode != 0:
            path = None
    elif current_os == "Windows":
        import tkinter as tk
        from tkinter import filedialog
        
        root = None
        try:
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            
            if mode == "folder":
                path = filedialog.askdirectory(title="Select Folder")
            elif mode == "save":
                path = filedialog.asksaveasfilename(
                    title="Save As",
                    filetypes=[("Video Files", "*.mp4 *.mov *.avi"), ("All Files", "*.*")]
                )
            else:
                path = filedialog.askopenfilename(
                    title="Select Video",
                    filetypes=[("Video Files", "*.mp4 *.mov *.avi"), ("All Files", "*.*")]
                )
        except Exception as e:
            path = None
        finally:
            if root:
                try:
                    root.destroy()
                except Exception:
                    pass
    
    if not path:
        return jsonify({"path": None})
    return jsonify({"path": path})


@app.route("/api/reveal", methods=["POST"])
def reveal():
    data = request.get_json(force=True)
    path = data.get("path")
    if path and os.path.exists(path):
        current_os = platform.system()
        if current_os == "Windows":
            norm_path = os.path.normpath(path)
            if os.path.isdir(norm_path):
                subprocess.run(["explorer.exe", norm_path])
            else:
                subprocess.run(["explorer.exe", "/select,", norm_path])
        else:
            subprocess.run(["open", "-R", path])
        return jsonify({"ok": True})
    return jsonify({"ok": False})


@app.route("/api/fs/list", methods=["POST"])
def fs_list():
    data = request.get_json(force=True) or {}
    path = data.get("path")
    
    # Default to user home directory if no path or if it doesn't exist
    if not path or not os.path.exists(path):
        path = os.path.expanduser("~")
        
    try:
        path = os.path.abspath(path)
        items = []
        
        # Add parent directory
        parent = os.path.dirname(path)
        if parent != path:
            items.append({
                "name": "..",
                "path": parent,
                "is_dir": True
            })
            
        for entry in os.scandir(path):
            try:
                items.append({
                    "name": entry.name,
                    "path": entry.path,
                    "is_dir": entry.is_dir()
                })
            except OSError:
                pass
                
        # Sort ".." first, then directories, then files
        items.sort(key=lambda x: (x["name"] != "..", not x["is_dir"], x["name"].lower()))
        
        return jsonify({
            "success": True,
            "current_path": path,
            "items": items
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })


@app.route("/api/video")
def video():
    path = request.args.get("path")
    if not path or not os.path.exists(path):
        return "File not found", 404
    return send_file(path, conditional=True)


@app.route("/api/silence/start", methods=["POST"])
def silence_start():
    data = request.get_json(force=True)
    job_id = new_job()
    kwargs = {
        "input_path": data["input_path"],
        "noise": data.get("noise") or "-30dB",
        "duration": float(data.get("duration") or 0.5),
        "pad_start": float(data.get("pad_start") or 0.15),
        "pad_end": float(data.get("pad_end") or 0.4),
        "use_copy": bool(data.get("use_copy", False)),
        "dry_run": bool(data.get("dry_run", False)),
    }
    run_in_thread(job_id, run_remove_silence, kwargs)
    return jsonify({"job_id": job_id})


@app.route("/api/combine/start", methods=["POST"])
def combine_start():
    data = request.get_json(force=True)
    job_id = new_job()
    kwargs = {
        "folder": data["folder"],
        "zoom": float(data.get("zoom") or 10),
        "start_zoomed": bool(data.get("start_zoomed", False)),
        "output": data.get("output") or None,
    }
    run_in_thread(job_id, run_combine, kwargs)
    return jsonify({"job_id": job_id})


@app.route("/api/captions/start", methods=["POST"])
def captions_start():
    data = request.get_json(force=True)
    job_id = new_job()
    kwargs = {
        "input_path": data["input_path"],
        "model": data.get("model") or "small",
        "language": data.get("language") or None,
        "output": data.get("output") or None,
    }
    run_in_thread(job_id, run_captions, kwargs)
    return jsonify({"job_id": job_id})


@app.route("/api/status/<job_id>")
def status(job_id):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"status": "unknown"}), 404
    return jsonify(job)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=False, threaded=True)

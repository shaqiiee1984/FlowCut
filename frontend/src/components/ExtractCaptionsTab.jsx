import React, { useState } from 'react';
import VideoPreviewPlayer from './VideoPreviewPlayer';
import LogTerminal from './LogTerminal';
import { MessageSquare, FolderOpen, Play, CheckCircle, AlertCircle } from 'lucide-react';

export default function ExtractCaptionsTab() {
  const [inputPath, setInputPath] = useState('');
  const [model, setModel] = useState('small');
  const [language, setLanguage] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [jobResult, setJobResult] = useState(null);
  const [jobError, setJobError] = useState(null);

  const filename = inputPath ? (inputPath.split(/[/\\]/).pop() || inputPath) : 'No file selected';

  const handleBrowse = async () => {
    try {
      const res = await fetch("/api/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "file" })
      });
      const data = await res.json();
      if (data.path) {
        setInputPath(data.path);
      }
    } catch (err) {
      console.error("Browse failed:", err);
    }
  };

  const handleBrowseSave = async () => {
    try {
      const res = await fetch("/api/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "save" })
      });
      const data = await res.json();
      if (data.path) {
        setOutputPath(data.path);
      }
    } catch (err) {
      console.error("Browse save failed:", err);
    }
  };

  const handleReveal = (path) => {
    fetch("/api/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path })
    });
  };

  const startCaptionsJob = async () => {
    if (!inputPath) {
      alert("Please select a video file first.");
      return;
    }

    setIsRunning(true);
    setLogs(["Starting process..."]);
    setJobResult(null);
    setJobError(null);

    try {
      const res = await fetch("/api/captions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_path: inputPath,
          model: model,
          language: language || null,
          output: outputPath || null
        })
      });
      const { job_id } = await res.json();
      pollJob(job_id);
    } catch (err) {
      setJobError(err.message);
      setIsRunning(false);
    }
  };

  const pollJob = (jobId) => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        const job = await res.json();

        if (job.log) {
          setLogs(job.log);
        }

        if (job.status === "done") {
          clearInterval(timer);
          setJobResult(job.result);
          setIsRunning(false);
        } else if (job.status === "error") {
          clearInterval(timer);
          setJobError(job.error);
          setIsRunning(false);
        }
      } catch (err) {
        clearInterval(timer);
        setJobError(err.message);
        setIsRunning(false);
      }
    }, 800);
  };

  return (
    <div className="two-col-layout">
      {/* Left Column: Controls */}
      <div className="left-col">
        {/* Choose Video Card */}
        <div className="card choose-file-card">
          <div className="file-drop-zone">
            <div className="file-icon-wrapper">
              <MessageSquare />
            </div>
            <h3>Choose a video file</h3>
            <p className="file-subtext">Will extract subtitles locally using Whisper model</p>
            <div className="path-row" style={{ width: '100%', maxWidth: '480px', margin: '0 auto 10px auto' }}>
              <input 
                type="text" 
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="Type or paste video file path here..."
              />
              <button className="btn btn-secondary browse-btn" onClick={handleBrowse} style={{ marginTop: 0 }}>
                Browse
              </button>
            </div>
            <div className={`selected-filename-badge ${inputPath ? 'has-file' : ''}`}>
              {filename}
            </div>
          </div>
        </div>

        {/* Whisper Settings Card */}
        <div className="card settings-card">
          <h3 className="settings-title">Whisper settings</h3>
          
          <div className="field">
            <label>Model Size</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="tiny">tiny (fastest, lowest resource)</option>
              <option value="base">base</option>
              <option value="small">small (default)</option>
              <option value="medium">medium (more accurate, slower)</option>
              <option value="large">large (most accurate, slowest)</option>
            </select>
          </div>

          <div className="field">
            <label>Language (optional)</label>
            <input 
              type="text" 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. English, Spanish (defaults to auto-detect)"
            />
          </div>

          <div className="field">
            <label>Output file path (optional)</label>
            <div className="path-row">
              <input 
                type="text" 
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder="defaults to .srt next to source video"
              />
              <button className="btn btn-secondary" onClick={handleBrowseSave}>Browse</button>
            </div>
          </div>
        </div>

        <div className="action-row">
          <button 
            className="btn btn-primary run-action-btn" 
            disabled={isRunning}
            onClick={startCaptionsJob}
          >
            <Play className="btn-icon" />
            Extract captions
          </button>
        </div>
      </div>

      {/* Right Column: Preview & Logs */}
      <div className="right-col">
        <VideoPreviewPlayer path={inputPath} prefix="t" />

        <LogTerminal logs={logs} placeholder="Ready. Logs will output here during process..." />

        {/* Results Card */}
        {(jobResult || jobError) && (
          <div className="card results-card">
            <h3 className="results-title">Extracted Subtitles</h3>

            {jobError && (
              <div className="error-message">
                <AlertCircle className="msg-icon" style={{ marginRight: '8px', float: 'left' }} />
                Error: {jobError}
              </div>
            )}

            {jobResult && (
              <div>
                <div className="success-message" style={{ marginBottom: '12px' }}>
                  <CheckCircle className="msg-icon" />
                  <div>
                    <strong>Captions Extracted</strong>
                    <p>Language: <strong>{jobResult.language ? jobResult.language.toUpperCase() : 'UNKNOWN'}</strong> | Segments: {jobResult.segment_count}</p>
                  </div>
                </div>

                {jobResult.preview && (
                  <div className="preview-box">
                    <span className="preview-tag">Preview snippet</span>
                    <p className="preview-text">"{jobResult.preview}"</p>
                  </div>
                )}

                <button 
                  className="btn btn-secondary reveal-btn" 
                  onClick={() => handleReveal(jobResult.output_path)}
                >
                  <FolderOpen className="btn-icon" />
                  Reveal in Explorer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

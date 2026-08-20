import React, { useState, useEffect } from 'react';
import VideoPreviewPlayer from './VideoPreviewPlayer';
import LogTerminal from './LogTerminal';
import { Video, FolderOpen, Play, CheckCircle, AlertCircle, FileVideo } from 'lucide-react';

export default function SilenceRemovalTab() {
  const [inputPath, setInputPath] = useState('');
  const [noiseVal, setNoiseVal] = useState(-30);
  const [duration, setDuration] = useState(0.5);
  const [padStart, setPadStart] = useState(0.15);
  const [padEnd, setPadEnd] = useState(0.40);
  const [useCopy, setUseCopy] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Ready.');
  const [jobResult, setJobResult] = useState(null);
  const [jobError, setJobError] = useState(null);
  const [isDryRun, setIsDryRun] = useState(true);

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

  const handleReveal = (path) => {
    fetch("/api/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path })
    });
  };

  const startSilenceJob = async (dryRun = true) => {
    if (!inputPath) {
      alert("Please select a video file first.");
      return;
    }

    setIsRunning(true);
    setIsDryRun(dryRun);
    setLogs(["Starting process..."]);
    setJobResult(null);
    setJobError(null);
    setStatusMessage("Starting process...");

    try {
      const res = await fetch("/api/silence/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_path: inputPath,
          noise: `${noiseVal}dB`,
          duration: parseFloat(duration),
          pad_start: parseFloat(padStart),
          pad_end: parseFloat(padEnd),
          dry_run: dryRun,
          use_copy: useCopy
        })
      });
      const { job_id } = await res.json();
      pollJob(job_id, dryRun);
    } catch (err) {
      setJobError(err.message);
      setIsRunning(false);
    }
  };

  const pollJob = (jobId, dryRun) => {
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
          setStatusMessage("Done.");
        } else if (job.status === "error") {
          clearInterval(timer);
          setJobError(job.error);
          setIsRunning(false);
          setStatusMessage("Failed.");
        }
      } catch (err) {
        clearInterval(timer);
        setJobError(err.message);
        setIsRunning(false);
        setStatusMessage("Failed.");
      }
    }, 800);
  };

  return (
    <div className="two-col-layout">
      {/* Left Column: Controls */}
      <div className="left-col">
        {/* File Selector Card */}
        <div className="card choose-file-card">
          <div className="file-drop-zone">
            <div className="file-icon-wrapper">
              <Video />
            </div>
            <h3>Choose a video file</h3>
            <p class="file-subtext">MP4, MOV, MKV — processed locally on your machine</p>
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

        {/* Detection Settings Card */}
        <div className="card settings-card">
          <h3 className="settings-title">Detection settings</h3>
          
          <div className="slider-field">
            <div className="slider-header">
              <span className="slider-label">Silence threshold</span>
              <span className="slider-value">{noiseVal} dB</span>
            </div>
            <input 
              type="range" 
              min="-60" 
              max="-10" 
              value={noiseVal} 
              onChange={(e) => setNoiseVal(parseInt(e.target.value))}
            />
            <p className="slider-help">How quiet audio must be to count as silence.</p>
          </div>

          <div className="slider-field">
            <div className="slider-header">
              <span className="slider-label">Minimum silence length</span>
              <span className="slider-value">{parseFloat(duration).toFixed(2)} s</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="3.0" 
              step="0.05" 
              value={duration} 
              onChange={(e) => setDuration(parseFloat(e.target.value))}
            />
            <p className="slider-help">Shorter pauses are kept as natural speech.</p>
          </div>

          <div className="slider-grid">
            <div className="slider-field">
              <div className="slider-header">
                <span className="slider-label">Cut buffer (before)</span>
                <span className="slider-value">{parseFloat(padStart).toFixed(2)} s</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="1.0" 
                step="0.05" 
                value={padStart} 
                onChange={(e) => setPadStart(parseFloat(e.target.value))}
              />
            </div>
            
            <div className="slider-field">
              <div className="slider-header">
                <span className="slider-label">Cut buffer (after)</span>
                <span className="slider-value">{parseFloat(padEnd).toFixed(2)} s</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="1.0" 
                step="0.05" 
                value={padEnd} 
                onChange={(e) => setPadEnd(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="checkbox-row" style={{ marginTop: '15px' }}>
            <label className="custom-checkbox">
              <input 
                type="checkbox" 
                checked={useCopy} 
                onChange={(e) => setUseCopy(e.target.checked)}
              />
              <span className="checkbox-box"></span>
              <span className="checkbox-text">Use stream copy (fast, but only safe with frequent keyframes)</span>
            </label>
          </div>
        </div>

        {/* Action Row */}
        <div className="action-row">
          <button 
            className="btn btn-primary run-action-btn" 
            disabled={isRunning}
            onClick={() => startSilenceJob(true)}
          >
            <Play className="btn-icon" />
            Preview silences
          </button>
        </div>
      </div>

      {/* Right Column: Live Preview & Status */}
      <div className="right-col">
        <VideoPreviewPlayer path={inputPath} prefix="s" />

        <LogTerminal logs={logs} placeholder="Ready. Logs will output here during process..." />

        {/* Results Card */}
        {(jobResult || jobError) && (
          <div className="card results-card">
            <h3 className="results-title">Analysis Results</h3>
            
            {jobError && (
              <div className="error-message">
                <AlertCircle className="msg-icon" style={{ marginRight: '8px', float: 'left' }} />
                Error: {jobError}
              </div>
            )}

            {jobResult && isDryRun && (
              <div>
                {jobResult.silences && jobResult.silences.length > 0 ? (
                  <>
                    <p className="result-summary">Found <strong>{jobResult.silences.length}</strong> silence segments:</p>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Start (s)</th>
                            <th>End (s)</th>
                            <th>Length (s)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobResult.silences.map((s, i) => (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td>{s.start.toFixed(2)}</td>
                              <td>{s.end.toFixed(2)}</td>
                              <td>{s.length.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="result-action-bar">
                      <button 
                        className="btn btn-primary split-confirm-btn" 
                        onClick={() => startSilenceJob(false)}
                      >
                        <CheckCircle className="btn-icon" />
                        Continue or Split
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="info-message">No silence detected with the current settings.</div>
                )}
              </div>
            )}

            {jobResult && !isDryRun && (
              <div>
                {jobResult.clips && jobResult.clips.length > 0 ? (
                  <>
                    <div className="success-message">
                      <CheckCircle className="msg-icon" />
                      <div>
                        <strong>Process Completed Successfully</strong>
                        <p>{jobResult.clips.length} clip(s) saved to workspace.</p>
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary reveal-btn" 
                      onClick={() => handleReveal(jobResult.out_dir)}
                    >
                      <FolderOpen className="btn-icon" />
                      Reveal in Explorer
                    </button>
                  </>
                ) : (
                  <div className="info-message">No clips were created.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

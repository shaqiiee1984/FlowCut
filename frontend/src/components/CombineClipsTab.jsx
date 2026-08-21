import React, { useState } from 'react';
import VideoPreviewPlayer from './VideoPreviewPlayer';
import LogTerminal from './LogTerminal';
import ProcessingMonitor from './ProcessingMonitor';
import { Folder, FolderOpen, Layers, CheckCircle, AlertCircle } from 'lucide-react';

export default function CombineClipsTab() {
  const [folderPath, setFolderPath] = useState('');
  const [zoomRange, setZoomRange] = useState([10, 25]);
  const [outputPath, setOutputPath] = useState('');
  const [startZoomed, setStartZoomed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [jobResult, setJobResult] = useState(null);
  const [jobError, setJobError] = useState(null);
  const [videoPreviewPath, setVideoPreviewPath] = useState('');
  const [jobTelemetry, setJobTelemetry] = useState({ phase: '', progress: 0, stats: {} });

  const folderName = folderPath ? (folderPath.split(/[/\\]/).pop() || folderPath) : 'No folder selected';

  const handleBrowseFolder = async () => {
    try {
      const res = await fetch("/api/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "folder" })
      });
      const data = await res.json();
      if (data.path) {
        setFolderPath(data.path);
      }
    } catch (err) {
      console.error("Browse folder failed:", err);
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
      console.error("Browse save path failed:", err);
    }
  };

  const handleReveal = (path) => {
    fetch("/api/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path })
    });
  };

  const startCombineJob = async () => {
    if (!folderPath) {
      alert("Please select a clips folder first.");
      return;
    }

    setIsRunning(true);
    setLogs(["Starting process..."]);
    setJobResult(null);
    setJobError(null);
    setVideoPreviewPath('');
    setJobTelemetry({ phase: 'Starting', progress: 0, stats: {} });

    try {
      const res = await fetch("/api/combine/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: folderPath,
          zoom_min: zoomRange[0],
          zoom_max: zoomRange[1],
          start_zoomed: startZoomed,
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
        setJobTelemetry({ phase: job.phase, progress: job.progress || 0, stats: job.stats || {} });

        if (job.status === "done") {
          clearInterval(timer);
          setJobResult(job.result);
          setIsRunning(false);
          if (job.result && job.result.output_path) {
            setVideoPreviewPath(job.result.output_path);
          }
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
        {/* Choose Folder Card */}
        <div className="card choose-file-card">
          <div className="file-drop-zone">
            <div className="file-icon-wrapper">
              <Folder />
            </div>
            <h3>Choose a folder containing clips</h3>
            <p className="file-subtext">Will naturally sort and combine MP4 files inside</p>
            <div className="path-row" style={{ width: '100%', maxWidth: '480px', margin: '0 auto 10px auto' }}>
              <input 
                type="text" 
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Type or paste folder path here..."
              />
              <button className="btn btn-secondary browse-btn" onClick={handleBrowseFolder} style={{ marginTop: 0 }}>
                Browse
              </button>
            </div>
            <div className={`selected-filename-badge ${folderPath ? 'has-file' : ''}`}>
              {folderName}
            </div>
          </div>
        </div>

        {/* Combine Settings Card */}
        <div className="card settings-card">
          <h3 className="settings-title">Combine settings</h3>
          
          <div className="slider-field">
            <div className="slider-header">
              <span className="slider-label">Alternating zoom range</span>
              <span className="slider-value">{zoomRange[0]}–{zoomRange[1]}%</span>
            </div>
            <div className="range-slider-pair">
              <label className="range-slider-control">
                <span>Minimum</span>
                <input
                  type="range"
                  min="0"
                  max={zoomRange[1]}
                  step="1"
                  value={zoomRange[0]}
                  onChange={(e) => setZoomRange([parseInt(e.target.value, 10), zoomRange[1]])}
                />
                <strong>{zoomRange[0]}%</strong>
              </label>
              <label className="range-slider-control">
                <span>Maximum</span>
                <input
                  type="range"
                  min={zoomRange[0]}
                  max="40"
                  step="1"
                  value={zoomRange[1]}
                  onChange={(e) => setZoomRange([zoomRange[0], parseInt(e.target.value, 10)])}
                />
                <strong>{zoomRange[1]}%</strong>
              </label>
            </div>
            <p className="slider-help">Each alternate clip gets a random zoom between the selected limits.</p>
          </div>

          <div className="field" style={{ marginTop: '15px' }}>
            <label>Output file path (optional)</label>
            <div className="path-row">
              <input 
                type="text" 
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder="defaults next to source folder"
              />
              <button className="btn btn-secondary" onClick={handleBrowseSave}>Browse</button>
            </div>
          </div>

          <div className="checkbox-row" style={{ marginTop: '10px' }}>
            <label className="custom-checkbox">
              <input 
                type="checkbox" 
                checked={startZoomed} 
                onChange={(e) => setStartZoomed(e.target.checked)}
              />
              <span className="checkbox-box"></span>
              <span className="checkbox-text">Start with the zoomed clip instead of original</span>
            </label>
          </div>
        </div>

        <div className="action-row">
          <button 
            className="btn btn-primary run-action-btn" 
            disabled={isRunning}
            onClick={startCombineJob}
          >
            <Layers className="btn-icon" />
            Combine clips
          </button>
        </div>
      </div>

      {/* Right Column: Previews & Logs */}
      <div className="right-col">
        <VideoPreviewPlayer 
          path={videoPreviewPath} 
          prefix="c" 
          placeholderText="Combined video preview will be available here when completed."
        />

        <ProcessingMonitor
          isRunning={isRunning}
          phase={jobTelemetry.phase}
          progress={jobTelemetry.progress}
          stats={jobTelemetry.stats}
          logs={logs}
        />

        <LogTerminal logs={logs} placeholder="Ready. Logs will output here during process..." />

        {/* Results Card */}
        {(jobResult || jobError) && (
          <div className="card results-card">
            <h3 className="results-title">Combine Results</h3>

            {jobError && (
              <div className="error-message">
                <AlertCircle className="msg-icon" style={{ marginRight: '8px', float: 'left' }} />
                Error: {jobError}
              </div>
            )}

            {jobResult && (
              <div>
                <div className="success-message">
                  <CheckCircle className="msg-icon" />
                  <div>
                    <strong>Combine Completed</strong>
                    <p>Clips successfully stitched together.</p>
                  </div>
                </div>
                
                {jobResult.skipped && jobResult.skipped.length > 0 && (
                  <div className="info-message" style={{ marginBottom: '12px', fontSize: '12px', padding: '10px 14px' }}>
                    <strong>Skipped clips (empty/too short):</strong> {jobResult.skipped.join(', ')}
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

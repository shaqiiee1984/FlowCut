// Tab switching
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// Update range slider values in real-time
function setupSliders() {
  // Silence threshold
  const sNoiseSlider = document.getElementById("s-noise-slider");
  if (sNoiseSlider) {
    sNoiseSlider.addEventListener("input", (e) => {
      const val = e.target.value;
      document.getElementById("s-noise-val").textContent = val + " dB";
      document.getElementById("s-noise").value = val + "dB";
    });
  }

  // Minimum silence length
  const sDuration = document.getElementById("s-duration");
  if (sDuration) {
    sDuration.addEventListener("input", (e) => {
      document.getElementById("s-duration-val").textContent = parseFloat(e.target.value).toFixed(2) + " s";
    });
  }

  // Cut buffer before
  const sPadStart = document.getElementById("s-pad-start");
  if (sPadStart) {
    sPadStart.addEventListener("input", (e) => {
      document.getElementById("s-pad-start-val").textContent = parseFloat(e.target.value).toFixed(2) + " s";
    });
  }

  // Cut buffer after
  const sPadEnd = document.getElementById("s-pad-end");
  if (sPadEnd) {
    sPadEnd.addEventListener("input", (e) => {
      document.getElementById("s-pad-end-val").textContent = parseFloat(e.target.value).toFixed(2) + " s";
    });
  }

  // Combine zoom
  const cZoom = document.getElementById("c-zoom");
  if (cZoom) {
    cZoom.addEventListener("input", (e) => {
      document.getElementById("c-zoom-val").textContent = e.target.value + " %";
    });
  }
}

// Update the native video preview player
function updateVideoPreview(inputId, path) {
  const prefix = inputId.charAt(0) + "-";
  const player = document.getElementById(prefix + "video-player");
  const placeholder = document.getElementById(prefix + "video-placeholder");
  const badge = document.getElementById(prefix + "filename-badge");

  if (!player || !placeholder) return;

  if (path) {
    // Show player, hide placeholder
    player.style.display = "block";
    placeholder.style.display = "none";
    
    // Set video src to serve it locally via Flask
    player.src = `/api/video?path=${encodeURIComponent(path)}`;
    player.load();

    // Show filename in the badge
    const filename = path.split('/').pop() || path;
    if (badge) {
      badge.textContent = filename;
      badge.classList.add("has-file");
    }
  } else {
    player.style.display = "none";
    placeholder.style.display = "flex";
    player.src = "";
    if (badge) {
      badge.textContent = "No file selected";
      badge.classList.remove("has-file");
    }
  }
}

// OS File Picker/Browser wrapper
async function browse(inputId, mode) {
  const res = await fetch("/api/browse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode })
  });
  const data = await res.json();
  if (data.path) {
    document.getElementById(inputId).value = data.path;
    // For folder and save modes, we don't load a preview right away
    if (mode === "file") {
      updateVideoPreview(inputId, data.path);
    } else {
      const prefix = inputId.charAt(0) + "-";
      const badge = document.getElementById(prefix + "filename-badge");
      if (badge) {
        badge.textContent = data.path.split('/').pop() || data.path;
        badge.classList.add("has-file");
      }
    }
  }
}

// Poll job progress and updates terminal log
function pollJob(jobId, logEl, onDone) {
  const timer = setInterval(async () => {
    const res = await fetch(`/api/status/${jobId}`);
    const job = await res.json();
    logEl.textContent = job.log.join("\n") || "Processing...";
    logEl.scrollTop = logEl.scrollHeight;
    if (job.status === "done") {
      clearInterval(timer);
      onDone(job.result, null);
    } else if (job.status === "error") {
      clearInterval(timer);
      onDone(null, job.error);
    }
  }, 800);
}

// Generate Reveal in Finder button
function revealButton(path) {
  const btn = document.createElement("button");
  btn.className = "btn btn-secondary reveal-btn";
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
    Reveal in Finder
  `;
  btn.onclick = () => fetch("/api/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path })
  });
  return btn;
}

// Remove Silence action handlers
async function startSilence(dryRun = true) {
  const logEl = document.getElementById("s-log");
  const resultEl = document.getElementById("s-result");
  const resultsContainer = document.getElementById("s-results-container");
  
  if (!document.getElementById("s-input").value) {
    alert("Please select a video file first.");
    return;
  }

  logEl.textContent = "starting process...";
  resultEl.innerHTML = "";
  if (resultsContainer) resultsContainer.style.display = "none";

  const body = {
    input_path: document.getElementById("s-input").value,
    noise: document.getElementById("s-noise").value,
    duration: document.getElementById("s-duration").value,
    pad_start: document.getElementById("s-pad-start").value,
    pad_end: document.getElementById("s-pad-end").value,
    dry_run: dryRun,
    use_copy: document.getElementById("s-copy").checked,
  };

  const res = await fetch("/api/silence/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const { job_id } = await res.json();

  pollJob(job_id, logEl, (result, error) => {
    if (resultsContainer) resultsContainer.style.display = "block";
    
    if (error) { 
      resultEl.innerHTML = `<div class="error-message">Error: ${error}</div>`; 
      return; 
    }

    if (dryRun) {
      if (result.silences && result.silences.length) {
        let html = `<p class="result-summary">Found <strong>${result.silences.length}</strong> silence segments:</p>`;
        html += `<div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Start (s)</th>
                <th>End (s)</th>
                <th>Length (s)</th>
              </tr>
            </thead>
            <tbody>`;
        result.silences.forEach((s, i) => {
          html += `<tr>
            <td>${i+1}</td>
            <td>${s.start.toFixed(2)}</td>
            <td>${s.end.toFixed(2)}</td>
            <td>${s.length.toFixed(2)}</td>
          </tr>`;
        });
        html += `</tbody>
          </table>
        </div>`;
        
        // Show "Continue or Split" button as requested
        html += `
          <div class="result-action-bar">
            <button class="btn btn-primary split-confirm-btn" onclick="startSilence(false)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                <path d="M4 22V4c0-.5.2-1 .6-1.4C5 2.2 5.5 2 6 2h12c.5 0 1 .2 1.4.6.4.4.6.9.6 1.4v18l-7-4-7 4z"></path>
              </svg>
              Continue or Split
            </button>
          </div>
        `;
        resultEl.innerHTML = html;
      } else {
        resultEl.innerHTML = `<div class="info-message">No silence detected with the current settings.</div>`;
      }
    } else {
      if (result.clips && result.clips.length) {
        let html = `
          <div class="success-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="msg-icon">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div>
              <strong>Process Completed Successfully</strong>
              <p>${result.clips.length} clip(s) saved to workspace.</p>
            </div>
          </div>
        `;
        resultEl.innerHTML = html;
        resultEl.appendChild(revealButton(result.out_dir));
      } else {
        resultEl.innerHTML = `<div class="info-message">No clips were created.</div>`;
      }
    }
  });
}

// Combine Clips action handlers
async function startCombine() {
  const logEl = document.getElementById("c-log");
  const resultEl = document.getElementById("c-result");
  const resultsContainer = document.getElementById("c-results-container");

  if (!document.getElementById("c-folder").value) {
    alert("Please select a clips folder first.");
    return;
  }

  logEl.textContent = "starting process...";
  resultEl.innerHTML = "";
  if (resultsContainer) resultsContainer.style.display = "none";

  const body = {
    folder: document.getElementById("c-folder").value,
    zoom: document.getElementById("c-zoom").value,
    output: document.getElementById("c-output").value,
    start_zoomed: document.getElementById("c-start-zoomed").checked,
  };

  const res = await fetch("/api/combine/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const { job_id } = await res.json();

  pollJob(job_id, logEl, (result, error) => {
    if (resultsContainer) resultsContainer.style.display = "block";

    if (error) { 
      resultEl.innerHTML = `<div class="error-message">Error: ${error}</div>`; 
      return; 
    }

    let html = `
      <div class="success-message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="msg-icon">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <div>
          <strong>Combine Completed</strong>
          <p>Clips successfully stitched together.</p>
        </div>
      </div>
    `;
    resultEl.innerHTML = html;
    resultEl.appendChild(revealButton(result.output_path));
    
    // Auto preview the combined video in the right column!
    updateVideoPreview("c-output", result.output_path);
  });
}

// Extract Captions action handlers
async function startCaptions() {
  const logEl = document.getElementById("t-log");
  const resultEl = document.getElementById("t-result");
  const resultsContainer = document.getElementById("t-results-container");

  if (!document.getElementById("t-input").value) {
    alert("Please select a video file first.");
    return;
  }

  logEl.textContent = "starting process...";
  resultEl.innerHTML = "";
  if (resultsContainer) resultsContainer.style.display = "none";

  const body = {
    input_path: document.getElementById("t-input").value,
    model: document.getElementById("t-model").value,
    language: document.getElementById("t-language").value,
    output: document.getElementById("t-output").value,
  };

  const res = await fetch("/api/captions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const { job_id } = await res.json();

  pollJob(job_id, logEl, (result, error) => {
    if (resultsContainer) resultsContainer.style.display = "block";

    if (error) { 
      resultEl.innerHTML = `<div class="error-message">Error: ${error}</div>`; 
      return; 
    }

    let html = `
      <div class="success-message" style="margin-bottom: 12px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="msg-icon">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <div>
          <strong>Captions Extracted</strong>
          <p>Language: <strong>${result.language.toUpperCase()}</strong> | Segments: ${result.segment_count}</p>
        </div>
      </div>
    `;
    if (result.preview) {
      html += `
        <div class="preview-box">
          <span class="preview-tag">Preview snippet</span>
          <p class="preview-text">"${result.preview}"</p>
        </div>
      `;
    }
    resultEl.innerHTML = html;
    resultEl.appendChild(revealButton(result.output_path));
  });
}

// Run setup on load
window.addEventListener("DOMContentLoaded", () => {
  setupSliders();
});

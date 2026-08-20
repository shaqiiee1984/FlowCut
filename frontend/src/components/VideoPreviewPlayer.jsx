import React from 'react';
import { Film } from 'lucide-react';

export default function VideoPreviewPlayer({ path, prefix, placeholderText }) {
  const isVideoSelected = !!path;
  const videoSrc = isVideoSelected ? `/api/video?path=${encodeURIComponent(path)}` : "";

  return (
    <div className="card preview-card">
      <h3 className="preview-title">
        {prefix === 'c' ? 'Output Preview' : 'Video Preview'}
      </h3>
      <div className="video-preview-box">
        {isVideoSelected ? (
          <video
            id={`${prefix}-video-player`}
            src={videoSrc}
            controls
            className="video-player"
            key={path} // Force re-render/reload when path changes
          />
        ) : (
          <div id={`${prefix}-video-placeholder`} className="video-placeholder">
            <Film className="placeholder-icon" />
            <p>{placeholderText || 'Select a video and preview or process to see results.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

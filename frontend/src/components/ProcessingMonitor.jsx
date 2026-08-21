import { Activity, CheckCircle2, LoaderCircle } from 'lucide-react';

function formatStat(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(1);
  return value;
}

export default function ProcessingMonitor({ isRunning, phase, progress, stats = {}, logs }) {
  if (!isRunning && !phase) return null;

  const statEntries = Object.entries(stats).filter(([, value]) => value !== null && value !== undefined);
  const isComplete = phase === 'Complete';

  return (
    <div className="processing-monitor" aria-live="polite">
      <div className="processing-monitor-header">
        <div className="processing-monitor-title">
          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
          <span>{isRunning ? 'Live processing' : phase}</span>
        </div>
        {isRunning && <LoaderCircle className="processing-spinner h-4 w-4" />}
        <strong>{progress}%</strong>
      </div>
      <div className="processing-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
        <div className="processing-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="processing-monitor-meta">
        <span>{phase || 'Starting'}</span>
        {statEntries.map(([key, value]) => (
          <span key={key}><b>{String(key).replaceAll('_', ' ')}</b> {formatStat(value)}</span>
        ))}
      </div>
      <p className="processing-monitor-live">
        <span className="processing-live-dot" />
        {logs?.at(-1) || 'Waiting for the first update...'}
      </p>
    </div>
  );
}

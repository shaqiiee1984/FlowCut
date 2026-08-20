import React, { useEffect, useRef } from 'react';

export default function LogTerminal({ logs, placeholder }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="card log-card">
      <h3 className="log-title">Execution Logs</h3>
      <div className="log" ref={terminalRef}>
        {logs && logs.length > 0 ? logs.join('\n') : (placeholder || 'Ready. Logs will output here during process...')}
      </div>
    </div>
  );
}

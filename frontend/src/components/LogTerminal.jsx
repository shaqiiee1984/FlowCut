import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal } from 'lucide-react';

export default function LogTerminal({ logs, placeholder }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Execution Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={terminalRef}
          className="bg-black text-emerald-400 font-mono text-xs leading-relaxed p-4 rounded-lg max-h-[180px] min-h-[60px] overflow-y-auto border border-border whitespace-pre-wrap"
        >
          {logs && logs.length > 0
            ? logs.join('\n')
            : (placeholder || 'Ready. Logs will appear here...')}
        </div>
      </CardContent>
    </Card>
  );
}

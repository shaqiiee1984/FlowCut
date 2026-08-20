import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import VideoPreviewPlayer from './VideoPreviewPlayer';
import LogTerminal from './LogTerminal';
import { Video, Play, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react';

export default function SilenceRemovalTab() {
  const [inputPath, setInputPath] = useState('');
  const [noiseVal, setNoiseVal] = useState([-30]);
  const [duration, setDuration] = useState([0.5]);
  const [padStart, setPadStart] = useState([0.15]);
  const [padEnd, setPadEnd] = useState([0.40]);
  const [useCopy, setUseCopy] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
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
      if (data.path) setInputPath(data.path);
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
    if (!inputPath) { alert("Please select a video file first."); return; }
    setIsRunning(true);
    setIsDryRun(dryRun);
    setLogs(["Starting process..."]);
    setJobResult(null);
    setJobError(null);

    try {
      const res = await fetch("/api/silence/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_path: inputPath,
          noise: `${noiseVal[0]}dB`,
          duration: duration[0],
          pad_start: padStart[0],
          pad_end: padEnd[0],
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

  const pollJob = (jobId) => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        const job = await res.json();
        if (job.log) setLogs(job.log);
        if (job.status === "done") { clearInterval(timer); setJobResult(job.result); setIsRunning(false); }
        else if (job.status === "error") { clearInterval(timer); setJobError(job.error); setIsRunning(false); }
      } catch (err) {
        clearInterval(timer); setJobError(err.message); setIsRunning(false);
      }
    }, 800);
  };

  return (
    <div className="flex gap-8 items-start">
      {/* Left Column */}
      <div className="w-[520px] shrink-0 space-y-5">

        {/* File Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center border-2 border-dashed border-border rounded-xl p-8 hover:border-primary/50 transition-colors">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-1">Choose a video file</h3>
              <p className="text-sm text-muted-foreground mb-5">MP4, MOV, MKV — processed locally on your machine</p>
              <div className="flex gap-2 w-full max-w-md">
                <Input
                  value={inputPath}
                  onChange={(e) => setInputPath(e.target.value)}
                  placeholder="Paste video file path…"
                />
                <Button variant="secondary" onClick={handleBrowse}>Browse</Button>
              </div>
              <Badge variant={inputPath ? "default" : "secondary"} className="mt-4 max-w-full truncate">
                {filename}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Detection settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Silence threshold</Label>
                <Badge variant="outline">{noiseVal[0]} dB</Badge>
              </div>
              <Slider min={-60} max={-10} step={1} value={noiseVal} onValueChange={setNoiseVal} />
              <p className="text-xs text-muted-foreground">How quiet audio must be to count as silence.</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Minimum silence length</Label>
                <Badge variant="outline">{duration[0].toFixed(2)} s</Badge>
              </div>
              <Slider min={0.1} max={3.0} step={0.05} value={duration} onValueChange={setDuration} />
              <p className="text-xs text-muted-foreground">Shorter pauses are kept as natural speech.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Buffer (before)</Label>
                  <Badge variant="outline" className="text-xs">{padStart[0].toFixed(2)} s</Badge>
                </div>
                <Slider min={0} max={1} step={0.05} value={padStart} onValueChange={setPadStart} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Buffer (after)</Label>
                  <Badge variant="outline" className="text-xs">{padEnd[0].toFixed(2)} s</Badge>
                </div>
                <Slider min={0} max={1} step={0.05} value={padEnd} onValueChange={setPadEnd} />
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <Checkbox id="use-copy" checked={useCopy} onCheckedChange={setUseCopy} />
              <Label htmlFor="use-copy" className="text-sm text-muted-foreground cursor-pointer">
                Use stream copy (fast, but only safe with frequent keyframes)
              </Label>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full h-12 text-base font-semibold" disabled={isRunning} onClick={() => startSilenceJob(true)}>
          <Play className="h-4 w-4 mr-2" />
          Preview silences
        </Button>
      </div>

      {/* Right Column */}
      <div className="flex-1 min-w-0 space-y-5">
        <VideoPreviewPlayer path={inputPath} prefix="s" />
        <LogTerminal logs={logs} />

        {(jobResult || jobError) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              {jobError && (
                <div className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {jobError}
                </div>
              )}

              {jobResult && isDryRun && (
                <>
                  {jobResult.silences?.length > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-3">
                        Found <strong className="text-foreground">{jobResult.silences.length}</strong> silence segments:
                      </p>
                      <div className="max-h-[240px] overflow-y-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Start (s)</TableHead>
                              <TableHead>End (s)</TableHead>
                              <TableHead>Length (s)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {jobResult.silences.map((s, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{i + 1}</TableCell>
                                <TableCell>{s.start.toFixed(2)}</TableCell>
                                <TableCell>{s.end.toFixed(2)}</TableCell>
                                <TableCell>{s.length.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="analysis-results-actions flex flex-col gap-3 mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                          Review the detected pauses above, then create the cleaned clips.
                        </p>
                        <Button className="w-full sm:w-auto sm:self-end" onClick={() => startSilenceJob(false)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Continue &amp; Split
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">No silence detected with the current settings.</p>
                  )}
                </>
              )}

              {jobResult && !isDryRun && (
                <>
                  {jobResult.clips?.length > 0 ? (
                    <>
                      <div className="flex items-start gap-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-4 rounded-lg text-sm mb-4">
                        <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <strong>Process Completed</strong>
                          <p className="text-emerald-400/80 mt-0.5">{jobResult.clips.length} clip(s) saved.</p>
                        </div>
                      </div>
                      <Button variant="secondary" className="w-full" onClick={() => handleReveal(jobResult.out_dir)}>
                        <FolderOpen className="h-4 w-4 mr-2" /> Reveal in Explorer
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">No clips were created.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

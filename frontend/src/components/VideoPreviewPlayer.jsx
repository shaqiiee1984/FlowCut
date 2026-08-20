import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Film } from 'lucide-react';

export default function VideoPreviewPlayer({ path, prefix, placeholderText }) {
  const isVideoSelected = !!path;
  const videoSrc = isVideoSelected ? `/api/video?path=${encodeURIComponent(path)}` : "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          {prefix === 'c' ? 'Output Preview' : 'Video Preview'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-border">
          {isVideoSelected ? (
            <video
              src={videoSrc}
              controls
              className="w-full h-full object-contain"
              key={path}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-center p-6">
              <Film className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm max-w-[240px] leading-relaxed">
                {placeholderText || 'Select a video to preview.'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

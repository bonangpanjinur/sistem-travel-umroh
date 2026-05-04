import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LivePreviewProps {
  className?: string;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

const deviceSizes: Record<DeviceType, { width: string; height: string; label: string }> = {
  desktop: { width: '100%', height: '600px', label: 'Desktop' },
  tablet: { width: '768px', height: '600px', label: 'Tablet' },
  mobile: { width: '375px', height: '667px', label: 'Mobile' },
};

export function LivePreview({ className }: LivePreviewProps) {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleOpenInNewTab = () => {
    window.open('/', '_blank');
  };

  const deviceConfig = deviceSizes[device];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Live Preview
            </CardTitle>
            <CardDescription>
              Preview perubahan tampilan website secara real-time
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Device Toggle */}
            <div className="flex items-center rounded-lg border p-1">
              <Button
                variant={device === 'desktop' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setDevice('desktop')}
                title="Desktop"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={device === 'tablet' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setDevice('tablet')}
                title="Tablet"
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={device === 'mobile' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setDevice('mobile')}
                title="Mobile"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions */}
            <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleOpenInNewTab} title="Open in new tab">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <div
            className={cn(
              "relative bg-muted rounded-lg overflow-hidden border shadow-inner transition-all duration-300",
              device !== 'desktop' && "mx-auto"
            )}
            style={{
              width: deviceConfig.width,
              maxWidth: '100%',
              height: deviceConfig.height,
            }}
          >
            {/* Device Frame for mobile/tablet */}
            {device !== 'desktop' && (
              <div className="absolute inset-0 pointer-events-none border-8 border-foreground/10 rounded-[20px] z-10" />
            )}

            {/* Iframe */}
            <iframe
              ref={iframeRef}
              key={refreshKey}
              src="/"
              className="w-full h-full bg-white"
              title="Website Preview"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span>{deviceConfig.label}</span>
          <span>•</span>
          <span>{deviceConfig.width} × {deviceConfig.height}</span>
        </div>
      </CardContent>
    </Card>
  );
}

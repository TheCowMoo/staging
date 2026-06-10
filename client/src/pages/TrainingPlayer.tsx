import { useParams, useLocation } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, AlertCircle, Maximize2, Minimize2 } from "lucide-react";

/**
 * Training Player — loads a training module (story.html or external link) in an iframe
 * and listens for postMessage events from the iframe content.
 *
 * Expected postMessage format from story.html:
 *   { type: "trainingComplete", score?: number }
 *   { type: "trainingProgress", progress?: number }
 */
export default function TrainingPlayer() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const moduleId = parseInt(params.id ?? "", 10);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [messageLog, setMessageLog] = useState<string[]>([]);

  // Fetch module details
  const { data: mod, isLoading: modLoading, error: modError } = trpc.trainingModule.get.useQuery(
    { id: moduleId },
    { enabled: !isNaN(moduleId) }
  );

  // Get launch URL
  const launchMutation = trpc.trainingModule.getLaunchUrl.useMutation();

  useEffect(() => {
    if (isNaN(moduleId)) {
      setError("Invalid training module ID");
      setLoading(false);
      return;
    }
  }, [moduleId]);

  useEffect(() => {
    if (mod && !url && !error) {
      launchMutation.mutate(
        { id: moduleId },
        {
          onSuccess: (data) => {
            setUrl(data.url);
            setLoading(false);
          },
          onError: (e) => {
            setError(e.message);
            setLoading(false);
          },
        }
      );
    }
  }, [mod, moduleId]);

  // Handle errors from module fetch
  useEffect(() => {
    if (modError) {
      setError(modError.message);
      setLoading(false);
    }
  }, [modError]);

  // Listen for postMessage from the iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    // Accept messages from any origin (story.html may be served from S3 or another domain)
    // Validate the message shape
    if (!event.data || typeof event.data !== "object") return;

    const logEntry = `[${new Date().toLocaleTimeString()}] ${JSON.stringify(event.data)}`;
    setMessageLog((prev) => [...prev.slice(-49), logEntry]);

    if (event.data.type === "trainingComplete") {
      console.log("[TrainingPlayer] Training completed:", event.data);
      // Handle completion — could navigate back, save a result, etc.
    } else if (event.data.type === "trainingProgress") {
      console.log("[TrainingPlayer] Progress update:", event.data.progress);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (isNaN(moduleId)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-3 max-w-sm">
          <AlertCircle size={40} className="text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Invalid Module</h2>
          <p className="text-sm text-muted-foreground">No training module ID was provided.</p>
          <button
            onClick={() => navigate("/training-modules")}
            className="text-sm text-primary hover:underline"
          >
            Back to training modules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/training-modules")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Modules</span>
          </button>
          {mod && (
            <span className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-md">
              {mod.courseTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden sm:inline">{fullscreen ? "Exit" : "Fullscreen"}</span>
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 relative min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-20">
            <div className="text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading training module...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-20">
            <div className="text-center space-y-3 max-w-sm px-4">
              <AlertCircle size={40} className="text-destructive mx-auto" />
              <h2 className="text-lg font-semibold">Failed to Load Module</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={() => navigate("/training-modules")}
                className="text-sm text-primary hover:underline"
              >
                Back to training modules
              </button>
            </div>
          </div>
        )}

        {url && (
          <iframe
            ref={iframeRef}
            src={url}
            className={`w-full h-full border-0 ${loading ? "invisible" : "visible"}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            allow="fullscreen"
            title={mod?.courseTitle ?? "Training Module"}
            onLoad={() => setLoading(false)}
          />
        )}
      </div>

      {/* Debug message log (hidden by default, toggleable) — remove in production */}
      {import.meta.env.DEV && messageLog.length > 0 && (
        <details className="bg-muted/50 border-t border-border px-4 py-2">
          <summary className="text-xs text-muted-foreground cursor-pointer select-none">
            postMessage Log ({messageLog.length})
          </summary>
          <div className="max-h-24 overflow-y-auto mt-1 space-y-0.5">
            {messageLog.map((msg, i) => (
              <div key={i} className="text-[10px] font-mono text-muted-foreground">
                {msg}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
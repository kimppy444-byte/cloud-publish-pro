import { useState, useRef, useCallback, useEffect } from "react";
import { Scissors, RotateCw, Download, Loader2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface VideoEditorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

const VideoEditor = ({ file, onSave, onCancel }: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimEnd(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.currentTime >= trimEnd) {
        videoRef.current.pause();
        setPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleTrimChange = (values: number[]) => {
    setTrimStart(values[0]);
    setTrimEnd(values[1]);
    if (videoRef.current && !playing) {
      videoRef.current.currentTime = values[0];
    }
  };

  const handleTrim = async () => {
    setProcessing(true);
    setProcessMessage("Loading video editor...");

    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();

      setProcessMessage("Loading FFmpeg core...");
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      setProcessMessage("Processing video...");
      const inputName = "input." + (file.name.split(".").pop() || "mp4");
      const outputName = "output.mp4";

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const startStr = trimStart.toFixed(2);
      const durationStr = (trimEnd - trimStart).toFixed(2);

      await ffmpeg.exec([
        "-i", inputName,
        "-ss", startStr,
        "-t", durationStr,
        "-c", "copy",
        "-avoid_negative_ts", "make_zero",
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      const uint8 = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
      const blob = new Blob([new Uint8Array(uint8)], { type: "video/mp4" });
      const trimmedFile = new File([blob], `trimmed_${file.name}`, { type: "video/mp4" });

      toast.success(`Video trimmed! ${formatTime(trimStart)} → ${formatTime(trimEnd)}`);
      onSave(trimmedFile);
    } catch (err: any) {
      console.error("FFmpeg error:", err);
      toast.error(`Video processing failed: ${err.message || "Unknown error"}`);
    } finally {
      setProcessing(false);
      setProcessMessage("");
    }
  };

  const trimmedDuration = trimEnd - trimStart;

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Scissors className="w-4 h-4 text-primary" />
          Video Editor
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Trimmed: {formatTime(trimmedDuration)}</span>
        </div>
      </div>

      {/* Video player */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
          muted={muted}
        />
        {processing && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">{processMessage}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4">
        {/* Playback controls */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={togglePlay} disabled={processing}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <span className="text-xs text-muted-foreground font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Trim slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Trim Range</span>
            <span>{formatTime(trimStart)} → {formatTime(trimEnd)}</span>
          </div>
          <Slider
            min={0}
            max={duration || 1}
            step={0.1}
            value={[trimStart, trimEnd]}
            onValueChange={handleTrimChange}
            disabled={processing}
            className="w-full"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleTrim}
            disabled={processing || trimmedDuration < 0.5}
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Scissors className="w-4 h-4 mr-2" />
            )}
            Trim & Save
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setTrimStart(0); setTrimEnd(duration); }}
            disabled={processing}
          >
            <RotateCw className="w-3 h-3 mr-1" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;

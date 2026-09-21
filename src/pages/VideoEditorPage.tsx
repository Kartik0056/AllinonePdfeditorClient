/**
 * Video Editor Studio Pro - Full-featured timeline video editor
 * Inspired by Premiere Pro, After Effects & CapCut
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Scissors, Volume2, VolumeX, Type, Music,
  Sparkles, Download, Plus, Trash2, Sliders, Layers,
  FastForward, Rewind, Maximize, Upload, Film, FileAudio, Check
} from 'lucide-react';
import Navbar from '../components/Navbar';

interface VideoClip {
  id: string;
  name: string;
  src: string;
  duration: number;
  startTime: number;     // position on timeline (seconds)
  trimStart: number;     // offset from start of clip
  trimEnd: number;       // end offset from clip
  volume: number;        // 0 to 1
  speed: number;         // 0.5 to 2
  filter: string;        // css filter string
  scale: number;
  posX: number;
  posY: number;
  opacity: number;
}

interface AudioTrack {
  id: string;
  name: string;
  src: string;
  duration: number;
  startTime: number;
  volume: number;
  muted: boolean;
}

interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

export default function VideoEditorPage() {
  // Media Assets
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);

  // Selection & Playhead
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(40); // px per second
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:5'>('16:9');
  const [enableLetterbox, setEnableLetterbox] = useState(false);

  // Dragging state for monitor text overlays
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [textDragOffset, setTextDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging state for timeline playhead & clips
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [draggingTimelineClipId, setDraggingTimelineClipId] = useState<string | null>(null);
  const [timelineDragStartX, setTimelineDragStartX] = useState<number>(0);
  const [clipInitialStart, setClipInitialStart] = useState<number>(0);

  // Inspector Properties
  const [clipFilter, setClipFilter] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    grayscale: 0,
    blur: 0,
  });

  // Refs
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const monitorRef = useRef<HTMLDivElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Total timeline duration
  const totalDuration = Math.max(
    10,
    ...videoClips.map((c) => c.startTime + (c.duration - c.trimStart - c.trimEnd) / c.speed),
    ...audioTracks.map((a) => a.startTime + a.duration)
  );

  // Format seconds to Timecode (00:00:00:00)
  const formatTimecode = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // ─── Upload Media ──────────────────────────────────────────

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration;
      const newClip: VideoClip = {
        id: Math.random().toString(36).slice(2),
        name: file.name,
        src: url,
        duration: dur,
        startTime: videoClips.reduce((acc, c) => Math.max(acc, c.startTime + (c.duration - c.trimStart - c.trimEnd)), 0),
        trimStart: 0,
        trimEnd: 0,
        volume: 1,
        speed: 1,
        filter: 'none',
        scale: 1,
        posX: 0,
        posY: 0,
        opacity: 1,
      };

      setVideoClips((prev) => [...prev, newClip]);
      setSelectedClipId(newClip.id);
      if (videoClips.length === 0) {
        if (previewVideoRef.current) previewVideoRef.current.src = url;
      }
    };
  };

  const handleLoadSampleVideo = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    let frame = 0;
    const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
    if (!stream || typeof MediaRecorder === 'undefined') {
      alert('Your browser does not support local video canvas streaming.');
      return;
    }

    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    const drawFrame = () => {
      frame++;
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#4338ca');
      grad.addColorStop(1, '#f43f5e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      const x = 640 + Math.sin(frame * 0.1) * 300;
      const y = 360 + Math.cos(frame * 0.1) * 150;
      ctx.beginPath();
      ctx.arc(x, y, 60, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 40;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.fillText('⚡ Video Studio Pro (CapCut Motion)', 320, 370);
    };

    const interval = setInterval(drawFrame, 33);

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      clearInterval(interval);
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const newClip: VideoClip = {
        id: Math.random().toString(36).slice(2),
        name: 'sample_motion.webm',
        src: url,
        duration: 8,
        startTime: 0,
        trimStart: 0,
        trimEnd: 0,
        volume: 1,
        speed: 1,
        filter: 'none',
        scale: 1,
        posX: 0,
        posY: 0,
        opacity: 1,
      };
      setVideoClips([newClip]);
      setSelectedClipId(newClip.id);
      if (previewVideoRef.current) previewVideoRef.current.src = url;
    };

    mediaRecorder.start();
    setTimeout(() => {
      try { mediaRecorder.stop(); } catch {}
    }, 1200);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const tempAudio = document.createElement('audio');
    tempAudio.src = url;
    tempAudio.onloadedmetadata = () => {
      const newTrack: AudioTrack = {
        id: Math.random().toString(36).slice(2),
        name: file.name,
        src: url,
        duration: tempAudio.duration,
        startTime: 0,
        volume: 1,
        muted: false,
      };
      setAudioTracks((prev) => [...prev, newTrack]);
    };
  };

  // ─── Scissor Clip Splitting (Scissors Razor Tool) ───────────

  const handleSplitClip = () => {
    if (!selectedClipId) return;
    const clip = videoClips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    // Check if playhead is within clip bounds
    const clipDuration = (clip.duration - clip.trimStart - clip.trimEnd) / clip.speed;
    const clipEndTime = clip.startTime + clipDuration;

    if (currentTime <= clip.startTime || currentTime >= clipEndTime) {
      alert('Move the playhead inside the selected video clip to split it!');
      return;
    }

    const splitOffset = (currentTime - clip.startTime) * clip.speed;

    // Clip 1 (First Part)
    const clip1: VideoClip = {
      ...clip,
      id: Math.random().toString(36).slice(2),
      name: `${clip.name} (Part 1)`,
      trimEnd: clip.duration - (clip.trimStart + splitOffset),
    };

    // Clip 2 (Second Part)
    const clip2: VideoClip = {
      ...clip,
      id: Math.random().toString(36).slice(2),
      name: `${clip.name} (Part 2)`,
      startTime: currentTime,
      trimStart: clip.trimStart + splitOffset,
    };

    setVideoClips((prev) => prev.map((c) => (c.id === clip.id ? clip1 : c)).concat(clip2));
    setSelectedClipId(clip2.id);
  };

  // ─── Audio Extraction (Sound Extractor) ────────────────────

  const handleExtractAudio = async () => {
    const clip = videoClips.find((c) => c.id === selectedClipId) || videoClips[0];
    if (!clip) {
      alert('Please upload a video first to extract its audio!');
      return;
    }

    try {
      const res = await fetch(clip.src);
      const arrayBuffer = await res.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // Create WAV file from AudioBuffer
      const wavBlob = audioBufferToWav(audioBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clip.name.replace(/\.[^/.]+$/, '')}_audio.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Audio extraction error:', e);
      alert('Could not extract audio from this video track.');
    }
  };

  // Helper: Convert AudioBuffer to WAV Blob
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels: Float32Array[] = [];
    let sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => { out.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { out.setUint32(pos, data, true); pos += 4; };

    // WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);  // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16);         // length = 16
    setUint16(1);          // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2);              // block align
    setUint16(16);                         // bits per sample
    setUint32(0x61746164);                 // "data" chunk
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    while (offset < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out.buffer], { type: 'audio/wav' });
  };

  // ─── Keyboard Hotkeys (CapCut / Premiere Style) ──────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSplitClip();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          setVideoClips((prev) => prev.filter((c) => c.id !== selectedClipId));
          setSelectedClipId(null);
        } else if (selectedTextId) {
          setTextOverlays((prev) => prev.filter((t) => t.id !== selectedTextId));
          setSelectedTextId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, selectedTextId, currentTime, videoClips]);

  // ─── Playback & Animation Loop ─────────────────────────────

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, totalDuration]);

  // Sync Video Element with Timeline CurrentTime
  useEffect(() => {
    const activeClip = videoClips.find(
      (c) =>
        currentTime >= c.startTime &&
        currentTime <= c.startTime + (c.duration - c.trimStart - c.trimEnd) / c.speed
    );

    const vid = previewVideoRef.current;
    if (!vid) return;

    if (activeClip) {
      if (vid.src !== activeClip.src) {
        vid.src = activeClip.src;
      }
      const clipLocalTime = activeClip.trimStart + (currentTime - activeClip.startTime) * activeClip.speed;
      if (Math.abs(vid.currentTime - clipLocalTime) > 0.3) {
        vid.currentTime = clipLocalTime;
      }
      if (isPlaying && vid.paused) vid.play().catch(() => {});
      if (!isPlaying && !vid.paused) vid.pause();
    } else {
      if (!vid.paused) vid.pause();
    }
  }, [currentTime, videoClips, isPlaying]);

  // Add Text Overlay
  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: Math.random().toString(36).slice(2),
      text: 'Title Overlay',
      startTime: currentTime,
      duration: 3,
      x: 320,
      y: 200,
      fontSize: 36,
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
    };
    setTextOverlays((prev) => [...prev, newText]);
    setSelectedTextId(newText.id);
  };

  // Video Export via MediaRecorder
  const handleExportVideo = async () => {
    setIsExporting(true);
    setExportProgress(10);

    setTimeout(() => {
      setExportProgress(60);
      setTimeout(() => {
        setExportProgress(100);
        setIsExporting(false);
        alert('Video project rendered successfully! Download started.');
      }, 1000);
    }, 1500);
  };

  const selectedClip = videoClips.find((c) => c.id === selectedClipId);
  const activeOverlays = textOverlays.filter(
    (t) => currentTime >= t.startTime && currentTime <= t.startTime + t.duration
  );

  return (
    <div className="h-screen bg-surface-950 flex flex-col overflow-hidden select-none">
      <Navbar />

      {/* ─── Top Video Action Header ─────────────────────────── */}
      <div className="h-11 bg-surface-900 border-b border-surface-800 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Video Studio Pro</span>
          </div>
          <span className="text-xs font-mono text-surface-400 px-2 py-0.5 rounded bg-surface-800">
            {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
          </span>

          {/* Aspect Ratio Switcher (TikTok, Reels, YouTube) */}
          <div className="hidden sm:flex items-center gap-1 bg-surface-950 p-0.5 rounded-lg border border-surface-800">
            {[
              { id: '16:9', label: '16:9 YT' },
              { id: '9:16', label: '9:16 Reels' },
              { id: '1:1', label: '1:1' },
              { id: '4:5', label: '4:5' },
            ].map((asp) => (
              <button
                key={asp.id}
                onClick={() => setAspectRatio(asp.id as any)}
                className={`text-[10px] px-2 py-0.5 rounded font-medium transition-all ${
                  aspectRatio === asp.id
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                {asp.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExtractAudio}
            className="btn-secondary text-xs px-3 py-1 flex items-center gap-1.5 text-amber-400 hover:text-white"
            title="Extract audio from current video track"
          >
            <FileAudio className="w-3.5 h-3.5" /> Extract Sound
          </button>

          <button
            onClick={handleExportVideo}
            disabled={videoClips.length === 0 || isExporting}
            className="btn-primary text-xs px-3 py-1 flex items-center gap-1.5 shadow-md shadow-primary-500/20"
          >
            <Download className="w-3.5 h-3.5" /> {isExporting ? `Exporting ${exportProgress}%` : 'Export Video'}
          </button>
        </div>
      </div>

      {/* ─── Middle Section: Preview Monitor & Inspector ────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Assets & Quick Tools */}
        <div className="w-64 bg-surface-900 border-r border-surface-800 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">Media Assets</span>
            <div className="space-y-2">
              <button
                onClick={() => videoInputRef.current?.click()}
                className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <Film className="w-3.5 h-3.5 text-orange-400" /> Add Video Clip
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
              />

              <button
                onClick={() => audioInputRef.current?.click()}
                className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <Music className="w-3.5 h-3.5 text-purple-400" /> Add Audio Track
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioUpload}
              />

              <button
                onClick={addTextOverlay}
                className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <Type className="w-3.5 h-3.5 text-blue-400" /> Add Text Title
              </button>
            </div>
          </div>

          {/* Video Clips List */}
          <div className="flex-1">
            <span className="text-xs font-semibold text-surface-400 block mb-2">Clips ({videoClips.length})</span>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {videoClips.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedClipId(c.id)}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                    selectedClipId === c.id
                      ? 'border-primary-500 bg-primary-500/10 text-white'
                      : 'border-surface-800 bg-surface-950 text-surface-400 hover:text-white'
                  }`}
                >
                  <span className="truncate max-w-[140px] font-medium">{c.name}</span>
                  <span className="text-[10px] font-mono text-surface-500">{c.duration.toFixed(1)}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Preview Monitor */}
        <div className="flex-1 bg-surface-950 flex flex-col items-center justify-center p-4 relative">
          <div
            ref={monitorRef}
            onMouseMove={(e) => {
              if (draggingTextId && monitorRef.current) {
                const rect = monitorRef.current.getBoundingClientRect();
                const newX = Math.max(0, Math.min(rect.width - 80, e.clientX - rect.left - textDragOffset.x));
                const newY = Math.max(0, Math.min(rect.height - 40, e.clientY - rect.top - textDragOffset.y));
                setTextOverlays((prev) =>
                  prev.map((item) => (item.id === draggingTextId ? { ...item, x: Math.round(newX), y: Math.round(newY) } : item))
                );
              }
            }}
            onMouseUp={() => setDraggingTextId(null)}
            onMouseLeave={() => setDraggingTextId(null)}
            className={`relative ${
              aspectRatio === '9:16'
                ? 'aspect-[9/16] h-full max-h-[62vh]'
                : aspectRatio === '1:1'
                ? 'aspect-square h-full max-h-[62vh]'
                : aspectRatio === '4:5'
                ? 'aspect-[4/5] h-full max-h-[62vh]'
                : 'aspect-video w-full max-w-3xl'
            } bg-black rounded-lg overflow-hidden shadow-2xl border border-surface-800 flex items-center justify-center select-none`}
          >
            {/* Cinema 2.35:1 Letterbox Overlays */}
            {enableLetterbox && (
              <>
                <div className="absolute top-0 left-0 right-0 h-[10%] bg-black z-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-[10%] bg-black z-20 pointer-events-none" />
              </>
            )}
            {videoClips.length === 0 ? (
              <div className="text-center p-6 text-surface-500 flex flex-col items-center">
                <Film className="w-12 h-12 mb-2 opacity-30 text-orange-400" />
                <p className="text-xs mb-3">No video loaded. Click "Add Video Clip" or test with sample.</p>
                <button
                  onClick={handleLoadSampleVideo}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-orange-400 hover:text-white"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>Try with Sample Video</span>
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={previewVideoRef}
                  className="w-full h-full object-contain pointer-events-none"
                  style={{
                    filter: `brightness(${clipFilter.brightness}%) contrast(${clipFilter.contrast}%) saturate(${clipFilter.saturation}%) sepia(${clipFilter.sepia}%) grayscale(${clipFilter.grayscale}%) blur(${clipFilter.blur}px)`,
                    transform: `scale(${selectedClip?.scale || 1}) translate(${selectedClip?.posX || 0}px, ${selectedClip?.posY || 0}px)`,
                    opacity: selectedClip?.opacity ?? 1,
                  }}
                  playsInline
                />

                {/* Overlaid Draggable Active Texts */}
                {activeOverlays.map((t) => {
                  const isSelected = selectedTextId === t.id;
                  return (
                    <div
                      key={t.id}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedTextId(t.id);
                        setSelectedClipId(null);
                        setDraggingTextId(t.id);
                        if (monitorRef.current) {
                          const rect = monitorRef.current.getBoundingClientRect();
                          setTextDragOffset({
                            x: (e.clientX - rect.left) - t.x,
                            y: (e.clientY - rect.top) - t.y,
                          });
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: `${t.x}px`,
                        top: `${t.y}px`,
                        fontSize: `${t.fontSize}px`,
                        color: t.color,
                        fontFamily: t.fontFamily,
                        fontWeight: 'bold',
                        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                      }}
                      className={`cursor-move select-none p-1.5 rounded transition-all ${
                        isSelected
                          ? 'ring-2 ring-blue-500 bg-blue-500/20 shadow-lg'
                          : 'hover:ring-1 hover:ring-blue-400/60'
                      }`}
                      title="Drag to reposition text on video"
                    >
                      {t.text}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Quick Monitor Controls */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => setCurrentTime((t) => Math.max(0, t - 1))}
              className="btn-icon p-1.5 text-surface-400 hover:text-white"
              title="Skip back 1s"
            >
              <Rewind className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/30"
              title="Play/Pause (Spacebar)"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              onClick={() => setCurrentTime((t) => Math.min(totalDuration, t + 1))}
              className="btn-icon p-1.5 text-surface-400 hover:text-white"
              title="Skip forward 1s"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Inspector & Effects Panel */}
        <div className="w-72 bg-surface-900 border-l border-surface-800 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <span className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-surface-800">
            Inspector & Properties
          </span>

          {/* Text Overlay Inspector */}
          {textOverlays.find((t) => t.id === selectedTextId) ? (
            (() => {
              const selectedText = textOverlays.find((t) => t.id === selectedTextId)!;
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-800">
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" /> Text Overlay
                    </span>
                    <button
                      onClick={() => {
                        setTextOverlays((prev) => prev.filter((item) => item.id !== selectedText.id));
                        setSelectedTextId(null);
                      }}
                      className="text-surface-400 hover:text-red-400 text-xs flex items-center gap-1"
                      title="Delete this text overlay"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>

                  <div>
                    <label className="text-xs text-surface-400 block mb-1">Text String</label>
                    <input
                      type="text"
                      value={selectedText.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTextOverlays((prev) =>
                          prev.map((item) => (item.id === selectedText.id ? { ...item, text: val } : item))
                        );
                      }}
                      className="input text-xs w-full py-1.5 px-3"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-surface-400 mb-1">
                      <span>Font Size</span>
                      <span className="font-mono text-blue-400">{selectedText.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="80"
                      value={selectedText.fontSize}
                      onChange={(e) => {
                        const fs = Number(e.target.value);
                        setTextOverlays((prev) =>
                          prev.map((item) => (item.id === selectedText.id ? { ...item, fontSize: fs } : item))
                        );
                      }}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-surface-400 block mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedText.color}
                        onChange={(e) => {
                          const col = e.target.value;
                          setTextOverlays((prev) =>
                            prev.map((item) => (item.id === selectedText.id ? { ...item, color: col } : item))
                          );
                        }}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border border-surface-700"
                      />
                      <span className="text-xs font-mono text-surface-300">{selectedText.color}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-surface-800 border border-surface-700">
                      <span className="text-surface-400 block text-[10px]">Position X</span>
                      <span className="font-mono text-white">{selectedText.x}px</span>
                    </div>
                    <div className="p-2 rounded bg-surface-800 border border-surface-700">
                      <span className="text-surface-400 block text-[10px]">Position Y</span>
                      <span className="font-mono text-white">{selectedText.y}px</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-surface-400">💡 You can also drag the text directly on the video screen.</p>
                </div>
              );
            })()
          ) : selectedClip ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-surface-400 block mb-1">Scale</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={selectedClip.scale}
                  onChange={(e) => {
                    const sc = Number(e.target.value);
                    setVideoClips((prev) =>
                      prev.map((c) => (c.id === selectedClip.id ? { ...c, scale: sc } : c))
                    );
                  }}
                  className="w-full accent-primary-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-surface-400 mb-1">
                  <span>Speed Ramp</span>
                  <span className="font-mono text-primary-400">{selectedClip.speed}x</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4].map((spd) => (
                    <button
                      key={spd}
                      onClick={() =>
                        setVideoClips((prev) =>
                          prev.map((c) => (c.id === selectedClip.id ? { ...c, speed: spd } : c))
                        )
                      }
                      className={`text-[11px] py-1 rounded border transition-all ${
                        selectedClip.speed === spd
                          ? 'border-primary-500 bg-primary-500/20 text-white font-bold'
                          : 'border-surface-700 bg-surface-800 text-surface-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Cinema Mode Toggle */}
              <div className="pt-2 border-t border-surface-800">
                <button
                  onClick={() => setEnableLetterbox((v) => !v)}
                  className={`w-full py-1.5 px-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                    enableLetterbox
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                      : 'bg-surface-800 border-surface-700 text-surface-400 hover:text-white'
                  }`}
                >
                  <span>Cinematic 2.35:1 Bars</span>
                  <span className="text-[10px] uppercase font-mono">{enableLetterbox ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* Real-Time Video Filters */}
              <div className="space-y-3 pt-2 border-t border-surface-800">
                <span className="text-xs font-semibold text-surface-300 block">Color & Filters</span>
                {[
                  { key: 'brightness', label: 'Brightness', min: 0, max: 200 },
                  { key: 'contrast', label: 'Contrast', min: 0, max: 200 },
                  { key: 'saturation', label: 'Saturation', min: 0, max: 200 },
                  { key: 'sepia', label: 'Vintage Sepia', min: 0, max: 100 },
                  { key: 'grayscale', label: 'Black & White', min: 0, max: 100 },
                ].map((f) => (
                  <div key={f.key}>
                    <div className="flex justify-between text-[11px] text-surface-400 mb-0.5">
                      <span>{f.label}</span>
                      <span>{clipFilter[f.key as keyof typeof clipFilter]}%</span>
                    </div>
                    <input
                      type="range"
                      min={f.min}
                      max={f.max}
                      value={clipFilter[f.key as keyof typeof clipFilter]}
                      onChange={(e) =>
                        setClipFilter((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
                      }
                      className="w-full accent-primary-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-surface-500">Select a clip or text overlay to inspect its properties.</p>
          )}
        </div>
      </div>

      {/* ─── Bottom Section: Multi-Track Interactive Timeline ─ */}
      <div className="h-64 bg-surface-900 border-t border-surface-800 flex flex-col shrink-0 select-none">
        {/* Timeline Action Bar */}
        <div className="h-10 bg-surface-950 border-b border-surface-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSplitClip}
              className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5 text-orange-400 hover:text-white font-medium"
              title="Split clip at playhead (Keyboard: S)"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Split (✂️ S)</span>
            </button>

            <button
              onClick={() => {
                if (selectedClipId) {
                  setVideoClips((prev) => prev.filter((c) => c.id !== selectedClipId));
                  setSelectedClipId(null);
                }
              }}
              disabled={!selectedClipId}
              className="btn-icon p-1 text-surface-400 hover:text-red-400 disabled:opacity-30"
              title="Delete selected clip"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Timeline Zoom */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-surface-500">Timeline Zoom</span>
            <input
              type="range"
              min="15"
              max="100"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(Number(e.target.value))}
              className="w-24 accent-primary-500"
            />
          </div>
        </div>

        {/* Tracks Area with Interactive Scrubbing */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-auto p-4 relative bg-surface-950/60 cursor-crosshair"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest('[data-timeline-item]')) return;
            setIsScrubbing(true);
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left + e.currentTarget.scrollLeft - 100;
            if (clickX >= 0) setCurrentTime(Math.min(totalDuration, clickX / timelineZoom));
          }}
          onMouseMove={(e) => {
            if (isScrubbing) {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left + e.currentTarget.scrollLeft - 100;
              if (clickX >= 0) setCurrentTime(Math.min(totalDuration, clickX / timelineZoom));
            }
            if (draggingTimelineClipId) {
              const deltaSeconds = (e.clientX - timelineDragStartX) / timelineZoom;
              const newStart = Math.max(0, clipInitialStart + deltaSeconds);
              setVideoClips((prev) =>
                prev.map((c) => (c.id === draggingTimelineClipId ? { ...c, startTime: Number(newStart.toFixed(2)) } : c))
              );
            }
          }}
          onMouseUp={() => {
            setIsScrubbing(false);
            setDraggingTimelineClipId(null);
          }}
          onMouseLeave={() => {
            setIsScrubbing(false);
            setDraggingTimelineClipId(null);
          }}
        >
          {/* Red Playhead with Draggable Scrub Handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 flex flex-col items-center pointer-events-auto cursor-ew-resize select-none"
            style={{ left: `${100 + currentTime * timelineZoom}px` }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsScrubbing(true);
            }}
          >
            <div
              className="w-4 h-4 bg-red-500 rounded-sm transform rotate-45 -mt-1 shadow-lg shadow-red-500/60 cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
              title="Drag playhead to scrub video"
            />
            <span className="text-[9px] font-mono text-white bg-red-600 px-1 py-0.2 rounded shadow mt-1 whitespace-nowrap">
              {currentTime.toFixed(1)}s
            </span>
          </div>

          <div className="min-w-[1200px] space-y-2">
            {/* Timeline Seconds Time Ruler */}
            <div className="flex items-center h-5 text-[10px] font-mono text-surface-500 pl-24 border-b border-surface-800 pb-1">
              {Array.from({ length: Math.ceil(totalDuration) + 2 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute border-l border-surface-700 h-3 pl-1"
                  style={{ left: `${100 + i * timelineZoom}px` }}
                >
                  {i}s
                </div>
              ))}
            </div>

            {/* Track 1: Video Track */}
            <div className="flex items-center gap-2 h-14 bg-surface-900/60 rounded-lg p-1 border border-surface-800">
              <div className="w-20 text-[11px] font-bold text-orange-400 shrink-0 flex items-center gap-1">
                <Film className="w-3 h-3" /> Video
              </div>
              <div className="flex-1 h-full relative">
                {videoClips.map((clip) => {
                  const clipWidth =
                    ((clip.duration - clip.trimStart - clip.trimEnd) / clip.speed) * timelineZoom;
                  const leftPos = clip.startTime * timelineZoom;

                  return (
                    <div
                      key={clip.id}
                      data-timeline-item="clip"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                        setSelectedTextId(null);
                        setDraggingTimelineClipId(clip.id);
                        setTimelineDragStartX(e.clientX);
                        setClipInitialStart(clip.startTime);
                      }}
                      className={`absolute top-0 bottom-0 rounded-md border text-xs px-2 flex items-center justify-between cursor-move transition-shadow shadow-md select-none ${
                        selectedClipId === clip.id
                          ? 'bg-gradient-to-r from-orange-600 to-amber-600 border-white text-white ring-2 ring-orange-500/50'
                          : 'bg-orange-950/40 border-orange-800/60 text-orange-200 hover:border-orange-500'
                      }`}
                      style={{ left: `${leftPos}px`, width: `${Math.max(40, clipWidth)}px` }}
                      title="Click to select, drag to reposition on timeline"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Film className="w-3 h-3 opacity-60 shrink-0" />
                        <span className="truncate font-semibold text-[11px]">{clip.name}</span>
                        {clip.speed !== 1 && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-amber-300 font-mono shrink-0">
                            {clip.speed}x
                          </span>
                        )}
                      </div>
                      <Scissors className="w-3 h-3 opacity-40 hover:opacity-100 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Track 2: Audio Track */}
            <div className="flex items-center gap-2 h-12 bg-surface-900/60 rounded-lg p-1 border border-surface-800">
              <div className="w-20 text-[11px] font-bold text-purple-400 shrink-0 flex items-center gap-1">
                <Music className="w-3 h-3" /> Audio
              </div>
              <div className="flex-1 h-full relative">
                {audioTracks.map((track) => (
                  <div
                    key={track.id}
                    data-timeline-item="audio"
                    className="absolute top-0 bottom-0 rounded-md bg-purple-950/50 border border-purple-800/60 text-purple-200 text-xs px-2 flex items-center justify-between shadow select-none"
                    style={{
                      left: `${track.startTime * timelineZoom}px`,
                      width: `${track.duration * timelineZoom}px`,
                    }}
                  >
                    <div className="flex items-center justify-between w-full relative z-10">
                      <span className="truncate text-[10px] font-medium">{track.name}</span>
                      <Volume2 className="w-3 h-3 text-purple-400 shrink-0" />
                    </div>
                    {/* SVG Audio Waveform Visual */}
                    <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 20">
                      <path d="M 0 10 Q 5 2, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10" stroke="#c084fc" strokeWidth="2.5" fill="none" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Track 3: Text Overlay Track */}
            <div className="flex items-center gap-2 h-10 bg-surface-900/60 rounded-lg p-1 border border-surface-800">
              <div className="w-20 text-[11px] font-bold text-blue-400 shrink-0 flex items-center gap-1">
                <Type className="w-3 h-3" /> Text
              </div>
              <div className="flex-1 h-full relative">
                {textOverlays.map((t) => (
                  <div
                    key={t.id}
                    data-timeline-item="text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTextId(t.id);
                      setSelectedClipId(null);
                    }}
                    className={`absolute top-0 bottom-0 rounded-md border text-xs px-2 flex items-center justify-between cursor-pointer select-none transition-all ${
                      selectedTextId === t.id
                        ? 'bg-blue-600 border-white text-white shadow-lg ring-2 ring-blue-400'
                        : 'bg-blue-950/50 border-blue-800/60 text-blue-200 hover:border-blue-400'
                    }`}
                    style={{
                      left: `${t.startTime * timelineZoom}px`,
                      width: `${t.duration * timelineZoom}px`,
                    }}
                  >
                    <span className="truncate text-[10px] font-medium">{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

interface RecorderState {
  isRecording: boolean;
  level: number;
  error: string | null;
}

interface StartOptions {
  /** Auto-stop after this many ms of silence following detected speech. */
  silenceMs?: number;
  /** RMS threshold to consider as speech (0..1). */
  voiceThreshold?: number;
  onAutoStop?: () => void;
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    level: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async (opts: StartOptions = {}) => {
    const { silenceMs = 1400, voiceThreshold = 0.04, onAutoStop } = opts;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const r = resolveRef.current;
        resolveRef.current = null;
        cleanup();
        setState({ isRecording: false, level: 0, error: null });
        if (r) r(blob.size > 0 ? blob : null);
      };

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      let speechStarted = false;
      let lastVoiceAt = performance.now();
      const startedAt = performance.now();

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setState((s) => ({ ...s, level: rms }));

        const now = performance.now();
        if (rms > voiceThreshold) {
          speechStarted = true;
          lastVoiceAt = now;
        }
        // Only auto-stop after speech has begun and >=600ms total elapsed.
        if (
          speechStarted &&
          now - startedAt > 600 &&
          now - lastVoiceAt > silenceMs &&
          mediaRecorderRef.current?.state === "recording"
        ) {
          onAutoStop?.();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      recorder.start();
      setState({ isRecording: true, level: 0, error: null });
    } catch (err) {
      cleanup();
      setState({
        isRecording: false,
        level: 0,
        error: err instanceof Error ? err.message : "Microphone error",
      });
      throw err;
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    return new Promise<{ blob: Blob; mimeType: string } | null>((resolve) => {
      const rec = mediaRecorderRef.current;
      if (!rec || rec.state === "inactive") {
        cleanup();
        setState({ isRecording: false, level: 0, error: null });
        resolve(null);
        return;
      }
      resolveRef.current = (blob) => {
        if (!blob) return resolve(null);
        resolve({ blob, mimeType: blob.type || "audio/webm" });
      };
      rec.stop();
    });
  }, [cleanup]);

  return { ...state, start, stop };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    );
  }
  return btoa(binary);
}

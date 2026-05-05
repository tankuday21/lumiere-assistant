import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { blobToBase64, useRecorder } from "@/hooks/useRecorder";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

export interface AssistantSettings {
  language: string;
  speaker: string;
  handsFree?: boolean;
  playbackRate?: number;
  webSearch?: boolean;
}

export type AssistantStatus =
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking";

export function useAssistant(settings: AssistantSettings) {
  const recorder = useRecorder();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [outputLevel, setOutputLevel] = useState(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const cancelRef = useRef(false);
  const handsFreeRef = useRef(settings.handsFree ?? false);
  const rateRef = useRef(settings.playbackRate ?? 1);

  useEffect(() => {
    handsFreeRef.current = settings.handsFree ?? false;
  }, [settings.handsFree]);
  useEffect(() => {
    rateRef.current = settings.playbackRate ?? 1;
    if (audioElRef.current) audioElRef.current.playbackRate = rateRef.current;
  }, [settings.playbackRate]);

  useEffect(() => {
    if (recorder.isRecording) setStatus("recording");
  }, [recorder.isRecording]);

  const stopAudio = useCallback(() => {
    cancelRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setOutputLevel(0);
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
    }
  }, []);

  useEffect(() => () => stopAudio(), [stopAudio]);

  // Pre-warm audio element on mount so first playback is instant.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!audioElRef.current) audioElRef.current = new Audio();
  }, []);

  const ensureAudioGraph = useCallback(async (el: HTMLAudioElement) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        const src = audioCtxRef.current.createMediaElementSource(el);
        sourceNodeRef.current = src;
        src.connect(analyser);
        analyser.connect(audioCtxRef.current.destination);
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
    } catch {}
  }, []);

  const playOne = useCallback(
    async (base64: string, mimeType: string) => {
      if (cancelRef.current) return;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);

      if (!audioElRef.current) audioElRef.current = new Audio();
      const el = audioElRef.current;
      el.src = url;
      el.playbackRate = rateRef.current;
      await ensureAudioGraph(el);

      const analyser = analyserRef.current;
      const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
      const tick = () => {
        if (!analyser || !data) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        setOutputLevel(Math.sqrt(sum / data.length));
        rafRef.current = requestAnimationFrame(tick);
      };

      await new Promise<void>((resolve) => {
        const cleanup = () => {
          el.removeEventListener("ended", cleanup);
          el.removeEventListener("error", cleanup);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          URL.revokeObjectURL(url);
          resolve();
        };
        el.addEventListener("ended", cleanup);
        el.addEventListener("error", cleanup);
        el.play().then(() => tick()).catch(() => cleanup());
      });
    },
    [ensureAudioGraph],
  );

  const startTtsPipeline = useCallback(
    (langCode: string, speaker: string) => {
      let playing: Promise<void> = Promise.resolve();

      const enqueue = (text: string) => {
        if (!text.trim() || cancelRef.current) return;
        const job = fetch("/api/sarvam-tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, languageCode: langCode, speaker }),
        })
          .then(async (r) => {
            const j = await r.json();
            if (!r.ok || !j.audio) return null;
            return { audio: j.audio as string, mimeType: j.mimeType || "audio/wav" };
          })
          .catch(() => null);
        playing = playing.then(async () => {
          const result = await job;
          if (result && !cancelRef.current) {
            await playOne(result.audio, result.mimeType);
          }
        });
      };

      const flush = async () => {
        await playing;
        setOutputLevel(0);
      };

      return { enqueue, flush };
    },
    [playOne],
  );

  const speakText = useCallback(
    async (text: string, langCode: string, speaker: string) => {
      cancelRef.current = false;
      setStatus("speaking");
      const tts = startTtsPipeline(langCode, speaker);
      // Split into sentence chunks for parallel TTS.
      const re = /[^.!?।]+[.!?।]+\s*/g;
      let m: RegExpExecArray | null;
      let last = 0;
      while ((m = re.exec(text)) !== null) {
        tts.enqueue(m[0]);
        last = m.index + m[0].length;
      }
      const tail = text.slice(last);
      if (tail.trim()) tts.enqueue(tail);
      await tts.flush();
      setStatus("idle");
    },
    [startTtsPipeline],
  );

  const streamReplyAndSpeak = useCallback(
    async (history: ChatMessage[], assistantId: string, image?: string) => {
      let searchContext: string | undefined;
      if (settings.webSearch) {
        const lastUser = [...history].reverse().find((m) => m.role === "user");
        if (lastUser) {
          try {
            const sr = await fetch("/api/web-search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: lastUser.content }),
            });
            const sj = await sr.json();
            const parts: string[] = [];
            if (sj.answer) parts.push(`SUMMARY: ${sj.answer}`);
            if (sj.results?.length) {
              parts.push(
                sj.results
                  .map(
                    (r: { title: string; url: string; snippet: string }, i: number) =>
                      `[${i + 1}] ${r.title}\n${r.snippet}\n${r.url}`,
                  )
                  .join("\n\n"),
              );
            }
            if (parts.length) searchContext = parts.join("\n\n");
          } catch {}
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          language: settings.language,
          searchContext,
          image,
        }),
      });

      if (!res.ok || !res.body) {
        if (res.status === 429) toast.error("Rate limit reached. Try again shortly.");
        else if (res.status === 402) toast.error("AI credits exhausted.");
        else toast.error("Assistant failed to respond.");
        throw new Error("chat failed");
      }

      const detectLanguage = (text: string) => {
        if (settings.language !== "auto" && settings.language !== "unknown") return settings.language;
        // Simple regex for Hindi/Devanagari characters
        return /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-IN";
      };

      let tts: { enqueue: (text: string) => void; flush: () => Promise<void> } | null = null;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      let pending = "";
      let firstChunk = true;
      let done = false;

      const flushSentences = (final = false) => {
        const re = /[^.!?।]+[.!?।]+\s*/g;
        let m: RegExpExecArray | null;
        let lastIdx = 0;
        while ((m = re.exec(pending)) !== null) {
          const sentence = m[0];
          if (!tts) {
            const langCode = detectLanguage(sentence);
            tts = startTtsPipeline(langCode, settings.speaker);
          }
          tts.enqueue(sentence);
          lastIdx = m.index + m[0].length;
        }
        pending = pending.slice(lastIdx);
        if (final && pending.trim()) {
          if (!tts) {
            const langCode = detectLanguage(pending);
            tts = startTtsPipeline(langCode, settings.speaker);
          }
          tts.enqueue(pending);
          pending = "";
        }
      };

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              full += delta;
              pending += delta;
              if (firstChunk) {
                firstChunk = false;
                setStatus("speaking");
              }
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m)),
              );
              flushSentences();
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      flushSentences(true);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)),
      );
      await tts?.flush();
      return full;
    },
    [settings.language, settings.speaker, settings.webSearch, startTtsPipeline],
  );

  const startRecording = useCallback(async () => {
    stopAudio();
    cancelRef.current = false;
    try {
      await recorder.start({
        silenceMs: 1400,
        voiceThreshold: 0.04,
        onAutoStop: () => {
          // Recorder will be stopped externally; fire stopAndProcess.
          stopAndProcessRef.current?.();
        },
      });
      // Haptic feedback on supported devices.
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}
    } catch {
      toast.error("Microphone permission denied.");
    }
  }, [recorder, stopAudio]);

  const processUserText = useCallback(
    async (text: string, image?: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        pending: true,
      };
      const history = [...messages, userMsg];
      setMessages([...history, assistantMsg]);
      setStatus("thinking");

      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {}

      try {
        await streamReplyAndSpeak(history, assistantId, image);
      } finally {
        setStatus("idle");
        if (handsFreeRef.current) {
          // Auto-resume listening for hands-free mode.
          setTimeout(() => startRecording(), 250);
        }
      }
    },
    [messages, streamReplyAndSpeak, startRecording],
  );

  const stopAndProcess = useCallback(async () => {
    const result = await recorder.stop();
    if (!result) {
      setStatus("idle");
      return;
    }
    setStatus("transcribing");
    cancelRef.current = false;

    try {
      const base64 = await blobToBase64(result.blob);
      const sttRes = await fetch("/api/sarvam-stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64,
          mimeType: result.mimeType,
          languageCode: settings.language,
        }),
      });
      const sttJson = await sttRes.json();
      if (!sttRes.ok || !sttJson.transcript) {
        toast.error(sttJson.error || "Could not transcribe audio.");
        setStatus("idle");
        return;
      }
      await processUserText(sttJson.transcript);
    } catch (err) {
      console.error(err);
      setStatus("idle");
    }
  }, [recorder, settings.language, processUserText]);

  // Ref so onAutoStop callback can call latest stopAndProcess.
  const stopAndProcessRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    stopAndProcessRef.current = stopAndProcess;
  }, [stopAndProcess]);

  const sendText = useCallback(
    async (text: string, image?: string) => {
      const t = text.trim();
      if (!t || status !== "idle") return;
      stopAudio();
      await processUserText(t, image);
    },
    [status, stopAudio, processUserText],
  );

  const replayMessage = useCallback(
    async (id: string) => {
      const msg = messages.find((m) => m.id === id);
      if (!msg || msg.role !== "assistant") return;
      stopAudio();
      const langCode = settings.language === "unknown" ? "hi-IN" : settings.language;
      await speakText(msg.content, langCode, settings.speaker);
    },
    [messages, settings.language, settings.speaker, speakText, stopAudio],
  );

  const interrupt = useCallback(() => {
    stopAudio();
    setStatus("idle");
  }, [stopAudio]);

  const clear = useCallback(() => {
    stopAudio();
    setMessages([]);
    setStatus("idle");
  }, [stopAudio]);

  const loadMessages = useCallback(
    (msgs: ChatMessage[]) => {
      stopAudio();
      setMessages(msgs);
      setStatus("idle");
    },
    [stopAudio],
  );

  return {
    messages,
    status,
    inputLevel: recorder.level,
    outputLevel,
    isRecording: recorder.isRecording,
    startRecording,
    stopAndProcess,
    sendText,
    replayMessage,
    interrupt,
    clear,
    loadMessages,
  };
}


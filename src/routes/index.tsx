import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Send } from "lucide-react";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { Waveform } from "@/components/voice/Waveform";
import { MessageBubble } from "@/components/voice/MessageBubble";
import { SettingsSheet } from "@/components/voice/SettingsSheet";
import { HistorySheet } from "@/components/voice/HistorySheet";
import { useAssistant, type AssistantSettings } from "@/hooks/useAssistant";
import { useConversations } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

const SETTINGS_KEY = "voice-assistant.settings";
const DEFAULT_SETTINGS: AssistantSettings = {
  language: "hi-IN",
  speaker: "anushka",
  handsFree: false,
  playbackRate: 1,
  webSearch: false,
};

const SUGGESTIONS: Record<string, string[]> = {
  "hi-IN": [
    "मुझे एक छोटी सी प्रेरक बात सुनाओ",
    "आज की मौसम जैसी बातें",
    "कोई दिलचस्प तथ्य बताओ",
  ],
  "en-IN": [
    "Tell me a short motivating thought",
    "Explain quantum computing simply",
    "Give me a fun fact",
  ],
  default: [
    "नमस्ते, अपना परिचय दो",
    "Tell me something interesting",
    "Recommend a good habit",
  ],
};

function Index() {
  const [settings, setSettings] = useState<AssistantSettings>(DEFAULT_SETTINGS);
  const [textInput, setTextInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const {
    messages,
    status,
    inputLevel,
    outputLevel,
    isRecording,
    startRecording,
    stopAndProcess,
    sendText,
    replayMessage,
    interrupt,
    clear,
    loadMessages,
  } = useAssistant(settings);

  const { conversations, activeId, setActiveId, upsert, newChat, remove } =
    useConversations();

  // Persist messages whenever they change.
  useEffect(() => {
    if (messages.length > 0) upsert(messages);
  }, [messages, upsert]);

  const handleSelect = useCallback(
    (id: string) => {
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return;
      setActiveId(id);
      loadMessages(conv.messages);
    },
    [conversations, setActiveId, loadMessages],
  );

  const handleNew = useCallback(() => {
    newChat();
    clear();
  }, [newChat, clear]);

  const handleToggle = useCallback(() => {
    if (status === "transcribing" || status === "thinking") return;
    if (isRecording) {
      stopAndProcess();
    } else if (status === "idle") {
      startRecording();
    }
  }, [status, isRecording, startRecording, stopAndProcess]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      e.preventDefault();
      handleToggle();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status === "speaking") interrupt();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onEsc);
    };
  }, [handleToggle, status, interrupt]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const orbLevel = status === "speaking" ? outputLevel : inputLevel;

  const suggestions = useMemo(
    () => SUGGESTIONS[settings.language] ?? SUGGESTIONS.default,
    [settings.language],
  );

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendText(textInput);
    setTextInput("");
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-10 py-6">
        <div className="flex items-center gap-2">
          <HistorySheet
            conversations={conversations}
            activeId={activeId}
            onSelect={handleSelect}
            onNew={handleNew}
            onDelete={remove}
          />
          <div className="flex items-center gap-3 ml-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: "var(--color-accent)" }}
            />
            <h1 className="font-display text-xl sm:text-2xl tracking-tight">Lumière</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleNew} aria-label="New chat">
            <Plus className="h-5 w-5" />
          </Button>
          <SettingsSheet settings={settings} onChange={setSettings} onClear={clear} />
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-8 px-4 sm:px-6 pb-6">
        {messages.length === 0 ? (
          <div className="text-center max-w-xl space-y-3 sm:space-y-4">
            <p
              className="text-[10px] sm:text-xs tracking-[0.4em] uppercase font-mono"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              A voice-first studio
            </p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl leading-[1.1]">
              Speak in any Indic language. Hear it answer back.
            </h2>
            <p
              className="text-sm sm:text-base md:text-lg leading-relaxed max-w-md mx-auto"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Tap the orb, ask anything in your tongue, and a natural Sarvam voice replies — instantly.
            </p>
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="w-full max-w-3xl flex-1 max-h-[45vh] sm:max-h-[50vh] overflow-y-auto space-y-4 px-1"
          >
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onReplay={replayMessage} />
            ))}
          </div>
        )}

        <VoiceOrb status={status} level={orbLevel} onToggle={handleToggle} onInterrupt={interrupt} />

        <Waveform level={inputLevel} active={isRecording} />

        {messages.length === 0 && (
          <div className="flex flex-wrap justify-center gap-2 max-w-xl">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendText(s)}
                disabled={status !== "idle"}
                className="px-3.5 py-1.5 text-xs sm:text-sm rounded-full border transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: "var(--color-border)",
                  background: "color-mix(in oklab, var(--color-card) 60%, transparent)",
                  color: "var(--color-foreground)",
                  backdropFilter: "blur(6px)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={submitText}
          className="w-full max-w-2xl flex items-center gap-2 px-1"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="…or type your message"
            disabled={status !== "idle"}
            className="flex-1 h-11 rounded-full px-5 text-sm border outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
            style={{
              background: "color-mix(in oklab, var(--color-card) 70%, transparent)",
              borderColor: "var(--color-border)",
              color: "var(--color-foreground)",
              backdropFilter: "blur(6px)",
            }}
          />
          <button
            type="submit"
            disabled={!textInput.trim() || status !== "idle"}
            className="h-11 w-11 rounded-full grid place-items-center disabled:opacity-40 transition-transform active:scale-95"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground)",
            }}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <p
          className="text-[11px] sm:text-xs tracking-[0.3em] uppercase font-mono text-center"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          Tap orb · press
          <kbd className="px-1.5 py-0.5 rounded border border-border mx-1.5 text-[10px] normal-case tracking-normal">Space</kbd>
          to talk ·
          <kbd className="px-1.5 py-0.5 rounded border border-border mx-1.5 text-[10px] normal-case tracking-normal">Esc</kbd>
          to interrupt
        </p>
      </section>
    </main>
  );
}

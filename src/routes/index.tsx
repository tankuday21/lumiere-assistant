import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Send, Camera, History, Settings2, Trash2 } from "lucide-react";
import { OrbVisualizer } from "@/components/voice/OrbVisualizer";
import { MessageBubble } from "@/components/voice/MessageBubble";
import { SettingsSheet } from "@/components/voice/SettingsSheet";
import { HistorySheet } from "@/components/voice/HistorySheet";
import { useAssistant, type AssistantSettings } from "@/hooks/useAssistant";
import { useConversations } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

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

function Index() {
  const [settings, setSettings] = useState<AssistantSettings>(DEFAULT_SETTINGS);
  const [textInput, setTextInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTo({
        top: scrollerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const orbLevel = status === "speaking" ? outputLevel : inputLevel;

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendText(textInput);
    setTextInput("");
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      toast.success("Image selected. Analyzing...");
      // Send with a generic prompt if no text input, or with current text input
      const prompt = textInput.trim() || "What is in this image?";
      await sendText(prompt, base64);
      setTextInput("");
    };
    reader.readAsDataURL(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-background selection:bg-primary/20">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <header className="flex items-center justify-between px-6 py-4 z-10 backdrop-blur-md bg-background/50 border-b border-border/50">
        <div className="flex items-center gap-3">
          <HistorySheet
            conversations={conversations}
            activeId={activeId}
            onSelect={handleSelect}
            onNew={handleNew}
            onDelete={remove}
          />
          <div className="flex flex-col">
            <h1 className="font-display text-lg tracking-tight font-bold">Lumière</h1>
            <span className="text-[9px] uppercase tracking-[0.2em] opacity-50 font-mono">Vision Assistant</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleNew} className="hover:bg-primary/10">
            <Plus className="h-5 w-5" />
          </Button>
          <SettingsSheet settings={settings} onChange={setSettings} onClear={clear} />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-between p-6 overflow-hidden">
        {/* Messages Section - Scrollable but contained */}
        <div className="w-full max-w-2xl flex-1 overflow-hidden flex flex-col justify-end mb-4">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-6 py-12"
              >
                <div className="space-y-2">
                  <h2 className="font-display text-4xl sm:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                    How can I help?
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    I can see, hear, and speak in your language. Tap the orb to begin.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                ref={scrollerRef}
                className="overflow-y-auto space-y-4 pr-2 custom-scrollbar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20, y: 10 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    layout
                  >
                    <MessageBubble message={m} onReplay={replayMessage} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Central Orb Section */}
        <div className="relative flex flex-col items-center gap-4 py-4">
          <OrbVisualizer
            status={status}
            level={orbLevel}
            onToggle={handleToggle}
            onInterrupt={interrupt}
          />
          
          <AnimatePresence>
            {status === "idle" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="text-[10px] uppercase tracking-[0.4em] font-mono"
              >
                Tap to speak
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Input Bar Section */}
        <div className="w-full max-w-2xl mt-auto">
          <div className="flex items-center gap-2 p-2 rounded-full border border-border/50 bg-card/30 backdrop-blur-xl shadow-2xl">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-primary/10 shrink-0"
              onClick={handleCameraClick}
            >
              <Camera className="h-5 w-5 text-muted-foreground" />
            </Button>
            
            <form onSubmit={submitText} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Message Lumière..."
                disabled={status !== "idle" && status !== "speaking"}
                className="flex-1 bg-transparent border-none outline-none text-sm px-2 disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!textInput.trim() || status === "thinking" || status === "transcribing"}
                className="rounded-full h-10 w-10 p-0 shadow-lg active:scale-95 transition-transform"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-4 font-mono opacity-30">
            SECURE INDIC MULTIMODAL AI
          </p>
        </div>
      </div>
    </main>
  );
}

import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Copy, Volume2 } from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage } from "@/hooks/useAssistant";

interface MessageBubbleProps {
  message: ChatMessage;
  onReplay?: (id: string) => void;
}

export function MessageBubble({ message, onReplay }: MessageBubbleProps) {
  const isUser = message.role === "user";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} group`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-3.5 prose-bubble ${
          isUser ? "rounded-br-sm" : "rounded-bl-sm shadow-elegant"
        }`}
        style={
          isUser
            ? {
                background: "color-mix(in oklab, var(--color-accent) 22%, var(--color-card))",
                color: "var(--color-foreground)",
                border: "1px solid color-mix(in oklab, var(--color-accent) 30%, transparent)",
              }
            : {
                background: "var(--color-card)",
                color: "var(--color-card-foreground)",
                border: "1px solid var(--color-border)",
              }
        }
      >
        {!isUser && (
          <div
            className="text-[10px] tracking-[0.3em] uppercase mb-2 font-mono"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Aura
          </div>
        )}
        {message.pending && !message.content ? (
          <div className="flex gap-1.5 py-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--color-muted-foreground)" }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </div>
        ) : isUser ? (
          <p className="font-display text-lg leading-relaxed">{message.content}</p>
        ) : (
          <div className="text-[15px] leading-relaxed font-body">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {!isUser && message.content && !message.pending && (
          <div className="mt-3 -mb-1 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onReplay?.(message.id)}
              className="h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1.5 hover:bg-muted transition-colors"
              style={{ color: "var(--color-muted-foreground)" }}
              aria-label="Replay"
            >
              <Volume2 className="h-3.5 w-3.5" /> Replay
            </button>
            <button
              type="button"
              onClick={copy}
              className="h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1.5 hover:bg-muted transition-colors"
              style={{ color: "var(--color-muted-foreground)" }}
              aria-label="Copy"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

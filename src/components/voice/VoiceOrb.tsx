import { motion, AnimatePresence } from "framer-motion";
import type { AssistantStatus } from "@/hooks/useAssistant";

interface VoiceOrbProps {
  status: AssistantStatus;
  level: number;
  onToggle: () => void;
  onInterrupt?: () => void;
}

const labelFor: Record<AssistantStatus, string> = {
  idle: "Tap to speak",
  recording: "Listening",
  transcribing: "Transcribing",
  thinking: "Thinking",
  speaking: "Speaking — tap to stop",
};

const dotColor: Record<AssistantStatus, string> = {
  idle: "var(--color-muted-foreground)",
  recording: "oklch(0.65 0.22 25)",
  transcribing: "var(--color-accent)",
  thinking: "var(--color-accent)",
  speaking: "oklch(0.7 0.18 145)",
};

export function VoiceOrb({ status, level, onToggle, onInterrupt }: VoiceOrbProps) {
  const pulse = 1 + Math.min(0.35, level * 1.4);
  const isActive = status === "recording" || status === "speaking";
  const busy = status === "transcribing" || status === "thinking";

  const handleClick = () => {
    if (status === "speaking" && onInterrupt) {
      onInterrupt();
      return;
    }
    onToggle();
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-5 select-none">
      {/* Status pill */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs tracking-[0.25em] uppercase font-mono"
          style={{
            background: "color-mix(in oklab, var(--color-card) 80%, transparent)",
            border: "1px solid var(--color-border)",
            color: "var(--color-muted-foreground)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: dotColor[status] }}
            animate={isActive || busy ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
            transition={{ duration: 1.4, repeat: isActive || busy ? Infinity : 0 }}
          />
          {labelFor[status]}
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        aria-label={status === "recording" ? "Stop recording" : status === "speaking" ? "Interrupt" : "Start recording"}
        aria-pressed={status === "recording"}
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          handleClick();
        }}
        className="relative h-44 w-44 sm:h-60 sm:w-60 md:h-72 md:w-72 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:cursor-wait transition-transform active:scale-[0.98]"
      >
        <motion.span
          aria-hidden
          className="absolute inset-[-30%] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--color-orb-from) 55%, transparent), transparent 70%)",
          }}
          animate={{
            scale: isActive ? [1, 1.08, 1] : [1, 1.03, 1],
            opacity: isActive ? [0.5, 0.85, 0.5] : [0.35, 0.55, 0.35],
          }}
          transition={{ duration: isActive ? 2 : 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full shadow-orb"
          style={{
            background:
              "radial-gradient(circle at 30% 25%, color-mix(in oklab, var(--color-orb-from) 90%, white 25%), var(--color-orb-from) 35%, var(--color-orb-to) 90%)",
          }}
          animate={{ scale: pulse }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
        />
        <span
          aria-hidden
          className="absolute inset-[18%] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), transparent 55%)",
          }}
        />
        <span className="absolute inset-0 grid place-items-center">
          {status === "speaking" ? (
            <svg viewBox="0 0 24 24" className="h-12 w-12 sm:h-16 sm:w-16" fill="currentColor" style={{ color: "var(--color-primary-foreground)" }}>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : busy ? (
            <motion.svg
              viewBox="0 0 24 24"
              className="h-12 w-12 sm:h-16 sm:w-16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              style={{ color: "var(--color-primary-foreground)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <path d="M12 3a9 9 0 0 1 9 9" />
            </motion.svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-12 w-12 sm:h-16 sm:w-16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--color-primary-foreground)" }}
            >
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v3" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}

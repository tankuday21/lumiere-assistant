import { motion } from "framer-motion";

interface WaveformProps {
  level: number;
  active: boolean;
}

const BARS = 24;

export function Waveform({ level, active }: WaveformProps) {
  return (
    <div className="flex items-end justify-center gap-1.5 h-16">
      {Array.from({ length: BARS }).map((_, i) => {
        const wave = Math.sin((i / BARS) * Math.PI);
        const target = active
          ? 6 + wave * 60 * Math.min(1, level * 5 + 0.15)
          : 4 + wave * 6;
        return (
          <motion.span
            key={i}
            className="w-1 rounded-full"
            style={{ background: "var(--color-accent)" }}
            animate={{ height: target }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          />
        );
      })}
    </div>
  );
}

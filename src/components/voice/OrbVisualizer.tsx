import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OrbVisualizerProps {
  status: "idle" | "recording" | "transcribing" | "thinking" | "speaking" | "error";
  level: number;
  onToggle: () => void;
  onInterrupt: () => void;
}

export function OrbVisualizer({ status, level, onToggle, onInterrupt }: OrbVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    window.addEventListener("resize", resize);
    resize();

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = 60;
      const orbRadius = baseRadius + (status === "speaking" || status === "recording" ? level * 40 : 0);

      // Draw Orb Glow
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius * 2);
      let color = "rgba(100, 100, 255, ";
      if (status === "recording") color = "rgba(255, 100, 100, ";
      if (status === "thinking") color = "rgba(100, 255, 100, ";
      if (status === "speaking") color = "rgba(100, 200, 255, ";
      if (status === "error") color = "rgba(255, 50, 50, ";

      gradient.addColorStop(0, `${color}0.4)`);
      gradient.addColorStop(0.5, `${color}0.1)`);
      gradient.addColorStop(1, `${color}0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw Waveform Rings
      if (status === "recording" || status === "speaking") {
        rotationRef.current += 0.02;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotationRef.current);

        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.strokeStyle = `${color}${0.3 - i * 0.1})`;
          ctx.lineWidth = 2;
          const r = orbRadius + i * 15 + Math.sin(rotationRef.current * 2 + i) * 5;
          
          for (let a = 0; a < Math.PI * 2; a += 0.1) {
            const x = Math.cos(a) * r * (1 + Math.sin(a * 4 + rotationRef.current) * 0.05 * level);
            const y = Math.sin(a) * r * (1 + Math.cos(a * 4 + rotationRef.current) * 0.05 * level);
            if (a === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Inner Orb
      ctx.beginPath();
      ctx.fillStyle = `${color}0.8)`;
      ctx.shadowBlur = 20;
      ctx.shadowColor = color.replace(", ", ", 1)");
      ctx.arc(centerX, centerY, baseRadius * (0.8 + level * 0.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      requestRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status, level]);

  const handleClick = () => {
    if (status === "speaking") {
      onInterrupt();
    } else {
      onToggle();
    }
  };

  return (
    <div className="relative w-72 h-72 flex items-center justify-center cursor-pointer" onClick={handleClick}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: "none" }}
      />
      <motion.div
        initial={false}
        animate={{ scale: status === "recording" ? 1.1 : 1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {status === "thinking" && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white text-[10px] font-mono tracking-widest uppercase opacity-50"
            >
              Thinking...
            </motion.div>
          )}
          {status === "transcribing" && (
            <motion.div
              key="transcribing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white text-[10px] font-mono tracking-widest uppercase opacity-50"
            >
              Transcribing...
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

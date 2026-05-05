import { useTheme } from "@/contexts/ThemeContext";
import { THEMES } from "@/lib/themes";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid grid-cols-2 gap-3">
      {THEMES.map((t) => {
        const active = t.id === theme;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className="relative rounded-xl p-3 text-left transition-all hover:-translate-y-0.5"
            style={{
              background: t.swatch.bg,
              color: t.swatch.fg,
              border: `2px solid ${active ? t.swatch.accent : "transparent"}`,
              boxShadow: active
                ? `0 0 0 3px color-mix(in oklab, ${t.swatch.accent} 35%, transparent)`
                : "0 4px 14px -8px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="h-4 w-4 rounded-full"
                style={{ background: t.swatch.accent }}
              />
              <span className="text-xs tracking-[0.25em] uppercase opacity-70">
                {active ? "Selected" : "Theme"}
              </span>
            </div>
            <div className="text-base font-semibold leading-tight">{t.name}</div>
          </button>
        );
      })}
    </div>
  );
}

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Settings, Trash2 } from "lucide-react";
import { ThemePicker } from "./ThemePicker";
import type { AssistantSettings } from "@/hooks/useAssistant";

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "auto", label: "Auto-detect (Bilingual)" },
  { code: "hi-IN", label: "हिन्दी (Hindi)" },
  { code: "en-IN", label: "English (India)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "mr-IN", label: "मराठी (Marathi)" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "od-IN", label: "ଓଡ଼ିଆ (Odia)" },
];

export const SPEAKERS = [
  { id: "anushka", label: "Anushka", persona: "Professional & Clear" },
  { id: "manisha", label: "Manisha", persona: "Warm & Friendly" },
  { id: "vidya", label: "Vidya", persona: "Calm & Natural" },
  { id: "arya", label: "Arya", persona: "Energetic & Bright" },
  { id: "abhilash", label: "Abhilash", persona: "Deep & Authoritative" },
  { id: "karun", label: "Karun", persona: "Casual & Friendly" },
  { id: "hitesh", label: "Hitesh", persona: "Trustworthy & Stable" },
];

interface SettingsSheetProps {
  settings: AssistantSettings;
  onChange: (next: AssistantSettings) => void;
  onClear: () => void;
}

export function SettingsSheet({ settings, onChange, onClear }: SettingsSheetProps) {
  const rate = settings.playbackRate ?? 1;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          className="rounded-full h-11 w-11"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Settings</SheetTitle>
          <SheetDescription>Personalize your voice assistant.</SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-8">
          <section className="space-y-3">
            <Label className="text-xs tracking-[0.3em] uppercase font-mono text-muted-foreground">
              Theme
            </Label>
            <ThemePicker />
          </section>

          <section className="flex items-center justify-between gap-4 py-1">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Hands-free mode</Label>
              <p className="text-xs text-muted-foreground">
                Auto-listen after each reply for natural conversation.
              </p>
            </div>
            <Switch
              checked={settings.handsFree ?? false}
              onCheckedChange={(v) => onChange({ ...settings, handsFree: v })}
            />
          </section>

          <section className="flex items-center justify-between gap-4 py-1">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Web search</Label>
              <p className="text-xs text-muted-foreground">
                Ground answers with live results from the web.
              </p>
            </div>
            <Switch
              checked={settings.webSearch ?? false}
              onCheckedChange={(v) => onChange({ ...settings, webSearch: v })}
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs tracking-[0.3em] uppercase font-mono text-muted-foreground">
                Playback speed
              </Label>
              <span className="text-xs font-mono">{rate.toFixed(2)}×</span>
            </div>
            <Slider
              value={[rate]}
              min={0.75}
              max={1.5}
              step={0.05}
              onValueChange={(v) => onChange({ ...settings, playbackRate: v[0] })}
            />
          </section>

          <section className="space-y-3">
            <Label className="text-xs tracking-[0.3em] uppercase font-mono text-muted-foreground">
              Language
            </Label>
            <Select
              value={settings.language}
              onValueChange={(v) => onChange({ ...settings, language: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section className="space-y-3">
            <Label className="text-xs tracking-[0.3em] uppercase font-mono text-muted-foreground">
              Voice
            </Label>
            <Select
              value={settings.speaker}
              onValueChange={(v) => onChange({ ...settings, speaker: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPEAKERS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-[10px] text-muted-foreground">{s.persona}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section className="pt-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={onClear}
            >
              <Trash2 className="h-4 w-4" /> Clear conversation
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

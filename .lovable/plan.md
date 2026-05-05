# Premium Voice Assistant — Plan

A luxurious, voice-first AI assistant. Press the mic, speak in any Indic language or English, watch a live transcript, hear the answer back in a natural Sarvam voice. Multiple premium themes selectable from a settings panel — **app loads on the Ivory Editorial theme by default**.

## User flow

1. Land on calm, cream-toned home (Ivory Editorial) with a single large "orb" mic button.
2. Tap & hold (or click) to record → live waveform animates.
3. Release → audio sent to Sarvam STT → transcript appears.
4. Transcript + chat history sent to Lovable AI (Gemini) → streamed reply renders as elegant typography.
5. Reply text sent to Sarvam TTS → audio auto-plays through animated speaking orb.
6. Conversation history scrolls below; settings gear opens theme + voice + language picker.

## Backend (Lovable Cloud + server functions)

- Enable Lovable Cloud (for secret storage + server runtime).
- Add secret: `SARVAM_API_KEY` (user provides from dashboard.sarvam.ai).
- Server function `sarvam-stt`: base64 audio + language code → `https://api.sarvam.ai/speech-to-text` → transcript.
- Server function `sarvam-tts`: text + voice + language → `https://api.sarvam.ai/text-to-speech` → base64 audio.
- Server route `chat` (SSE): streams from Lovable AI Gateway (`google/gemini-3-flash-preview`) with full message history + multilingual system prompt. Surfaces 402/429 as friendly toasts.
- No DB in v1 — conversation lives in React state + localStorage for active session and theme preference.

## Frontend

Stack: React 19 + TanStack Start + Tailwind + shadcn (already in place).

New files:
- `src/routes/index.tsx` — full assistant UI (replaces placeholder).
- `src/components/voice/VoiceOrb.tsx` — animated mic/speaking orb (framer-motion, gradient + glow).
- `src/components/voice/Waveform.tsx` — live mic level bars while recording.
- `src/components/voice/MessageBubble.tsx` — typographic chat bubble with markdown (react-markdown).
- `src/components/voice/SettingsSheet.tsx` — slide-in panel: theme, voice, language, clear chat.
- `src/components/voice/ThemePicker.tsx` — visual swatches for each theme.
- `src/hooks/useRecorder.ts` — MediaRecorder wrapper, returns base64 webm.
- `src/hooks/useAssistant.ts` — orchestrates STT → chat stream → TTS playback.
- `src/lib/themes.ts` — theme registry (id, name, CSS-var overrides, font links).
- `src/contexts/ThemeContext.tsx` — applies selected theme by toggling `data-theme` on `<html>` and writes to localStorage. **Default = Ivory Editorial.**

Edits:
- `src/styles.css` — base cream tokens (Ivory Editorial as `:root`) + per-theme `[data-theme="..."]` blocks.
- `index.html` (or root head) — preload Google Fonts for the theme set.

## Themes (selectable in Settings)

All cream-forward, distinct in personality. **Ivory Editorial is the default on first load.**

- **Ivory Editorial** (default) — #F7F1E3 bg, espresso #2A1810, gold #B8893A, Fraunces + Inter.
- **Soft Minimal** — #FAF7F2 bg, charcoal, sage accent, Geist Sans, generous whitespace.
- **Art Deco Boutique** — #F2E8D5 bg, emerald #0E4D3F + brass, Playfair Display + Cormorant.
- **Brutalist Cream** — #EFE7D6 bg, raw black, electric orange, Space Grotesk + JetBrains Mono.
- **Retro-Futuristic Cream** — cream + coral + deep navy, Major Mono Display headings, glow.
- **Organic Zen** — bone #F4EDE0, terracotta accent, Cormorant Garamond, soft blob backgrounds.

Components only use semantic tokens — switching theme restyles the whole app instantly.

## Technical details

- Recording: `getUserMedia` → `MediaRecorder` (audio/webm) → base64 → `sarvam-stt`.
- Sarvam STT: model `saarika:v2`, languages hi-IN (default), en-IN, bn-IN, ta-IN, te-IN, mr-IN, gu-IN, kn-IN, ml-IN, pa-IN, od-IN, plus `unknown` auto-detect.
- Sarvam TTS: model `bulbul:v2`, speakers Anushka, Manisha, Vidya, Arya, Abhilash, Karun, Hitesh — exposed in settings.
- Chat: SSE streaming, progressive markdown render, fire TTS once stream ends.
- Playback: Web Audio API; orb pulses to RMS level while speaking.
- Errors: toasts for mic permission denied, 402 (credits), 429 (rate limit), Sarvam failures.
- A11y: Space to start/stop recording, aria labels on orb, captions always visible.

## Out of scope (v1)

Cross-reload chat persistence, auth, custom voices, mobile native gestures.

## Setup the user will see

1. One-click "Enable Cloud" prompt.
2. Enter Sarvam API key when asked.
3. Start talking — app opens on Ivory Editorial.

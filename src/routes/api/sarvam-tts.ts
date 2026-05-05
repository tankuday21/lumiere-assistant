import { createFileRoute } from "@tanstack/react-router";

// Sarvam Text-to-Speech proxy.
// Accepts JSON: { text: string, languageCode: string, speaker: string }
// Returns: { audio: base64, mimeType: "audio/wav" }
export const Route = createFileRoute("/api/sarvam-tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.SARVAM_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "SARVAM_API_KEY is not configured" }, { status: 500 });
          }

          const { text, languageCode, speaker } = (await request.json()) as {
            text: string;
            languageCode?: string;
            speaker?: string;
          };

          if (!text || !text.trim()) {
            return Response.json({ error: "Missing text" }, { status: 400 });
          }

          // Sarvam TTS limit ~500 chars per chunk; truncate gracefully.
          const trimmed = text.length > 1500 ? text.slice(0, 1500) : text;
          // Split into <=450-char chunks to satisfy bulbul:v2 limits.
          const chunks: string[] = [];
          let buf = "";
          for (const sentence of trimmed.split(/(?<=[.!?।])\s+/)) {
            if ((buf + " " + sentence).length > 450) {
              if (buf) chunks.push(buf);
              buf = sentence;
            } else {
              buf = buf ? buf + " " + sentence : sentence;
            }
          }
          if (buf) chunks.push(buf);

          const res = await fetch("https://api.sarvam.ai/text-to-speech", {
            method: "POST",
            headers: {
              "api-subscription-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: chunks.length ? chunks : [trimmed],
              target_language_code: languageCode || "hi-IN",
              speaker: speaker || "anushka",
              model: "bulbul:v2",
              enable_preprocessing: true,
            }),
          });

          const body = await res.text();
          if (!res.ok) {
            console.error("Sarvam TTS error", res.status, body);
            return Response.json(
              { error: `Sarvam TTS failed (${res.status})`, detail: body.slice(0, 500) },
              { status: 502 },
            );
          }

          const data = JSON.parse(body) as { audios?: string[] };
          const audios = data.audios ?? [];
          if (!audios.length) {
            return Response.json({ error: "No audio returned" }, { status: 502 });
          }

          // Concatenate WAV chunks: keep header from first, strip 44-byte
          // header from subsequent chunks, then patch header sizes.
          if (audios.length === 1) {
            return Response.json({ audio: audios[0], mimeType: "audio/wav" });
          }

          const buffers = audios.map((b64) =>
            Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
          );
          const first = buffers[0];
          const tail = buffers.slice(1).map((b) => b.slice(44));
          const totalDataLen =
            first.length - 44 + tail.reduce((s, b) => s + b.length, 0);
          const out = new Uint8Array(44 + totalDataLen);
          out.set(first, 0);
          let offset = first.length;
          for (const t of tail) {
            out.set(t, offset);
            offset += t.length;
          }
          // Patch RIFF chunk size and data chunk size.
          const view = new DataView(out.buffer);
          view.setUint32(4, 36 + totalDataLen, true);
          view.setUint32(40, totalDataLen, true);

          let binary = "";
          for (let i = 0; i < out.length; i++) binary += String.fromCharCode(out[i]);
          const merged = btoa(binary);

          return Response.json({ audio: merged, mimeType: "audio/wav" });
        } catch (err) {
          console.error("sarvam-tts handler error", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
          );
        }
      },
    },
  },
});

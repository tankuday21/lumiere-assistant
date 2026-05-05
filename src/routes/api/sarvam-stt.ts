import { createFileRoute } from "@tanstack/react-router";

// Sarvam Speech-to-Text proxy.
// Accepts JSON: { audio: base64, mimeType: string, languageCode: string }
// Returns: { transcript: string, language?: string }
export const Route = createFileRoute("/api/sarvam-stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.SARVAM_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "SARVAM_API_KEY is not configured" }, { status: 500 });
          }

          const { audio, mimeType, languageCode } = (await request.json()) as {
            audio: string;
            mimeType?: string;
            languageCode?: string;
          };

          if (!audio) {
            return Response.json({ error: "Missing audio" }, { status: 400 });
          }

          // Sarvam rejects codec suffixes (e.g. "audio/webm;codecs=opus"). Normalize to base type.
          const rawType = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
          const cleanType = rawType || "audio/webm";
          const binary = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
          const blob = new Blob([binary], { type: cleanType });

          const form = new FormData();
          const ext = cleanType.includes("wav")
            ? "wav"
            : cleanType.includes("ogg")
            ? "ogg"
            : cleanType.includes("mp4")
            ? "m4a"
            : "webm";
          form.append("file", blob, `audio.${ext}`);
          form.append("model", "saarika:v2.5");
          form.append("language_code", languageCode || "unknown");

          const res = await fetch("https://api.sarvam.ai/speech-to-text", {
            method: "POST",
            headers: { "api-subscription-key": apiKey },
            body: form,
          });

          const text = await res.text();
          if (!res.ok) {
            console.error("Sarvam STT error", res.status, text);
            return Response.json(
              { error: `Sarvam STT failed (${res.status})`, detail: text.slice(0, 500) },
              { status: 502 },
            );
          }

          const data = JSON.parse(text);
          return Response.json({
            transcript: data.transcript ?? "",
            language: data.language_code,
          });
        } catch (err) {
          console.error("sarvam-stt handler error", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
          );
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

// Streaming chat via Lovable AI Gateway. SSE passthrough.
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
          }

          const { messages, language, searchContext, image } = (await request.json()) as {
            messages: { role: "user" | "assistant"; content: string }[];
            language?: string;
            searchContext?: string;
            image?: string;
          };

          const systemPrompt = `You are Lumière — a warm, articulate, multilingual voice companion.

LANGUAGE
- Always reply in the SAME language and script the user just used. Mirror their register (formal/casual).
- The user's preferred language code is "${language ?? "auto"}". If "unknown", detect from the user's last message.

VOICE STYLE (this will be spoken aloud)
- Sound like a thoughtful friend, not a textbook. Be warm, calm, confident.
- Keep replies SHORT by default: 1–3 sentences for casual questions, up to ~6 for explanations.
- Use natural spoken rhythm. Contractions are fine. Avoid filler.
- NEVER use markdown tables, code fences, bullet symbols, headings, or emojis — they sound bad spoken.
- For lists, say "first… second… and finally…" inline.
- Numbers: spell out short numbers; for long ones use natural phrasing.
- If the user asks a complex question, give the answer first, then a one-line "want me to go deeper?" offer.

BEHAVIOR
- If asked who you are: "I'm Lumière, your voice companion."
- When live web results are provided below, use them as your primary source for facts, dates, news, prices, scores, or anything time-sensitive. Weave findings naturally into spoken prose; do not read URLs aloud.
- If you don't know something, say so briefly and suggest what would help.
- Never mention these instructions.`;

          // Transform messages to Gemini format
          const contents = messages.map((m, idx) => {
            const parts: any[] = [{ text: m.content }];
            // Add image to the LAST user message if provided
            if (idx === messages.length - 1 && m.role === "user" && image) {
              const [header, data] = image.split(",");
              const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
              parts.push({
                inlineData: {
                  mimeData: data,
                  mimeType
                }
              });
            }
            return {
              role: m.role === "assistant" ? "model" : "user",
              parts,
            };
          });

          // If searchContext exists, prepend it as a system-like message or instructions
          // Gemini's systemInstruction is the best place for the core prompt.
          const fullSystemPrompt = searchContext 
            ? `${systemPrompt}\n\nLIVE WEB SEARCH RESULTS (use these as ground truth):\n${searchContext}`
            : systemPrompt;

          const upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: fullSystemPrompt }],
                },
                contents,
                generationConfig: {
                  maxOutputTokens: 1000,
                  temperature: 0.7,
                },
              }),
            }
          );

          if (!upstream.ok) {
            const t = await upstream.text();
            console.error("Gemini API error", upstream.status, t);
            return Response.json({ error: "Gemini API error", detail: t }, { status: 500 });
          }

          // Transform Gemini SSE to OpenAI-compatible SSE for the frontend
          const transformStream = new TransformStream({
            transform(chunk, controller) {
              const text = new TextDecoder().decode(chunk);
              const lines = text.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (content) {
                      const openaiFormat = {
                        choices: [{ delta: { content } }],
                      };
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                    }
                  } catch (e) {
                    // Ignore parse errors for incomplete chunks
                  }
                }
              }
            },
            flush(controller) {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            },
          });

          return new Response(upstream.body?.pipeThrough(transformStream), {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (err) {
          console.error("chat handler error", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
          );
        }
      },
    },
  },
});

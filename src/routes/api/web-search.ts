import { createFileRoute } from "@tanstack/react-router";

// Web search via Tavily API. Tavily aggregates Google + other engines and
// returns clean, LLM-ready snippets — much more reliable than scraping.
export const Route = createFileRoute("/api/web-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.TAVILY_API_KEY;
          if (!apiKey) {
            return Response.json(
              { results: [], error: "TAVILY_API_KEY is not configured" },
              { status: 500 },
            );
          }

          const { query } = (await request.json()) as { query: string };
          if (!query || !query.trim()) {
            return Response.json({ results: [] });
          }

          const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              query,
              search_depth: "advanced",
              include_answer: true,
              max_results: 6,
              include_raw_content: false,
            }),
          });

          if (!res.ok) {
            const t = await res.text();
            console.error("Tavily error", res.status, t);
            return Response.json(
              { results: [], error: `tavily_${res.status}` },
              { status: 200 },
            );
          }

          const data = (await res.json()) as {
            answer?: string;
            results?: { title: string; url: string; content: string }[];
          };

          const results =
            data.results?.map((r) => ({
              title: r.title,
              url: r.url,
              snippet: r.content,
            })) ?? [];

          return Response.json({ results, answer: data.answer ?? null });
        } catch (err) {
          console.error("web-search error", err);
          return Response.json(
            { results: [], error: err instanceof Error ? err.message : "unknown" },
            { status: 200 },
          );
        }
      },
    },
  },
});

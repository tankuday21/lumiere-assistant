import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sarvam Voice — Premium Multilingual Assistant" },
      {
        name: "description",
        content:
          "A luxurious voice-first AI assistant. Speak in any Indic language or English and hear natural Sarvam voices reply.",
      },
      { property: "og:title", content: "Sarvam Voice — Premium Multilingual Assistant" },
      {
        property: "og:description",
        content: "Speak in any Indic language. Hear elegant Sarvam voices reply.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Sarvam Voice — Premium Multilingual Assistant" },
      { name: "description", content: "Aura Voice AI is a luxurious, voice-first AI assistant for Indic languages and English." },
      { property: "og:description", content: "Aura Voice AI is a luxurious, voice-first AI assistant for Indic languages and English." },
      { name: "twitter:description", content: "Aura Voice AI is a luxurious, voice-first AI assistant for Indic languages and English." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b4f6f278-4c1d-44ee-befb-d5964879a8f7/id-preview-a29e362d--7db69869-2c70-48b5-a3d6-40ad34818d23.lovable.app-1777977932891.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b4f6f278-4c1d-44ee-befb-d5964879a8f7/id-preview-a29e362d--7db69869-2c70-48b5-a3d6-40ad34818d23.lovable.app-1777977932891.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600&family=Cormorant+Garamond:wght@500;600&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <Outlet />
      <Toaster />
    </ThemeProvider>
  );
}

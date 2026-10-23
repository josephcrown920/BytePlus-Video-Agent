import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Film, Sparkles } from "lucide-react";

import { ScriptCard } from "@/components/aura/ScriptCard";
import { StoryboardCard } from "@/components/aura/StoryboardCard";
import { getSharedContent } from "@/lib/share";

export const Route = createFileRoute("/share/$id")({
  loader: async ({ params }) => {
    const shared = await getSharedContent(params.id);
    if (!shared) throw notFound();
    if (shared.type !== "script" && shared.type !== "storyboard") {
      throw new Error("This shared content type is not supported");
    }
    return shared;
  },
  component: SharedContentPage,
});

function SharedContentPage() {
  const shared = Route.useLoaderData();
  const isScript = shared.type === "script";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(139,92,246,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-noise opacity-[0.025]" />
      </div>

      <div className="relative mx-auto w-full max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Create with Aura</span>
            <span className="sm:hidden">Aura</span>
          </a>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isScript ? <Sparkles className="size-3.5 text-primary" /> : <Film className="size-3.5 text-primary" />}
            Shared {isScript ? "script" : "storyboard"}
          </div>
        </header>

        <section className="mb-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Public preview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{shared.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            Read-only creative output shared from Aura
            <ExternalLink className="size-3.5" />
          </p>
        </section>

        {isScript ? (
          <ScriptCard output={shared.data} readOnly />
        ) : (
          <StoryboardCard output={shared.data} readOnly />
        )}
      </div>
    </main>
  );
}
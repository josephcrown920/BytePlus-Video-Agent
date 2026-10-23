import { useEffect, useState } from "react";
import { ArrowDown, Zap } from "lucide-react";

const WORDS = ["visuals", "interfaces", "systems", "stories", "worlds"];

export function HeroIntro({ onEnter }: { onEnter: () => void }) {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden">
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <div className="animate-fade-in-up mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Zap className="size-3.5 text-primary" />
          Aura-1 Pro is live
        </div>

        <h1 className="animate-fade-in-up delay-100 text-balance text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Generate cinematic
          <br />
          <span className="relative inline-block">
            <span
              key={wordIndex}
              className="animate-word-in bg-gradient-to-r from-primary via-fuchsia-400 to-primary bg-clip-text text-transparent"
            >
              {WORDS[wordIndex]}
            </span>
          </span>{" "}
          in seconds
        </h1>

        <p className="animate-fade-in-up delay-300 mx-auto mt-6 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          A single prompt bar wired to a streaming model. Think it, type it, watch it
          render itself line by line.
        </p>

        <div className="animate-fade-in-up delay-500 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onEnter}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform duration-300 hover:scale-[1.03]"
          >
            Start creating
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>
          <button
            onClick={onEnter}
            className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See it stream
          </button>
        </div>
      </div>

      <button
        onClick={onEnter}
        aria-label="Scroll to workspace"
        className="animate-float absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-surface p-2 text-muted-foreground"
      >
        <ArrowDown className="size-4" />
      </button>
    </section>
  );
}

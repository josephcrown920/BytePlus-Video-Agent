import { useEffect, useState } from "react";
import { ArrowDown, Zap } from "lucide-react";

import heroCar from "@/assets/hero-car.jpg";

const WORDS = ["visuals", "interfaces", "systems", "stories", "worlds"];

export function HeroIntro({ onEnter }: { onEnter: () => void }) {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden">
      <img
        src={heroCar}
        alt="Cinematic car explosion — generated with Aura AI"
        className="animate-hero-zoom absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
      <div className="animate-gradient-x pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(139,92,246,0.22),transparent_45%,rgba(217,70,239,0.2))]" />
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.03]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <div className="animate-fade-in-up mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md">
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
            className="rounded-full border border-white/10 bg-surface/50 px-6 py-3 text-sm font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
          >
            See it stream
          </button>
        </div>
      </div>

      <button
        onClick={onEnter}
        aria-label="Scroll to workspace"
        className="animate-float absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-surface/60 p-2 text-muted-foreground backdrop-blur-md"
      >
        <ArrowDown className="size-4" />
      </button>
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

import { HeroIntro } from "@/components/aura/HeroIntro";
import { Workspace } from "@/components/aura/Workspace";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const workspaceRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      {/* Ambient background layers */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(139,92,246,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(217,70,239,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-noise opacity-[0.025]" />
      </div>

      <HeroIntro
        onEnter={() =>
          workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      <div ref={workspaceRef} className="relative">
        <Workspace />
      </div>
    </div>
  );
}

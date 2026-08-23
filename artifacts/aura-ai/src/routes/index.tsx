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

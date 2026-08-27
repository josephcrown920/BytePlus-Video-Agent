import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { AlertCircle, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import { useLocation } from "wouter";

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <div className="flex h-[100dvh] w-full bg-background text-foreground cinematic-grid overflow-hidden">
      <div className="hidden md:flex h-full shrink-0 z-10">
        <Sidebar />
      </div>

      <main className="flex-1 relative flex flex-col h-full min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card/50 backdrop-blur-xl shrink-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm bg-primary/20 border border-primary flex items-center justify-center">
              <div className="w-2 h-2 bg-primary animate-pulse rounded-full" />
            </div>
            <h1 className="font-bold text-xs tracking-widest uppercase font-mono text-primary text-glow">BytePlus</h1>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r border-border/50 bg-card/95">
              <Sidebar className="w-full border-r-0" />
            </SheetContent>
          </Sheet>
        </div>

        <div className="bg-destructive/10 border-b border-destructive/20 px-2 py-1.5 md:px-4 md:py-2 flex items-center justify-center gap-1.5 md:gap-2 text-destructive-foreground text-[9px] md:text-xs font-mono uppercase tracking-wider shrink-0 z-10 text-center leading-tight">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="hidden sm:inline">Server-side BytePlus API connection required for media generation. Operating in offline planning mode.</span>
          <span className="sm:hidden">API connection required. Offline mode.</span>
        </div>
        
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
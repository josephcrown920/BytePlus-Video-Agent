import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Film, 
  Layers, 
  Archive,
  BookOpen, 
  Server, 
  Activity, 
  Settings,
  Menu,
  Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Studio', icon: Film },
  { path: '/sequence', label: 'Sequence', icon: Layers },
  { path: '/drafts', label: 'Drafts', icon: Archive },
  { path: '/bible', label: 'Bible', icon: BookOpen },
  { path: '/queue', label: 'Queue', icon: Server },
  { path: '/pipeline', label: 'Pipeline', icon: Activity },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-border bg-sidebar flex flex-col justify-between transition-all duration-300">
        <div>
          <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-border">
            <div className="flex items-center gap-2 text-primary font-bold tracking-wider">
              <Zap className="w-6 h-6 fill-primary" />
              <span className="hidden md:block uppercase tracking-widest text-sm">BytePlus Agent</span>
            </div>
          </div>
          
          <nav className="p-2 space-y-1 mt-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path} className="block">
                  <div className={`
                    flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                  `}>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden md:block text-sm">{item.label}</span>
                    {isActive && (
                      <div className="hidden md:block ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <button className="w-full flex items-center justify-center md:justify-start gap-3 text-sidebar-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
            <span className="hidden md:block text-sm font-medium">Project Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-14 border-b border-border flex items-center px-3 sm:px-4 justify-between bg-background/50 backdrop-blur-md z-10 absolute top-0 w-full">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
            <span className="hidden sm:inline font-mono text-xs border border-border px-2 py-1 rounded bg-card">PROJ_OMEGA_V2</span>
            <span className="hidden sm:inline">/</span>
            <span className="text-foreground capitalize">{location === '/' ? 'Studio' : location.slice(1)}</span>
          </div>
          
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <div aria-label="GPU cluster online" className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="hidden md:inline">GPU CLUSTER ONLINE</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-mono text-xs" aria-label="Director workspace">
              DV
            </div>
          </div>
        </header>
        
        {/* Scrollable content area with top padding for header */}
        <div className="flex-1 overflow-y-auto pt-14">
          {children}
        </div>
      </main>
    </div>
  );
}

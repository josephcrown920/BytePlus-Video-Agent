export default function Drafts() {
  return (
    <div className="flex-1 flex flex-col h-full bg-background p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Drafts Archive</h1>
        <p className="text-sm text-muted-foreground mt-1">Saved sequences, generated assets, and project files</p>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-card/20 border border-dashed border-border/50 rounded-lg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border border-border/50 rounded-sm bg-black/50 flex items-center justify-center">
             <span className="font-mono text-2xl text-muted-foreground/30">0</span>
          </div>
          <h3 className="font-medium text-muted-foreground mb-1">No drafts found</h3>
          <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider">Generate assets to build your library</p>
        </div>
      </div>
    </div>
  );
}
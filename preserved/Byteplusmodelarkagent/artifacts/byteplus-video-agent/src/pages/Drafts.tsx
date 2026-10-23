import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Clapperboard, Copy, Download, FileUp, FolderPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function Drafts() {
  const workspace = useWorkspace();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<"create" | "rename" | "import" | null>(null);
  const [name, setName] = useState("");
  const [targetId, setTargetId] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const openProject = (id: string) => {
    workspace.openProject(id);
    navigate("/multi-shot");
  };
  const submitName = () => {
    if (dialog === "create") {
      workspace.createProject(name);
      toast({ title: "Project created", description: "Your production workspace is ready." });
    } else if (dialog === "rename") workspace.renameProject(targetId, name);
    setDialog(null);
    setName("");
  };
  const importFile = async (mode: "merge" | "replace") => {
    if (!pendingFile) return;
    if (mode === "replace" && !window.confirm("Replace every local project, preset, character, and saved plan with this export? This cannot be undone.")) return;
    try {
      const count = await workspace.importWorkspace(pendingFile, mode);
      toast({ title: `${count} project${count === 1 ? "" : "s"} imported`, description: "Your imported production is ready to edit." });
      setDialog(null);
      setPendingFile(null);
    } catch (error) {
      toast({ title: "Import failed", description: error instanceof Error ? error.message : "Choose a valid BytePlus export.", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="outline" className="mb-3">Local-first workspace</Badge>
            <h1 className="text-2xl font-bold tracking-tight">Production Drafts</h1>
            <p className="mt-1 text-sm text-muted-foreground">Projects autosave on this device and remain editable while media APIs are offline.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import BytePlus project JSON" onChange={e => {
              const file = e.target.files?.[0];
              if (file) { setPendingFile(file); setDialog("import"); }
              e.currentTarget.value = "";
            }} />
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => fileRef.current?.click()}><FileUp className="h-4 w-4" /> Import</Button>
            <Button variant="outline" className="min-h-11 gap-2" onClick={workspace.exportWorkspace}><Download className="h-4 w-4" /> Export all</Button>
            <Button variant="cinematic" className="min-h-11 gap-2" onClick={() => { setName("Untitled Production"); setDialog("create"); }}><FolderPlus className="h-4 w-4" /> New project</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspace.projects.map(project => (
            <Card key={project.id} className="overflow-hidden border-border/60 bg-card/60">
              <button onClick={() => openProject(project.id)} className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <div className="relative aspect-video overflow-hidden border-b border-border/50 bg-black/50 p-5">
                  <div className="absolute inset-0 cinematic-grid opacity-40" />
                  <div className="relative flex h-full items-end gap-2">
                    {project.shots.slice(0, 5).map((shot, index) => (
                      <div key={shot.id} className="flex-1 rounded-sm border border-primary/20 bg-primary/10" style={{ height: `${42 + (index % 3) * 18}%` }}>
                        <span className="sr-only">Shot {index + 1}: {shot.type}</span>
                      </div>
                    ))}
                    {project.shots.length === 0 && <Clapperboard className="m-auto h-12 w-12 text-muted-foreground/30" />}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold group-hover:text-primary">{project.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{project.shots.length} shots · Updated {formatDistanceToNow(project.updatedAt, { addSuffix: true })}</p>
                    </div>
                    {project.id === workspace.activeProjectId && <Badge>Open</Badge>}
                  </div>
                </div>
              </button>
              <div className="flex items-center justify-between border-t border-border/40 px-4 py-2">
                <Button variant="ghost" size="sm" onClick={() => workspace.exportProject(project.id)} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`More actions for ${project.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setTargetId(project.id); setName(project.name); setDialog("rename"); }}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => workspace.duplicateProject(project.id)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                    <DropdownMenuItem disabled={workspace.projects.length === 1} onClick={() => {
                      if (window.confirm(`Delete “${project.name}” and its linked offline plans? This cannot be undone.`)) workspace.deleteProject(project.id);
                    }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={dialog === "create" || dialog === "rename"} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>{dialog === "create" ? "Create project" : "Rename project"}</DialogTitle></DialogHeader>
          <label htmlFor="project-name" className="text-sm font-medium">Project name</label>
          <Input id="project-name" value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && submitName()} />
          <DialogFooter><Button variant="cinematic" onClick={submitName} disabled={!name.trim()}>Save project</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "import"} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader><DialogTitle>Import production workspace</DialogTitle></DialogHeader>
          <div className="rounded-md border border-border bg-black/30 p-4">
            <p className="font-medium">{pendingFile?.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">Only versioned BytePlus JSON is accepted. Media files are not included.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => importFile("replace")}>Replace workspace</Button>
            <Button variant="cinematic" onClick={() => importFile("merge")}>Merge projects</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
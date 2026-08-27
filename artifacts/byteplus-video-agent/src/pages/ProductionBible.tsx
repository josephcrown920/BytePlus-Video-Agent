import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/lib/store";
import { BookOpen, User, Image as ImageIcon, Map, Tag, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export default function ProductionBible() {
  const { characters, addCharacter } = useWorkspace();
  const [newCharName, setNewCharName] = useState("");
  const [newCharDesc, setNewCharDesc] = useState("");
  const [newCharTags, setNewCharTags] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAdd = () => {
    if (newCharName) {
      addCharacter({
        name: newCharName,
        description: newCharDesc,
        tags: newCharTags.split(',').map(t => t.trim()).filter(Boolean)
      });
      setDialogOpen(false);
      setNewCharName("");
      setNewCharDesc("");
      setNewCharTags("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border bg-card/30 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-0">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-semibold tracking-tight text-lg">Production Bible</h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">Maintain narrative and visual continuity</p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="cinematic" size="sm" className="w-full md:w-auto gap-2">
              <Plus className="w-4 h-4" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="border-primary/20 bg-card/95 backdrop-blur-xl w-[95vw] md:max-w-lg max-h-[90vh] overflow-y-auto rounded-lg">
            <DialogHeader>
              <DialogTitle>Add to Production Bible</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Name / Title</label>
                <Input value={newCharName} onChange={e => setNewCharName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Description & Traits</label>
                <Textarea value={newCharDesc} onChange={e => setNewCharDesc(e.target.value)} className="resize-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Tags (comma separated)</label>
                <Input value={newCharTags} onChange={e => setNewCharTags(e.target.value)} placeholder="protagonist, cyberpunk, hero" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} variant="cinematic" className="w-full sm:w-auto">Save Entry</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <section>
            <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Character Database
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map(char => (
                <Card key={char.id} className="bg-card/50 border-border/50 overflow-hidden hover:border-primary/30 transition-colors">
                  <div className="aspect-square w-full bg-black/50 border-b border-border/50 flex items-center justify-center relative group">
                    <User className="w-12 h-12 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" className="w-6 h-6 h-auto p-1 rounded-sm"><ImageIcon className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{char.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{char.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {char.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[9px] uppercase font-mono">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="opacity-50 pointer-events-none">
            <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Map className="w-4 h-4" /> Locations & Sets
            </h2>
            <div className="p-8 border border-dashed border-border/50 rounded-md text-center bg-black/20">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">No locations defined</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
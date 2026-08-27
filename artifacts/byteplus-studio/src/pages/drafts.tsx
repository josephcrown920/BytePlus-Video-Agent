import React, { useMemo, useState } from 'react';
import { BookmarkPlus, Search, Trash2 } from 'lucide-react';
import { useStudio } from '@/lib/store';

const statusStyle = {
  concept: 'border-amber-400/30 bg-amber-300/10 text-amber-200',
  approved: 'border-primary/30 bg-primary/10 text-primary',
  'in-progress': 'border-violet-400/30 bg-violet-300/10 text-violet-200',
};

export default function Drafts() {
  const { drafts, saveDraft, deleteDraft, activePrompt, shots } = useStudio();
  const [query, setQuery] = useState('');

  const visibleDrafts = useMemo(
    () => drafts.filter((draft) =>
      `${draft.title} ${draft.prompt}`.toLowerCase().includes(query.trim().toLowerCase()),
    ),
    [drafts, query],
  );

  const saveDirectorDraft = () => {
    saveDraft({
      title: activePrompt.slice(0, 34).trim() || 'Untitled direction',
      prompt: activePrompt,
      imageUrl: shots[0]?.imageUrl ?? '',
      status: 'concept',
    });
  };

  return (
    <div className="min-h-full bg-background p-5 md:p-6 lg:p-8">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs tracking-[0.18em] text-primary">FRAME VAULT</p>
          <h1 className="text-3xl font-semibold tracking-tight">Drafts, seen first.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Keep direction in view as you compare, select, and carry the strongest frames into a sequence.</p>
        </div>
        <button
          type="button"
          onClick={saveDirectorDraft}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_18px_rgba(0,229,255,0.25)] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <BookmarkPlus className="h-4 w-4" />
          Save current direction
        </button>
      </header>

      <div className="relative mb-7 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a direction..."
          aria-label="Search drafts"
          className="w-full rounded-md border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {visibleDrafts.length ? (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleDrafts.map((draft) => (
            <article key={draft.id} className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_12px_30px_rgba(0,229,255,0.08)]">
              <div className="relative aspect-[16/10] overflow-hidden bg-sidebar">
                {draft.imageUrl ? <img src={draft.imageUrl} alt={`Draft frame: ${draft.title}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <span className={`absolute left-3 top-3 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${statusStyle[draft.status]}`}>{draft.status}</span>
                <p className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-wider text-white/70">{draft.updatedAt}</p>
              </div>
              <div className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold">{draft.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{draft.prompt}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDraft(draft.id)}
                  aria-label={`Delete ${draft.title}`}
                  className="rounded p-2 text-muted-foreground opacity-100 transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <BookmarkPlus className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="font-semibold">No matching frames</h2>
          <p className="mt-1 text-sm text-muted-foreground">Save the frame you want to revisit from Studio.</p>
        </div>
      )}
    </div>
  );
}
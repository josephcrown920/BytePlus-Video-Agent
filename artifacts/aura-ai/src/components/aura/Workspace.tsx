import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowUp,
  Bookmark,
  Clock,
  Code2,
  ImageIcon,
  LayoutGrid,
  Paperclip,
  Plus,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { timeAgo, useDrafts } from "@/lib/drafts";
import { useTypewriter } from "./useTypewriter";

const DEMO_PHRASES = [
  "A neon-drenched Tokyo alley at 3am, shot on 35mm…",
  "Refactor my checkout flow into a state machine…",
  "Brand kit for an orbital coffee company…",
  "Explain diffusion models like I'm a designer…",
];

const QUICK_ACTIONS = [
  {
    icon: Sparkles,
    label: "Imagine",
    description: "Describe a hyper-real visual",
    prompt: "Describe, in cinematic detail, a hyper-real visual concept for a neon city at dusk.",
  },
  {
    icon: Code2,
    label: "Architect",
    description: "Review and write complex logic",
    prompt: "Design a resilient streaming architecture for a realtime AI chat product.",
  },
];

export function Workspace() {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [greeting, setGreeting] = useState("Good evening");
  const [files, setFiles] = useState<FileList | undefined>();
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, stop, error } = useChat({ transport });
  const { drafts, saveDraft, removeDraft, clearDrafts } = useDrafts();
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isBusy = status === "submitted" || status === "streaming";
  const typed = useTypewriter(DEMO_PHRASES, !isFocused && input.length === 0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed && !files) return;
    if (isBusy) return;
    saveDraft(trimmed);
    void sendMessage({ text: trimmed, files });
    setInput("");
    setFiles(undefined);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
      <header className="animate-fade-in flex items-center justify-between pt-6 pb-4 sm:pt-8 sm:pb-6">
        <div className="flex items-center gap-3">
          <div className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-fuchsia-500 shadow-lg shadow-primary/20">
            <Zap className="size-4 fill-white text-white" />
            <div className="absolute -inset-1 rounded-full bg-primary/20 blur-md" />
          </div>
          <span className="text-base font-semibold tracking-tight">Aura AI</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setInput("")}
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-surface/50 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-surface hover:text-foreground sm:flex"
          >
            <Plus className="size-3.5" />
            New prompt
          </button>
          <button className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-surface/50 backdrop-blur-sm transition-colors hover:bg-surface">
            <LayoutGrid className="size-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-64 pt-2 sm:pb-56 sm:pt-6">
        {messages.length === 0 ? (
          <>
            <section className="animate-fade-in-up delay-100 mb-8 sm:mb-12">
              <h2 className="text-balance text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl">
                {greeting},
                <br />
                <span className="text-muted-foreground">what shall we create?</span>
              </h2>
            </section>

            <section className="animate-fade-in-up delay-200 mb-8 sm:mb-10">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => submit(action.prompt)}
                    className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-white/5 bg-surface p-5 text-left transition-all duration-300 hover:border-primary/20 hover:bg-surface-elevated hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <action.icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold">{action.label}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="space-y-6">
            {messages.map((message) => {
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");
              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                      {text}
                    </div>
                  </div>
                );
              }
              return (
                <div key={message.id} className="flex gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-fuchsia-500">
                    <Zap className="size-3.5 fill-white text-white" />
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none flex-1 text-sm leading-relaxed text-foreground">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
            {status === "submitted" && (
              <p className="animate-pulse-soft pl-10 text-sm text-muted-foreground">Thinking…</p>
            )}
            {error && (
              <p className="text-sm text-destructive">
                {error.message || "Something went wrong while generating. Try again."}
              </p>
            )}
            <div ref={endRef} />
          </section>
        )}

        <section className="animate-fade-in-up delay-300 mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Saved Drafts
            </h2>
            {drafts.length > 0 && (
              <button
                onClick={clearDrafts}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>

          {drafts.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-6 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              Prompts you send are saved here and survive a reload.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-surface p-4 transition-colors hover:border-white/10 hover:bg-surface-elevated"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-elevated ring-1 ring-white/5">
                    <Bookmark className="size-4 text-muted-foreground" />
                  </div>
                  <button
                    onClick={() => setInput(draft.prompt)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium">{draft.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {timeAgo(draft.createdAt)}
                    </p>
                  </button>
                  <button
                    aria-label="Delete draft"
                    onClick={() => removeDraft(draft.id)}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-background via-background/90 to-transparent px-4 pb-6 pt-12 sm:pb-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="relative">
            <div
              className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/60 to-fuchsia-500/60 blur-md transition-opacity duration-500 ${
                isFocused ? "opacity-40" : "opacity-20"
              }`}
            />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface/95 shadow-2xl backdrop-blur-xl">
              {files && files.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-3 py-2 sm:px-4">
                  {Array.from(files).map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface/80 px-2 py-1.5"
                    >
                      {file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="size-8 rounded-md object-cover"
                        />
                      ) : (
                        <Paperclip className="size-3.5" />
                      )}
                      <span className="max-w-[120px] truncate text-xs">{file.name}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setFiles(undefined);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="ml-1 text-foreground hover:text-destructive"
                    aria-label="Remove attachments"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(input);
                }}
                className="flex items-end gap-2 p-3 sm:p-4"
              >
                <button
                  type="button"
                  aria-label="Add photo or file"
                  onClick={() => fileRef.current?.click()}
                  className="flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground sm:size-10"
                  title="Add photo or file"
                >
                  <ImageIcon className="size-4" />
                  <span className="hidden text-xs font-medium sm:inline">Add photo</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  hidden
                  onChange={(e) => setFiles(e.target.files ?? undefined)}
                />
                <div className="relative flex-1">
                  {input.length === 0 && (
                    <span
                      aria-hidden
                      className="caret pointer-events-none absolute inset-0 truncate text-sm leading-relaxed text-muted-foreground sm:text-base"
                    >
                      {isFocused || typed ? typed : "Describe what you want to create…"}
                    </span>
                  )}
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submit(input);
                      }
                    }}
                    rows={1}
                    aria-label="Prompt"
                    className="relative w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-foreground focus:outline-none focus:ring-0 sm:text-base"
                    style={{ minHeight: "24px", maxHeight: "120px" }}
                    onInput={(e) => {
                      const target = e.currentTarget;
                      target.style.height = "auto";
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                  />
                </div>
                {isBusy ? (
                  <button
                    type="button"
                    onClick={() => stop()}
                    aria-label="Stop generating"
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-foreground transition-colors hover:bg-white/20 sm:size-10"
                  >
                    <Square className="size-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label="Send prompt"
                    disabled={!input.trim() && !files}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 sm:size-10 ${
                      input.trim() || files
                        ? "bg-white text-black shadow-lg shadow-white/10 hover:bg-white/90"
                        : "bg-white/10 text-muted-foreground"
                    }`}
                  >
                    <ArrowUp className="size-4 sm:size-5" />
                  </button>
                )}
              </form>

              <div className="flex items-center justify-between border-t border-white/5 px-3 py-2 sm:px-4">
                <span className="text-[10px] text-muted-foreground">
                  Enter to send · Shift+Enter for a new line
                </span>
                <div className="flex items-center gap-2">
                  <span className="hidden text-[10px] text-muted-foreground sm:inline">
                    Aura-1 Pro
                  </span>
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground/60 sm:text-xs">
            Aura can make mistakes. Verify critical output before shipping.
          </p>
        </div>
      </div>
    </div>
  );
}

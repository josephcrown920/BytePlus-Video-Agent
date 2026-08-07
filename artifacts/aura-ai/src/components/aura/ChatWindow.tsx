import { useChat } from "@ai-sdk/react";
import { useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  Brain,
  Clapperboard,
  Code2,
  Film,
  ImageIcon,
  Menu,
  MessageSquare,
  Paperclip,
  Search,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  createThread,
  deleteThread,
  forgetMemory,
  listMemories,
  listThreads,
  type ThreadSummary,
} from "@/lib/threads";
import { ThreadSidebar } from "./ThreadSidebar";
import { ToolActivity } from "./ToolActivity";
import { ScriptCard } from "./ScriptCard";
import { CaptionsCard } from "./CaptionsCard";
import { StoryboardCard } from "./StoryboardCard";
import { useTypewriter } from "./useTypewriter";

const DEMO_PHRASES = [
  "Search the web for the best AI design tools right now…",
  "Generate a neon-drenched Tokyo alley at 3am, 35mm…",
  "Read this URL and summarise the pricing model…",
  "Remember that I always ship with Tailwind and TanStack…",
];

const QUICK_ACTIONS = [
  {
    icon: Search,
    label: "Research",
    description: "Search the live web and cite sources",
    prompt:
      "Research the three most interesting AI product launches from the last month. Search the web, read the best sources and summarise with links.",
  },
  {
    icon: ImageIcon,
    label: "Imagine",
    description: "Generate a hyper-real visual",
    prompt:
      "Generate a hyper-real cinematic image of a neon-soaked city street at dusk, shot on 35mm film.",
  },
  {
    icon: Clapperboard,
    label: "Script",
    description: "Write a video or ad script",
    prompt:
      "Write a 30-second ad script for a premium AI productivity app targeting founders and designers.",
  },
  {
    icon: MessageSquare,
    label: "Captions",
    description: "Platform-optimised social copy",
    prompt:
      "Generate TikTok, Instagram and LinkedIn captions for launching a new AI design tool.",
  },
  {
    icon: Film,
    label: "Storyboard",
    description: "Visual breakdown with reference frames",
    prompt:
      "Create a 3-scene storyboard for a product launch video: a minimalist AI SaaS tool that helps designers ship faster.",
  },
  {
    icon: Brain,
    label: "Remember",
    description: "Teach the agent about you",
    prompt: "Remember that I'm a founder building premium AI products with TanStack and Tailwind.",
  },
];

type Props = {
  threadId: string;
  initialMessages: UIMessage[];
  initialThreads: ThreadSummary[];
};

export function ChatWindow({ threadId, initialMessages, initialThreads }: Props) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [threads, setThreads] = useState<ThreadSummary[]>(initialThreads);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memories, setMemories] = useState<{ id: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [files, setFiles] = useState<FileList | undefined>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, options) => {
          const { data } = await supabase.auth.getSession();
          const headers = new Headers(options?.headers);
          if (data.session?.access_token) {
            headers.set("Authorization", `Bearer ${data.session.access_token}`);
          }
          return fetch(url, { ...options, headers });
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "Generation failed"),
  });

  const isBusy = status === "submitted" || status === "streaming";
  const typed = useTypewriter(DEMO_PHRASES, !isFocused && input.length === 0);

  const refreshThreads = useCallback(async () => {
    try {
      setThreads(await listThreads());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    if (status === "ready") {
      inputRef.current?.focus();
      void refreshThreads();
    }
  }, [status, refreshThreads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function submit(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !files) || isBusy) return;
    void sendMessage({ text: trimmed, files });
    setInput("");
    setFiles(undefined);
    if (fileRef.current) fileRef.current.value = "";
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function handleNewThread() {
    try {
      const thread = await createThread();
      setThreads((prev) => [thread, ...prev]);
      setSidebarOpen(false);
      void navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDeleteThread(id: string) {
    try {
      await deleteThread(id);
      const remaining = threads.filter((t) => t.id !== id);
      setThreads(remaining);
      if (id === threadId) {
        if (remaining[0]) {
          void navigate({ to: "/chat/$threadId", params: { threadId: remaining[0].id } });
        } else {
          await handleNewThread();
        }
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function openMemory() {
    setMemoryOpen(true);
    try {
      const rows = await listMemories();
      setMemories(rows.map((row) => ({ id: row.id, content: row.content })));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(139,92,246,0.16),transparent_60%)]" />
        <div className="absolute inset-0 bg-noise opacity-[0.025]" />
      </div>

      <ThreadSidebar
        threads={threads}
        activeId={threadId}
        open={sidebarOpen}
        email={user?.email ?? undefined}
        onClose={() => setSidebarOpen(false)}
        onNew={handleNewThread}
        onDelete={handleDeleteThread}
        onOpenMemory={openMemory}
        onSignOut={() => {
          void signOut().then(() => navigate({ to: "/auth" }));
        }}
      />

      <div className="relative z-10 lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-background/70 px-4 py-3 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Show conversations"
            className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-surface/60 lg:hidden"
          >
            <Menu className="size-4" />
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Aura-1 Pro · search, browse, images, memory
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 pb-64 pt-6 sm:px-6">
          {messages.length === 0 ? (
            <>
              <h1 className="animate-fade-in-up text-balance text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
                What should I take on?
                <br />
                <span className="text-muted-foreground">
                  I can search, browse, calculate, create images and remember what matters.
                </span>
              </h1>
              <div className="animate-fade-in-up delay-200 mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => submit(action.prompt)}
                    className="group flex items-start gap-4 rounded-2xl border border-white/5 bg-surface p-5 text-left transition-all duration-300 hover:border-primary/20 hover:bg-surface-elevated hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <action.icon className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">{action.label}</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <section className="space-y-6">
              {messages.map((message) => {
                if (message.role === "user") {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] space-y-2 rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                        {message.parts.map((part, index) => {
                          if (part.type === "text") return <p key={index}>{part.text}</p>;
                          if (part.type === "file" && part.mediaType?.startsWith("image/")) {
                            return (
                              <img
                                key={index}
                                src={part.url}
                                alt={part.filename ?? "Attachment"}
                                className="max-w-full rounded-xl"
                              />
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={message.id} className="flex gap-3">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-fuchsia-500">
                      <Zap className="size-3.5 fill-white text-white" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      {message.parts.map((part, index) => {
                        if (part.type === "text") {
                          return (
                            <div
                              key={index}
                              className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed"
                            >
                              <ReactMarkdown>{part.text}</ReactMarkdown>
                            </div>
                          );
                        }
                        if (part.type === "reasoning" && part.text) {
                          return (
                            <p key={index} className="text-xs italic text-muted-foreground">
                              {part.text}
                            </p>
                          );
                        }
                        if (part.type.startsWith("tool-")) {
                          const toolPart = part as unknown as {
                            type: string;
                            state: string;
                            toolName?: string;
                            input?: unknown;
                            output?: unknown;
                          };
                          const rawName = toolPart.type.replace(/^tool-/, "");
                          const toolName = toolPart.toolName ?? rawName;
                          const hasOutput = toolPart.state === "output-available";

                          // Resolve live progress label for video generation while it is running
                          let videoProgress: string | undefined;
                          if (toolName === "generate_video" && !hasOutput) {
                            // Scan message parts (in reverse) for the latest transient progress annotation
                            for (let j = message.parts.length - 1; j >= 0; j--) {
                              const p = message.parts[j] as { type?: string; data?: { label?: string } };
                              if (p.type === "data-video_progress" && p.data?.label) {
                                videoProgress = p.data.label;
                                break;
                              }
                            }
                          }

                          // Structured cards for content creation tools
                          if (hasOutput && toolName === "generate_script") {
                            return (
                              <div key={index} className="space-y-2">
                                <ToolActivity
                                  name={toolName}
                                  state={toolPart.state}
                                  input={toolPart.input}
                                  output={toolPart.output}
                                />
                                <ScriptCard output={toolPart.output} />
                              </div>
                            );
                          }
                          if (hasOutput && toolName === "generate_captions") {
                            return (
                              <div key={index} className="space-y-2">
                                <ToolActivity
                                  name={toolName}
                                  state={toolPart.state}
                                  input={toolPart.input}
                                  output={toolPart.output}
                                />
                                <CaptionsCard output={toolPart.output} />
                              </div>
                            );
                          }
                          if (hasOutput && toolName === "storyboard") {
                            return (
                              <div key={index} className="space-y-2">
                                <ToolActivity
                                  name={toolName}
                                  state={toolPart.state}
                                  input={toolPart.input}
                                  output={toolPart.output}
                                />
                                <StoryboardCard output={toolPart.output} />
                              </div>
                            );
                          }

                          return (
                            <ToolActivity
                              key={index}
                              name={toolName}
                              state={toolPart.state}
                              input={toolPart.input}
                              output={toolPart.output}
                              progress={videoProgress}
                            />
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                );
              })}
              {status === "submitted" && (
                <p className="animate-pulse-soft pl-10 text-sm text-muted-foreground">Thinking…</p>
              )}
              {error && (
                <p className="text-sm text-destructive">
                  {error.message || "Something went wrong while generating."}
                </p>
              )}
              <div ref={endRef} />
            </section>
          )}
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-background via-background/90 to-transparent px-4 pb-6 pt-12 lg:pl-72">
          <div className="mx-auto w-full max-w-2xl">
            {files && files.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                    <span className="max-w-[120px] truncate">{file.name}</span>
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
            <div className="relative">
              <div
                className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/60 to-fuchsia-500/60 blur-md transition-opacity duration-500 ${
                  isFocused ? "opacity-40" : "opacity-20"
                }`}
              />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface/95 shadow-2xl backdrop-blur-xl">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
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
                    onChange={(event) => setFiles(event.target.files ?? undefined)}
                  />
                  <div className="relative min-w-0 flex-1">
                    {input.length === 0 && (
                      <span
                        aria-hidden
                        className="caret pointer-events-none absolute inset-0 truncate text-sm leading-relaxed text-muted-foreground sm:text-base"
                      >
                        {isFocused || typed ? typed : "Ask Aura anything…"}
                      </span>
                    )}
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          submit(input);
                        }
                      }}
                      rows={1}
                      aria-label="Message Aura"
                      className="relative w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-foreground focus:outline-none focus:ring-0 sm:text-base"
                      style={{ minHeight: "24px", maxHeight: "120px" }}
                      onInput={(event) => {
                        const target = event.currentTarget;
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
                      aria-label="Send message"
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
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Sparkles className="size-3" />
                    Tools enabled
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] text-muted-foreground/60 sm:text-xs">
              Aura can make mistakes. Verify critical output before shipping.
            </p>
          </div>
        </div>
      </div>

      {memoryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Brain className="size-4 text-primary" />
                Agent memory
              </h2>
              <button onClick={() => setMemoryOpen(false)} aria-label="Close memory">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            {memories.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nothing remembered yet. Tell Aura to remember something and it will persist across
                every conversation.
              </p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {memories.map((memory) => (
                  <li
                    key={memory.id}
                    className="flex items-start gap-3 rounded-xl border border-white/5 bg-surface-elevated p-3 text-xs"
                  >
                    <span className="flex-1">{memory.content}</span>
                    <button
                      aria-label="Forget this"
                      onClick={async () => {
                        await forgetMemory(memory.id);
                        setMemories((prev) => prev.filter((m) => m.id !== memory.id));
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

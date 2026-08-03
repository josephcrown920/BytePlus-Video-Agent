import { createFileRoute, notFound } from "@tanstack/react-router";
import type { UIMessage } from "ai";

import { ChatWindow } from "@/components/aura/ChatWindow";
import { getThread, listThreads } from "@/lib/threads";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  loader: async ({ params }) => {
    const [result, threads] = await Promise.all([
      getThread(params.threadId),
      listThreads(),
    ]);
    if (!result) throw notFound();
    return { thread: result.thread, messages: result.messages, threads };
  },
  component: ThreadPage,
});

function ThreadPage() {
  const { thread, messages, threads } = Route.useLoaderData();
  return (
    <ChatWindow
      key={thread.id}
      threadId={thread.id}
      initialMessages={messages as unknown as UIMessage[]}
      initialThreads={threads}
    />
  );
}

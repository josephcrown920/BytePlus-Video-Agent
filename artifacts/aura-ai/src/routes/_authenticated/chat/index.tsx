import { createFileRoute, redirect } from "@tanstack/react-router";

import { createThread, listThreads } from "@/lib/threads";

export const Route = createFileRoute("/_authenticated/chat/")({
  loader: async () => {
    const threads = await listThreads();
    const target = threads[0] ?? (await createThread());
    throw redirect({ to: "/chat/$threadId", params: { threadId: target.id } });
  },
});

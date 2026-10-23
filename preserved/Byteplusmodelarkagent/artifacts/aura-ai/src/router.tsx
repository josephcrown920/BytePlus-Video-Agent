import { createRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

export const queryClient = new QueryClient();

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
});

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

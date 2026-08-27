import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { WorkspaceProvider } from "@/lib/store";
import { Shell } from "@/components/layout/Shell";

import StudioOverview from "@/pages/StudioOverview";
import ImageGenerator from "@/pages/ImageGenerator";
import VideoGenerator from "@/pages/VideoGenerator";
import MultiShot from "@/pages/MultiShot";
import ProductionBible from "@/pages/ProductionBible";
import Pipeline from "@/pages/Pipeline";
import Drafts from "@/pages/Drafts";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={StudioOverview} />
        <Route path="/image-generator" component={ImageGenerator} />
        <Route path="/video-generator" component={VideoGenerator} />
        <Route path="/multi-shot" component={MultiShot} />
        <Route path="/bible" component={ProductionBible} />
        <Route path="/pipeline" component={Pipeline} />
        <Route path="/drafts" component={Drafts} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}

export default App;
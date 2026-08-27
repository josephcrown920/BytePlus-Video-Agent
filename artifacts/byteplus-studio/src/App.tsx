import React, { useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { StudioProvider } from '@/lib/store';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

import Studio from '@/pages/studio';
import Sequence from '@/pages/sequence';
import Drafts from '@/pages/drafts';
import Bible from '@/pages/bible';
import Queue from '@/pages/queue';
import Pipeline from '@/pages/pipeline';

function App() {
  return (
    <StudioProvider>
      <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}>
        <PageMetadata />
        <AppLayout>
          <Switch>
            <Route path="/" component={Studio} />
            <Route path="/sequence" component={Sequence} />
            <Route path="/drafts" component={Drafts} />
            <Route path="/bible" component={Bible} />
            <Route path="/queue" component={Queue} />
            <Route path="/pipeline" component={Pipeline} />
            
            {/* Fallback */}
            <Route>
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <h2 className="text-2xl font-mono mb-2">404_NOT_FOUND</h2>
                  <p>The requested module does not exist in the current workspace.</p>
                </div>
              </div>
            </Route>
          </Switch>
        </AppLayout>
      </WouterRouter>
    </StudioProvider>
  );
}

function PageMetadata() {
  const [location] = useLocation();
  const labels: Record<string, string> = {
    '/': 'Studio',
    '/sequence': 'Sequence',
    '/drafts': 'Drafts',
    '/bible': 'Production Bible',
    '/queue': 'Render Queue',
    '/pipeline': 'Build Pipeline',
  };
  const label = labels[location] ?? 'Studio';

  useEffect(() => {
    document.title = `${label} · BytePlus Video Agent`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        'BytePlus Video Agent is a visual-first cinematic production workspace for concepts, sequences, continuity, and render delivery.',
      );
  }, [label]);

  return null;
}

export default App;

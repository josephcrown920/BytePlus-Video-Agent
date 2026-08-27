import React from 'react';
import { Play, ArrowRight, Video, FileAudio, Layers, Save } from 'lucide-react';

export default function Pipeline() {
  return (
    <div className="h-full flex flex-col bg-background p-6 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Build Pipeline</h1>
        <p className="text-muted-foreground text-sm">Automated workflow configuration for final composite and export.</p>
      </div>

      {/* Visual Pipeline Representation */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-12 bg-card border border-border rounded-xl p-8 cinematic-shadow relative overflow-hidden">
        <div className="scanline opacity-50" />
        
        {/* Node 1 */}
        <div className="flex-1 flex flex-col items-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-sidebar border-2 border-primary/50 flex items-center justify-center text-primary mb-3 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <Layers className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm">Sequence Assembly</span>
          <span className="text-[10px] font-mono text-muted-foreground mt-1">3 Shots • 13s</span>
        </div>

        <ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block relative z-10" />

        {/* Node 2 */}
        <div className="flex-1 flex flex-col items-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-sidebar border border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer mb-3">
            <FileAudio className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm">Audio Synthesis</span>
          <span className="text-[10px] font-mono text-muted-foreground mt-1">SFX + Score (Optional)</span>
        </div>

        <ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block relative z-10" />

        {/* Node 3 */}
        <div className="flex-1 flex flex-col items-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-sidebar border border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer mb-3">
            <Video className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm">Final Render</span>
          <span className="text-[10px] font-mono text-muted-foreground mt-1">ProRes 422 • 4K</span>
        </div>

        {/* Connecting line for mobile */}
        <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-border md:hidden z-0" />
      </div>

      {/* Export Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <SettingsIcon /> Output Configuration
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Format</label>
                <select className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary">
                  <option>ProRes 422 (HQ)</option>
                  <option>H.264 (MP4)</option>
                  <option>H.265 (HEVC)</option>
                  <option>EXR Sequence</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Resolution</label>
                <select className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary">
                  <option>3840 x 2160 (4K UHD)</option>
                  <option>1920 x 1080 (HD)</option>
                  <option>4096 x 2160 (DCI 4K)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-medium mb-2 text-lg">Ready to Build</h3>
            <p className="text-sm text-muted-foreground mb-4">Estimated cloud compute time: ~2m 30s. Credits required: 15.</p>
            
            <div className="p-3 bg-background rounded border border-border font-mono text-xs text-muted-foreground space-y-1 mb-6">
              <div className="flex justify-between"><span>Inputs:</span> <span className="text-foreground">3 Video, 0 Audio</span></div>
              <div className="flex justify-between"><span>Total Frames:</span> <span className="text-foreground">312 (24fps)</span></div>
              <div className="flex justify-between"><span>Target:</span> <span className="text-foreground">S3/Project-Omega</span></div>
            </div>
          </div>

          <button className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-md shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all flex items-center justify-center gap-2">
            <Play className="w-4 h-4 fill-current" />
            Initialize Build
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

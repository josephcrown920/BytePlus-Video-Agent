import React, { useMemo, useState } from 'react';
import { useStudio, BibleAsset } from '@/lib/store';
import { Search, Plus, Filter } from 'lucide-react';

const TABS: { key: 'all' | BibleAsset['type']; label: string }[] = [
  { key: 'all', label: 'All Assets' },
  { key: 'character', label: 'Characters' },
  { key: 'style', label: 'Styles' },
  { key: 'location', label: 'Locations' },
];

export default function Bible() {
  const { bibleAssets } = useStudio();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('all');
  const [query, setQuery] = useState('');

  const visibleAssets = useMemo(
    () => bibleAssets.filter((asset) => {
      const matchesTab = activeTab === 'all' || asset.type === activeTab;
      const matchesQuery = `${asset.name} ${asset.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase());
      return matchesTab && matchesQuery;
    }),
    [bibleAssets, activeTab, query],
  );

  return (
    <div className="h-full flex flex-col bg-background p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Production Bible</h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Central repository for consistent characters, locations, and artistic styles across your project.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search assets..." 
              aria-label="Search bible assets"
              className="bg-card border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-64"
            />
          </div>
          <button type="button" aria-label="Filter assets" className="p-2 bg-card border border-border rounded-md hover:bg-sidebar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
            <Filter className="w-4 h-4" />
          </button>
          <button type="button" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
            <Plus className="w-4 h-4" />
            New Asset
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-border pb-px" role="tablist" aria-label="Bible asset categories">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visibleAssets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground text-sm">No assets in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleAssets.map((asset) => (
            <div key={asset.id} className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,229,255,0.1)]">
              <div className="aspect-[4/5] overflow-hidden relative">
                <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider text-primary border border-primary/20">
                  {asset.type}
                </div>
              </div>
              
              <div className="absolute bottom-0 w-full p-4 transform transition-transform">
                <h3 className="font-semibold text-lg mb-1">{asset.name}</h3>
                <div className="flex gap-2">
                  {asset.tags.map(tag => (
                    <span key={tag} className="text-xs bg-sidebar border border-border px-2 py-0.5 rounded text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Placeholder for new asset creation visual */}
          <div className="relative bg-card/30 border border-dashed border-border rounded-xl overflow-hidden hover:bg-card/50 hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-muted-foreground hover:text-primary aspect-[4/5] group">
            <div className="w-16 h-16 rounded-full bg-background border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-primary/50 transition-all">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-medium">Train New Concept</span>
            <span className="text-xs font-mono mt-2 opacity-50">Requires 5-10 reference images</span>
          </div>
        </div>
      )}
    </div>
  );
}

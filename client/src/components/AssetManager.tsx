
import React, { useState, useRef } from 'react';
import { Asset, SeoConfig } from '../types';
import { GlassPane } from './GlassPane';
import { TextareaWithCount } from './ui/textarea-with-count';

interface AssetManagerProps {
  assets: Asset[];
  seoConfig: SeoConfig;
  onAssetsUpdate: (assets: Asset[]) => void;
  onSeoUpdate: (config: SeoConfig) => void;
}

export const AssetManager: React.FC<AssetManagerProps> = ({ assets, seoConfig, onAssetsUpdate, onSeoUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Simulate upload and optimization
      const tempId = crypto.randomUUID();
      const newAsset: Asset = {
        id: tempId,
        originalName: file.name,
        optimizedName: 'processing...',
        url: URL.createObjectURL(file),
        altText: 'Generating AI description...',
        contextTag: 'UNKNOWN',
        status: 'optimizing'
      };

      onAssetsUpdate([...assets, newAsset]);

      // Simulate AI Processing delay
      setTimeout(() => {
        const updatedAssets = assets.map((a: Asset) => {
          if (a.id === tempId) {
            // Generate fake SEO friendly name based on "Client Context" simulation
            const optimizedName = file.name.toLowerCase().replace(/ /g, '-').replace('img', 'service-photo').replace('dsc', 'client-result');
            return {
              ...a,
              optimizedName: optimizedName,
              altText: 'Professional service team performing high quality work in daylight',
              contextTag: 'HERO' as const,
              status: 'ready' as const
            };
          }
          return a;
        });
        onAssetsUpdate(updatedAssets);
      }, 2500);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* SEO Configuration Panel */}
      <GlassPane title="SEO Strategy Engine">
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Global Page Title (H1 Context)</label>
            <input 
              type="text" 
              value={seoConfig.siteTitle}
              onChange={(e) => onSeoUpdate({...seoConfig, siteTitle: e.target.value})}
              className="w-full bg-white/50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              placeholder="e.g. Best Solar Roofing in Denver | SolarSol"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Meta Description</label>
            <TextareaWithCount
              value={seoConfig.metaDescription}
              onChange={(e) => onSeoUpdate({...seoConfig, metaDescription: e.target.value})}
              rows={2}
              maxLength={160}
              className="w-full bg-white/50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
              placeholder="Describe the value proposition for search engines..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Keywords</label>
            <div className="flex flex-wrap gap-2">
              {seoConfig.keywords.map((kw, idx) => (
                <span key={idx} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-xs border border-indigo-100 flex items-center gap-1">
                  {kw}
                  <button onClick={() => onSeoUpdate({...seoConfig, keywords: seoConfig.keywords.filter((_, i) => i !== idx)})} className="hover:text-indigo-800">×</button>
                </span>
              ))}
              <input 
                type="text"
                placeholder="+ Add tag"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      onSeoUpdate({...seoConfig, keywords: [...seoConfig.keywords, val]});
                      e.currentTarget.value = '';
                    }
                  }
                }}
                className="bg-transparent border-none text-xs focus:ring-0 p-1 w-20 placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </GlassPane>

      {/* Image/Asset Library */}
      <GlassPane title="Smart Asset Library" className="flex-1 min-h-0 flex flex-col" headerAction={
        <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          Upload
        </button>
      }>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
        
        <div className="p-3 overflow-y-auto grid grid-cols-2 gap-3 content-start">
          {assets.length === 0 && (
             <div className="col-span-2 py-8 text-center">
                <p className="text-slate-400 text-xs italic">No assets uploaded. Drag & drop or click Upload.</p>
             </div>
          )}

          {assets.map((asset) => (
            <div key={asset.id} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
               <div className="aspect-video bg-slate-100 relative">
                  <img src={asset.url} alt={asset.altText} className={`w-full h-full object-cover ${asset.status === 'optimizing' ? 'opacity-50 blur-sm' : ''}`} />
                  
                  {asset.status === 'optimizing' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  
                  {asset.status === 'ready' && (
                    <span className="absolute top-1 right-1 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      SEO OPTIMIZED
                    </span>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                     <p className="text-xs text-white font-mono truncate text-center">{asset.contextTag}</p>
                  </div>
               </div>
               <div className="p-2">
                  <p className="text-xs font-bold text-slate-700 truncate" title={asset.optimizedName}>{asset.optimizedName}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5" title={asset.altText}>Alt: {asset.altText}</p>
               </div>
            </div>
          ))}
        </div>
      </GlassPane>
    </div>
  );
};

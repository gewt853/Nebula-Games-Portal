import React, { useState } from 'react';
import { Play, ArrowLeft, Gamepad2, Info, ShieldCheck, Globe, List, ExternalLink } from 'lucide-react';
import gamesData from './data/games.json';
import proxiesData from './data/proxies.json';

export default function App() {
  const [activeItem, setActiveItem] = useState(null); // unified state for game or proxy
  const [activeTab, setActiveTab] = useState('games');

  const renderProxies = () => (
    <div className="flex-1 p-6 md:p-10 w-full max-w-6xl mx-auto overflow-y-auto">
      <div className="mb-10 border-b border-slate-800 pb-6 flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-none flex items-center justify-center font-bold text-white text-xl shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <ShieldCheck />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-200 mb-1 leading-none">
              SECURE<span className="text-indigo-500">PROXIES.</span>
            </h1>
            <p className="text-[10px] font-mono text-indigo-400 tracking-[0.2em] uppercase">
              {proxiesData.length} nodes available
            </p>
          </div>
        </div>
        <div className="hidden md:block">
          <Globe size={32} className="text-slate-700" />
        </div>
      </div>

      {proxiesData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {proxiesData.map((proxy) => (
            <div
              key={proxy.id}
              className="bg-slate-900 border border-slate-800 p-6 flex flex-col group transition-all hover:border-indigo-500/50 hover:bg-slate-800/50"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                  {proxy.name}
                </h2>
                <div className="px-2 py-1 bg-slate-950 text-[8px] font-mono text-emerald-400 border border-emerald-900/30 uppercase">
                  Online
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                {proxy.description}
              </p>
              <button
                onClick={() => setActiveItem({ ...proxy, type: 'proxy' })}
                className="mt-auto flex items-center justify-center gap-2 py-3 bg-indigo-600 text-[10px] text-white font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] cursor-pointer"
              >
                <Globe size={14} />
                Access Node (Internal)
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-slate-800 p-12 flex flex-col items-center justify-center text-center bg-slate-900/20">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 mb-6 border border-slate-800">
            <Globe size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-400 mb-2 uppercase tracking-tight">No Proxy Nodes Found</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            The proxy registry is currently empty. You can add your own custom proxy nodes by updating the <code className="text-indigo-400 px-1 font-mono">proxies.json</code> data file.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden">
      {/* Header marquee */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/50 flex items-center overflow-hidden shrink-0 z-50">
        <div className="marquee-track text-[10px] font-bold tracking-widest uppercase text-indigo-400">
          <span className="px-6">/// BRUTAL GAMES PORTAL ///</span>
          <span className="px-6 text-slate-500">UNBLOCKED & READY TO PLAY</span>
          <span className="px-6">/// NETWORK BYPASS ACTIVE ///</span>
          <span className="px-6 text-slate-500">STAY ANONYMOUS</span>
          <span className="px-6">/// BRUTAL GAMES PORTAL ///</span>
          <span className="px-6 text-slate-500">UNBLOCKED & READY TO PLAY</span>
          <span className="px-6">/// NETWORK BYPASS ACTIVE ///</span>
          <span className="px-6 text-slate-500">STAY ANONYMOUS</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <nav className="w-16 md:w-20 border-r border-slate-800 bg-slate-950 flex flex-col items-center py-8 shrink-0 z-40">
          <button
            onClick={() => { setActiveTab('games'); setActiveItem(null); }}
            className={`p-4 transition-all ${activeTab === 'games' ? 'text-indigo-500 scale-110 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'text-slate-600 hover:text-slate-400'}`}
            title="Games"
          >
            <Gamepad2 size={24} strokeWidth={activeTab === 'games' ? 3 : 2} />
          </button>
          <button
            onClick={() => { setActiveTab('proxies'); setActiveItem(null); }}
            className={`p-4 mt-4 transition-all ${activeTab === 'proxies' ? 'text-indigo-500 scale-110 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'text-slate-600 hover:text-slate-400'}`}
            title="Proxies"
          >
            <ShieldCheck size={24} strokeWidth={activeTab === 'proxies' ? 3 : 2} />
          </button>
        </nav>

        <main className="flex-1 flex overflow-hidden relative border-l border-slate-900">
          {!activeItem ? (
            activeTab === 'games' ? (
              <div className="flex-1 p-6 md:p-10 w-full max-w-6xl mx-auto overflow-y-auto">
                <div className="mb-10 border-b border-slate-800 pb-6 flex items-end justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-indigo-600 rounded-none flex items-center justify-center font-bold text-white text-xl shadow-[0_0_15px_rgba(79,70,229,0.4)]">G</div>
                     <div>
                      <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-200 mb-1 leading-none">
                        PLAY<span className="text-indigo-500">NOW.</span>
                      </h1>
                      <p className="text-[10px] font-mono text-indigo-400 tracking-[0.2em] uppercase">
                        {gamesData.length} games available
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <Gamepad2 size={32} className="text-slate-700" />
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
                  {gamesData.map((game, index) => (
                    <button
                      key={game.id}
                      onClick={() => setActiveItem({ ...game, type: 'game' })}
                      className="bg-slate-900 border border-slate-800 p-2 flex flex-col text-left group cursor-pointer transition-all hover:border-indigo-500/50 hover:bg-slate-800/50 h-full"
                    >
                      <div className="w-full bg-slate-800 mb-3 relative overflow-hidden aspect-video flex justify-center items-center shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
                        
                        <div className="absolute -right-2 -bottom-2 font-black text-6xl text-slate-700/20 z-0 leading-none group-hover:text-indigo-500/20 transition-colors">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        
                        <span className="absolute bottom-2 left-2 px-2 py-1 bg-slate-950/80 text-[9px] font-mono text-indigo-300 uppercase z-10 border border-indigo-900/30 shadow-sm">
                          {game.genre}
                        </span>
                      </div>
                      
                      <div className="relative z-10 flex flex-col flex-1 px-1">
                        <h2 className="text-xs font-bold uppercase tracking-tight text-slate-200 group-hover:text-white transition-colors mb-1 truncate">
                          {game.title}
                        </h2>
                        
                        <p className="text-[10px] text-slate-500 uppercase mb-3 truncate">
                          By {game.developer}
                        </p>
                        
                        <div className="mt-auto flex items-center gap-2 text-[10px] text-indigo-500 font-bold uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                          <Play className="fill-current" size={12} />
                          Launch Game
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              renderProxies()
            )
          ) : (
            <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 overflow-hidden h-full">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveItem(null)}
                      className="flex items-center justify-center w-8 h-8 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 transition-colors shadow-sm cursor-pointer"
                      title="Go Back"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <a
                      href={activeItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-8 h-8 bg-indigo-900/30 border border-indigo-700/50 hover:bg-indigo-600 hover:border-indigo-500 text-indigo-400 hover:text-white transition-all shadow-sm cursor-pointer"
                      title="Open in New Tab (Fallback)"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="h-6 w-px bg-slate-800"></div>
                  <h2 className="text-lg font-black tracking-tighter uppercase text-slate-200 truncate">
                    {activeItem.title || activeItem.name}
                  </h2>
                </div>
                
                <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                  <Info size={14} className="text-indigo-500" />
                  <span>{activeItem.genre || 'Secure Node'}</span>
                  <span className="text-slate-700">//</span>
                  <span>{activeItem.developer || activeItem.id}</span>
                </div>
              </div>
              
              <div className="flex-1 w-full border border-slate-800 relative bg-slate-900 p-1 shadow-[0_0_20px_rgba(79,70,229,0.05)] overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent z-10 pointer-events-none"></div>
                <iframe 
                  src={activeItem.url} 
                  className="w-full h-full bg-slate-950 block border-0"
                  title={activeItem.title || activeItem.name}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-popups-to-escape-sandbox allow-downloads allow-storage-access-by-user-activation allow-modals"
                  allow="accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *"
                  allowFullScreen
                />
              </div>
              <div className="mt-2 text-center py-2 h-8">
                <p className="text-[9px] text-slate-600 font-mono uppercase tracking-[0.2em]">
                  If the page fails to load, click the <ExternalLink size={10} className="inline mx-1" /> icon to launch in a new tab.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

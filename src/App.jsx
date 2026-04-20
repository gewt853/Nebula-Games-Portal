import React, { useState } from 'react';
import { Play, ArrowLeft, Gamepad2, Info } from 'lucide-react';
import gamesData from './data/games.json';

export default function App() {
  const [activeGame, setActiveGame] = useState(null);

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden">
      {/* Header marquee */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/50 flex items-center overflow-hidden shrink-0">
        <div className="marquee-track text-[10px] font-bold tracking-widest uppercase text-indigo-400">
          <span className="px-6">/// BRUTAL GAMES PORTAL ///</span>
          <span className="px-6 text-slate-500">UNBLOCKED & READY TO PLAY</span>
          <span className="px-6">/// BRUTAL GAMES PORTAL ///</span>
          <span className="px-6 text-slate-500">UNBLOCKED & READY TO PLAY</span>
          <span className="px-6">/// BRUTAL GAMES PORTAL ///</span>
          <span className="px-6 text-slate-500">UNBLOCKED & READY TO PLAY</span>
          <span className="px-6">/// BRUTAL GAMES PORTAL ///</span>
          <span className="px-6 text-slate-500">UNBLOCKED & READY TO PLAY</span>
          <span className="px-6">/// BRUTAL GAMES PORTAL ///</span>
          <span className="px-6 text-slate-500">UNBLOCKED & READY TO PLAY</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {!activeGame ? (
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gamesData.map((game, index) => (
                <button
                  key={game.id}
                  onClick={() => setActiveGame(game)}
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
          <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 overflow-hidden h-full">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveGame(null)}
                  className="flex items-center justify-center w-8 h-8 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 transition-colors shadow-sm cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="h-6 w-px bg-slate-800"></div>
                <h2 className="text-lg font-black tracking-tighter uppercase text-slate-200 truncate">
                  {activeGame.title}
                </h2>
              </div>
              
              <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                <Info size={14} className="text-indigo-500" />
                <span>{activeGame.genre}</span>
                <span className="text-slate-700">//</span>
                <span>{activeGame.developer}</span>
              </div>
            </div>
            
            <div className="flex-1 w-full border border-slate-800 relative bg-slate-900 p-1 shadow-[0_0_20px_rgba(79,70,229,0.05)] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent z-10 pointer-events-none"></div>
              <iframe 
                src={activeGame.url} 
                className="w-full h-full bg-slate-950 block border-0"
                title={activeGame.title}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import React from 'react';
import Logo from './Logo';

interface LandingProps {
  onEnter: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen w-full text-white overflow-hidden relative flex flex-col items-center font-inter animate-apex">
      
      <main className="relative z-20 flex flex-col items-center px-8 max-w-[1400px] w-full text-center py-32 md:py-48">
        
        <div className="mb-24 scale-90 md:scale-100">
          <Logo size="xl" showText={true} className="drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]" />
        </div>

        <div className="flex flex-col items-center space-y-12 max-w-6xl mx-auto">
          <div className="inline-flex items-center px-6 py-2.5 rounded-full border border-blue-500/10 bg-blue-500/[0.03] text-blue-400 text-[10px] font-black uppercase tracking-[0.6em] shadow-[0_0_50px_rgba(0,102,255,0.1)]">
            Neural link protocol v2.5 active
          </div>

          <h2 className="text-6xl md:text-9xl font-outfit font-black tracking-[-0.06em] leading-[0.85] text-white">
            DESIGNED FOR <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-white animate-shine bg-[length:200%_auto]">THE ABSOLUTE.</span>
          </h2>
          
          <p className="text-gray-400 text-xl md:text-3xl max-w-4xl mx-auto leading-tight font-medium opacity-80">
            Experience the apex of high-bandwidth multimodal intelligence. Real-time vision, human-grade voice, and modular production workspaces.
          </p>

          <div className="pt-20">
            <button 
              onClick={onEnter}
              className="button-apex"
            >
              Initialize Workspace
              <div className="absolute inset-0 bg-blue-600/10 opacity-0 hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        </div>

        {/* Feature Grid - Ultra Minimal */}
        <div className="mt-64 grid grid-cols-1 md:grid-cols-3 gap-16 w-full text-left">
          <FeatureEntry 
            title="Spatial Cognition" 
            desc="Sustained environmental reasoning through high-frequency visual frame analysis."
          />
          <FeatureEntry 
            title="Bionic Prosody" 
            desc="Low-latency neural voice links with multi-speaker support and human-like inflection."
          />
          <FeatureEntry 
            title="Synaptic Workspace" 
            desc="Automated output persistence in a modular, high-fidelity development environment."
          />
        </div>
      </main>

      <footer className="w-full py-16 px-12 mt-auto border-t border-white/[0.03] bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 opacity-30 text-[10px] font-black uppercase tracking-[0.8em] text-white">
          <div className="flex items-center gap-6">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_20px_rgba(0,102,255,1)]"></div>
            Core Infrastructure Online
          </div>
          <div className="flex gap-16">
            <span className="cursor-none hover:text-blue-500 transition-colors">Neural Hub</span>
            <span className="cursor-none hover:text-blue-500 transition-colors">Security protocol</span>
            <span className="cursor-none hover:text-blue-500 transition-colors">Sync engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureEntry: React.FC<{title: string, desc: string}> = ({ title, desc }) => (
  <div className="group space-y-6">
    <div className="w-12 h-[1px] bg-blue-500 group-hover:w-24 transition-all duration-700"></div>
    <h3 className="text-2xl font-bold font-outfit text-white tracking-tight">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed max-w-xs group-hover:text-gray-300 transition-colors">
      {desc}
    </p>
  </div>
);

export default Landing;
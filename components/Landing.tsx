import React from 'react';
import Logo from './Logo';

interface LandingProps {
  onEnter: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen w-full text-white overflow-hidden relative flex flex-col items-center font-inter animate-apex">
      
      <main className="relative z-20 flex flex-col items-center px-8 max-w-[1400px] w-full text-center py-32 md:py-64">
        
        <div className="mb-32">
          <Logo size="xl" showText={true} />
        </div>

        <div className="flex flex-col items-center space-y-16 max-w-7xl mx-auto">
          <div className="inline-flex items-center px-10 py-3 rounded-full border border-white/10 bg-white/[0.02] text-prismatic text-[11px] font-black uppercase tracking-[0.8em] shadow-[0_0_80px_rgba(0,242,255,0.1)]">
            Neural link protocol v3.0 established
          </div>

          <h2 className="text-7xl md:text-[11rem] font-outfit font-black tracking-[-0.07em] leading-[0.8] text-white">
            THE APEX <br/>
            <span className="text-prismatic">REALITY.</span>
          </h2>
          
          <p className="text-gray-400 text-2xl md:text-4xl max-w-5xl mx-auto leading-tight font-medium opacity-90 tracking-tight">
            High-fidelity multimodal superintelligence. Engineered for those who demand the <span className="text-white font-bold">Absolute.</span>
          </p>

          <div className="pt-24 scale-110">
            <button 
              onClick={onEnter}
              className="button-apex"
            >
              Enter Interface
              <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        </div>

        {/* Feature Grid - $100M Aesthetic */}
        <div className="mt-80 grid grid-cols-1 md:grid-cols-3 gap-24 w-full text-left">
          <FeatureEntry 
            title="Spatial Core" 
            desc="Hyper-frequency visual frame analysis with recursive environmental reasoning."
            accent="var(--accent-primary)"
          />
          <FeatureEntry 
            title="Neural Voice" 
            desc="Zero-latency bionic prosody featuring high-chrome human inflection modeling."
            accent="var(--accent-secondary)"
          />
          <FeatureEntry 
            title="Omni Workspace" 
            desc="Modular synaptic development environment for high-value asset production."
            accent="var(--accent-tertiary)"
          />
        </div>
      </main>

      <footer className="w-full py-20 px-16 mt-auto border-t border-white/[0.05] bg-black/60 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 opacity-40 text-[11px] font-black uppercase tracking-[1em] text-white">
          <div className="flex items-center gap-8">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_30px_rgba(0,242,255,1)]"></div>
            Mine Tech Technologies | Core v3.0 Online
          </div>
          <div className="flex gap-20">
            <span className="cursor-none hover:text-prismatic transition-colors">Neural Hub</span>
            <span className="cursor-none hover:text-prismatic transition-colors">Security</span>
            <span className="cursor-none hover:text-prismatic transition-colors">Nodes</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureEntry: React.FC<{title: string, desc: string, accent: string}> = ({ title, desc, accent }) => (
  <div className="group space-y-8 relative p-10 glass-premium rounded-[3rem] transition-all duration-700 hover:translate-y-[-10px] hover:shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
    <div className="w-16 h-1 rounded-full group-hover:w-32 transition-all duration-700" style={{ background: accent }}></div>
    <h3 className="text-3xl font-black font-outfit text-white tracking-tight">{title}</h3>
    <p className="text-gray-400 text-lg leading-relaxed group-hover:text-white transition-colors">
      {desc}
    </p>
    <div className="absolute -inset-px rounded-[3rem] border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
  </div>
);

export default Landing;
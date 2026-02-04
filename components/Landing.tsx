import React from 'react';
import Logo from './Logo';

interface LandingProps {
  onEnter: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen w-full text-white overflow-hidden relative flex flex-col items-center justify-center font-inter">
      
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[160px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Fine Scanlines Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%] opacity-20"></div>
      </div>

      <main className="relative z-20 flex flex-col items-center px-6 max-w-6xl w-full text-center py-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <div className="mb-12">
          <Logo size="xl" showText={true} className="animate-float" />
        </div>

        <div className="flex flex-col items-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full glass border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.5em] shadow-[0_0_20px_rgba(59,130,246,0.1)]">
            Neural Interface v2.5 Online
          </div>

          <h2 className="text-4xl md:text-7xl font-outfit font-black tracking-tighter leading-[0.9] text-white">
            THE WORLD'S FIRST <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 animate-shine bg-[length:200%_auto]">HYPER-INTELLIGENCE</span>
          </h2>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
            Bridging the gap between human thought and digital creation through high-bandwidth multimodal neural links.
          </p>

          <div className="pt-10">
            <button 
              onClick={onEnter}
              className="group relative px-12 py-5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(59,130,246,0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <span className="relative z-10 flex items-center">
                Access Workspace
                <svg className="w-5 h-5 ml-3 group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <FeatureCard 
            title="Real-time Vision" 
            desc="Spatially aware reasoning through live vision processing and frame analysis."
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth={2}/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth={2}/></svg>}
            color="blue"
          />
          <FeatureCard 
            title="Neural Voice" 
            desc="Native latency conversational interface with human-like prosody and understanding."
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={2}/></svg>}
            color="indigo"
          />
          <FeatureCard 
            title="Draft Engine" 
            desc="Automated output synchronization in persistent workspaces for seamless production."
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth={2}/></svg>}
            color="purple"
          />
        </div>
      </main>

      <footer className="relative z-10 py-10 px-8 w-full border-t border-white/5 mt-auto bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 text-[9px] font-black uppercase tracking-[0.4em] text-white">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]"></div>
            PROTOCOL MINE-2.0 ESTABLISHED
          </div>
          <div className="flex gap-10">
            <span className="hover:text-blue-400 transition-colors cursor-pointer">Security Hub</span>
            <span className="hover:text-blue-400 transition-colors cursor-pointer">Neural API</span>
            <span className="hover:text-blue-400 transition-colors cursor-pointer">Infrastructure</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{title: string, desc: string, icon: React.ReactNode, color: string}> = ({ title, desc, icon, color }) => {
  const colorMap: any = {
    blue: "border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/5 text-blue-400",
    indigo: "border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-indigo-400",
    purple: "border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/5 text-purple-400"
  };
  return (
    <div className={`glass p-8 rounded-[2.5rem] transition-all duration-500 border ${colorMap[color]} group`}>
      <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-3 font-outfit text-white tracking-tight">{title}</h3>
      <p className="text-gray-400 text-xs leading-relaxed font-medium">
        {desc}
      </p>
    </div>
  );
};

export default Landing;
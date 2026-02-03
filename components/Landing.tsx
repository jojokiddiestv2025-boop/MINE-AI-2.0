
import React from 'react';
import Logo from './Logo';

interface LandingProps {
  onEnter: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen w-full bg-[#030712] text-white overflow-x-hidden relative flex flex-col">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto py-20">
        <div className="mb-8 animate-in fade-in zoom-in duration-1000">
          <Logo size="xl" showText={true} />
        </div>
        
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-black uppercase tracking-[0.3em] mb-10 shadow-2xl">
          Neural Interface v2.5 Active
        </div>
        
        <p className="text-gray-400 text-lg md:text-2xl max-w-3xl mx-auto leading-relaxed mb-16 font-light">
          Establish a high-bandwidth neural link. Multimodal intelligence that sees, hears, and drafts your ideas in real-time.
        </p>

        <button 
          onClick={onEnter}
          className="group relative px-16 py-6 bg-white text-black font-black uppercase tracking-widest text-sm rounded-[2rem] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(59,130,246,0.4)]"
        >
          <span className="relative z-10 flex items-center">
            Initialize Interface
            <svg className="w-5 h-5 ml-3 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left">
          <div className="glass border border-white/5 p-10 rounded-[3rem] hover:border-blue-500/30 transition-colors group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={2}/></svg>
            </div>
            <h3 className="text-xl font-bold mb-4 font-outfit text-white">Pure Voice</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Zero-latency verbal communication with advanced reasoning. No more typing.
            </p>
          </div>
          <div className="glass border border-white/5 p-10 rounded-[3rem] hover:border-indigo-500/30 transition-colors group">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth={2}/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth={2}/></svg>
            </div>
            <h3 className="text-xl font-bold mb-4 font-outfit text-white">Visual Link</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Real-time frame processing. Show the AI your world, your code, or your screen.
            </p>
          </div>
          <div className="glass border border-white/5 p-10 rounded-[3rem] hover:border-purple-500/30 transition-colors group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth={2}/></svg>
            </div>
            <h3 className="text-xl font-bold mb-4 font-outfit text-white">Draft Pad</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Instant generation of essays, CVs, and code in a persistent side-workspace.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-12 px-6 border-t border-white/5 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 opacity-30 text-[10px] font-black uppercase tracking-widest text-center md:text-left">
          <div>&copy; 2025 MINE NEURAL SYSTEMS. ALL RIGHTS RESERVED.</div>
          <div className="flex gap-8">
            <span className="hover:text-blue-400 transition-colors cursor-pointer">Protocol</span>
            <span className="hover:text-blue-400 transition-colors cursor-pointer">Security</span>
            <span className="hover:text-blue-400 transition-colors cursor-pointer">Identity</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

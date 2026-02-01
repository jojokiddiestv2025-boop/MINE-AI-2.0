
import React from 'react';

interface LandingProps {
  onEnter: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen w-full bg-[#030712] text-white overflow-x-hidden relative flex flex-col">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto py-20">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
          Next Gen Multimodal Intelligence
        </div>
        
        <h1 className="text-6xl md:text-8xl font-outfit font-extrabold tracking-tight leading-[0.95] mb-8">
          Speak, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">Seen & Heard.</span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
          The ultimate conversational companion. Native real-time audio combined with visual context. Show it a photo, ask a question, and talk it through in real-time.
        </p>

        <button 
          onClick={onEnter}
          className="group relative px-12 py-5 bg-white text-black font-bold rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20"
        >
          <span className="relative z-10 flex items-center">
            Initialize Interface
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left max-w-4xl">
          <div className="glass border border-gray-800 p-8 rounded-[2rem]">
            <h3 className="text-xl font-bold mb-3 font-outfit text-blue-400">Neural Voice Synthesis</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Experience zero-latency voice interaction with natural inflections and human-like responsiveness.
            </p>
          </div>
          <div className="glass border border-gray-800 p-8 rounded-[2rem]">
            <h3 className="text-xl font-bold mb-3 font-outfit text-indigo-400">Visual Grounding</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Upload frames to provide visual context. The AI sees what you see, allowing for collaborative problem solving.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-12 px-6 border-t border-gray-900 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 text-[10px] font-bold uppercase tracking-widest text-center md:text-left">
          <div>&copy; 2025 MINE AI. Multimodal Evolution.</div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

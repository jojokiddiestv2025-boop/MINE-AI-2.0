
import React from 'react';
import Logo from './Logo';

interface LandingProps {
  onGetStarted: () => void;
  onAuthClick: () => void;
  isLoggedIn: boolean;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onAuthClick, isLoggedIn }) => {
  const founderImage = "https://lh3.googleusercontent.com/d/1h9SbEMQSi6Jjvh5xb1vjIsaVQq-X6Jbw";

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-white overflow-y-auto custom-scrollbar relative selection:bg-accent selection:text-white">
      <nav className="fixed top-0 w-full px-6 lg:px-20 py-6 lg:py-8 flex justify-between items-center z-[100] bg-white/70 backdrop-blur-xl border-b border-slate-50/50">
        <div className="flex items-center gap-4">
          <Logo size="sm" showText={false} />
          <div className="flex flex-col">
            <h1 className="text-lg lg:text-xl font-black uppercase tracking-tighter text-slate-900">MINE <span className="text-prismatic">AI</span></h1>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400">JOSHUA FRED • NIGERIA</span>
          </div>
        </div>
        <div className="flex items-center gap-3 lg:gap-6">
          <button onClick={onAuthClick} className="px-5 lg:px-8 py-2.5 bg-slate-50 text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100">Sign In</button>
          <button onClick={onGetStarted} className="px-6 lg:px-10 py-3 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-xl shadow-accent/10">
            {isLoggedIn ? 'Launch' : 'App'}
          </button>
        </div>
      </nav>

      <section className="min-h-screen flex flex-col items-center justify-center pt-24 lg:pt-32 pb-20 relative w-full px-6 overflow-hidden">
        <div className="max-w-5xl w-full flex flex-col items-center space-y-12 lg:space-y-16 animate-billion text-center">
          <Logo size="lg" showText={false} />
          <div className="space-y-4 lg:space-y-6">
             <h2 className="text-5xl lg:text-9xl font-black font-outfit tracking-tight leading-[0.95] text-slate-900">
               NIGERIAN <br/><span className="text-prismatic">PRODIGY.</span>
             </h2>
             <p className="text-slate-500 text-lg lg:text-2xl max-w-2xl mx-auto font-medium leading-relaxed pt-4">
               High-fidelity Intelligence engineered by Joshua Fred, a 13-year-old Nigerian developer. 
             </p>
          </div>
          <button onClick={onGetStarted} className="px-12 lg:px-16 py-5 lg:py-6 bg-slate-900 text-white rounded-[2rem] text-lg lg:text-xl font-black uppercase tracking-widest hover:bg-accent transition-all active:scale-95 shadow-2xl shadow-accent/20">
            Get Started
          </button>
        </div>
      </section>

      <section className="w-full max-w-6xl mx-auto px-6 py-24 lg:py-40">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-32">
          <div className="w-full lg:w-1/2 relative">
            <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-50 transform lg:-rotate-2">
               <img src={founderImage} alt="Joshua Fred" className="w-full h-full object-cover" loading="lazy" />
               <div className="absolute bottom-8 left-8">
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-white/90 px-4 py-2 rounded-full shadow-sm">Lead Architect</span>
                  <h3 className="text-4xl font-black font-outfit text-white mt-4 drop-shadow-md">Joshua Fred</h3>
               </div>
            </div>
          </div>
          
          <div className="w-full lg:w-1/2 space-y-8 lg:space-y-12 text-center lg:text-left">
            <h2 className="text-4xl lg:text-7xl font-black font-outfit tracking-tight leading-none text-slate-900">Neural Speed, <br/><span className="opacity-20 italic">Global Scale.</span></h2>
            <p className="text-slate-600 text-lg lg:text-xl leading-relaxed font-medium">
              "MINE AI is my vision for accessible, world-class intelligence built right here in Lagos. It's fast, focused, and designed to empower developers and students."
            </p>
            <div className="grid grid-cols-2 gap-6 lg:gap-10 pt-4">
              <div className="p-8 lg:p-10 bg-slate-50 rounded-[2.5rem] space-y-2">
                <span className="text-4xl lg:text-5xl font-black font-outfit text-slate-900">13</span>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">AGE</p>
              </div>
              <div className="p-8 lg:p-10 bg-slate-50 rounded-[2.5rem] space-y-2">
                <span className="text-4xl lg:text-5xl font-black font-outfit text-prismatic">🇳🇬</span>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">LAGOS</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="w-full bg-slate-50 py-20 px-8 lg:px-24 flex flex-col lg:flex-row justify-between items-center gap-12 border-t border-slate-100">
        <div className="flex flex-col gap-4 items-center lg:items-start text-center lg:text-left">
           <Logo size="sm" showText={false} />
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">ENGINEERED BY JOSHUA FRED • 2025</p>
        </div>
        <div className="flex gap-10">
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic">LAGOSHUB-1 ACTIVE</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


import React from 'react';
import Logo from './Logo';

interface LandingProps {
  onGetStarted: () => void;
  onAuthClick: () => void;
  isLoggedIn: boolean;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onAuthClick, isLoggedIn }) => {
  // Direct link to the image based on user provided Drive link
  const founderImage = "https://lh3.googleusercontent.com/d/1h9SbEMQSi6Jjvh5xb1vjIsaVQq-X6Jbw";

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#020617] overflow-y-auto custom-scrollbar relative">
      {/* Neural Status Marquee */}
      <div className="fixed top-0 w-full bg-accent/10 backdrop-blur-md border-b border-white/5 py-3 z-[100] overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-marquee">
          <span className="text-[10px] font-black uppercase tracking-[0.6em] text-cyan-400">
            [ SYSTEM STATUS: OPERATIONAL ] • [ NEURAL SYNC: 99.9% ] • [ CORE UPLINK: VERIFIED ] • [ QUANTUM ENCRYPTION: ACTIVE ] • [ FOUNDER Joshua: ONLINE ] • [ VERSION 2.5.0-NEURAL-FLASH ]
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.6em] text-cyan-400 ml-[200px]">
            [ SYSTEM STATUS: OPERATIONAL ] • [ NEURAL SYNC: 99.9% ] • [ CORE UPLINK: VERIFIED ] • [ QUANTUM ENCRYPTION: ACTIVE ] • [ FOUNDER Joshua: ONLINE ] • [ VERSION 2.5.0-NEURAL-FLASH ]
          </span>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 40s linear infinite;
            display: inline-flex;
          }
        `}</style>
      </div>

      <nav className="fixed top-10 w-full px-12 md:px-24 flex justify-between items-center z-50">
        <div className="flex items-center gap-6">
          <Logo size="sm" showText={false} />
          <div className="flex flex-col">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white">MINE <span className="text-prismatic">AI</span></h1>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Neural Nexus</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={onAuthClick} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Access Key</button>
          <button onClick={onGetStarted} className="px-10 py-4 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all shadow-xl">
            {isLoggedIn ? 'Launch Dashboard' : 'Sync Core'}
          </button>
        </div>
      </nav>

      <section className="min-h-screen flex flex-col items-center justify-center pt-32 pb-20 relative w-full px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 blur-[150px] rounded-full -z-10"></div>
        
        <div className="max-w-6xl w-full flex flex-col items-center space-y-12 animate-billion text-center">
          <Logo size="xl" showText={false} />
          <h2 className="text-7xl md:text-[10rem] font-black font-outfit tracking-[-0.05em] leading-[0.85] text-white">
            THE NEXT <br/><span className="text-prismatic">BILLION.</span>
          </h2>
          <p className="text-slate-400 text-xl md:text-2xl max-w-2xl font-medium leading-relaxed">
            Neural Superintelligence engineered for the apex of human ambition. 
            Experience the absolute speed of logic.
          </p>
          <div className="flex flex-col md:flex-row gap-8 pt-8">
            <button onClick={onGetStarted} className="button-billion text-lg">Initialize Personal Uplink</button>
            <button className="px-12 py-5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">Documentation</button>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32 border-t border-white/5 bg-gradient-to-b from-transparent to-black/50">
        <div className="flex flex-col lg:flex-row items-center gap-24">
          <div className="lg:w-1/2 relative">
            <div className="absolute -inset-4 bg-prismatic blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative aspect-square rounded-[4rem] overflow-hidden border-2 border-white/10 shadow-[0_0_80px_rgba(112,0,255,0.2)]">
               <img 
                 src={founderImage} 
                 alt="Joshua - Founder" 
                 className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" 
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
               <div className="absolute bottom-12 left-12">
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-400 mb-2 block">Founding Architect</span>
                  <h3 className="text-5xl font-black font-outfit text-white">Joshua</h3>
               </div>
            </div>
            {/* Decorative Grid */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--accent) 1px, transparent 0)', backgroundSize: '15px 15px' }}></div>
          </div>
          
          <div className="lg:w-1/2 space-y-10">
            <div className="space-y-4">
              <h4 className="text-prismatic text-xs font-black uppercase tracking-[0.8em]">The Vision</h4>
              <h2 className="text-5xl md:text-7xl font-black font-outfit tracking-tight leading-tight">Architecting the Interface of <span className="opacity-40">Intuition.</span></h2>
            </div>
            
            <p className="text-slate-400 text-lg leading-relaxed font-medium">
              "We aren't just building another AI model. We are constructing a neural mirror for human potential. MINE AI is the ultimate bridge between raw intuition and actionable intelligence, designed to operate at the speed of thought."
            </p>
            
            <div className="grid grid-cols-2 gap-8 pt-6">
              <div className="p-8 glass-premium rounded-[2rem] space-y-2 border-white/5">
                <span className="text-3xl font-black font-outfit">13</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Architect Age</p>
              </div>
              <div className="p-8 glass-premium rounded-[2rem] space-y-2 border-white/5">
                <span className="text-3xl font-black font-outfit text-prismatic">∞</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Scale</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="w-full border-t border-white/5 py-20 px-12 flex flex-col md:flex-row justify-between items-center gap-12 bg-black">
        <div className="flex flex-col gap-4 items-center md:items-start">
           <Logo size="sm" showText={false} />
           <p className="text-[9px] font-black uppercase tracking-[0.6em] text-slate-500">MINE NEURAL SYSTEMS © 2025</p>
        </div>
        <div className="flex gap-12">
           <a href="#" className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Privacy</a>
           <a href="#" className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Security</a>
           <a href="#" className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Terminal</a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


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
    <div className="min-h-screen w-full flex flex-col items-center bg-white overflow-y-auto custom-scrollbar relative">
      {/* Top Banner - Vibrant Marquee */}
      <div className="fixed top-0 w-full bg-gradient-to-r from-accent via-cyan-500 to-pink-500 text-white py-3 z-[100] overflow-hidden whitespace-nowrap shadow-xl">
        <div className="inline-block animate-marquee">
          <span className="text-[11px] font-black uppercase tracking-[0.5em]">
            SYSTEM: UNMATCHED • DEVELOPED BY A 13-YEAR-OLD NIGERIAN PRODIGY • NEURAL SYNC: ABSOLUTE • NIGERIAN INNOVATION • FOUNDER JOSHUA: ONLINE • PRIORITY UPLINK: READY
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.5em] ml-[200px]">
            SYSTEM: UNMATCHED • DEVELOPED BY A 13-YEAR-OLD NIGERIAN PRODIGY • NEURAL SYNC: ABSOLUTE • NIGERIAN INNOVATION • FOUNDER JOSHUA: ONLINE • PRIORITY UPLINK: READY
          </span>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 35s linear infinite;
            display: inline-flex;
          }
        `}</style>
      </div>

      <nav className="fixed top-12 w-full px-8 md:px-20 flex justify-between items-center z-50">
        <div className="flex items-center gap-6">
          <Logo size="sm" showText={false} />
          <div className="flex flex-col">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">MINE <span className="text-prismatic">AI</span></h1>
            <span className="text-[9px] font-black uppercase tracking-[0.6em] text-slate-400">Nigerian Innovation</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onAuthClick} className="px-8 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm">Portal</button>
          <button onClick={onGetStarted} className="px-10 py-4 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-2xl">
            {isLoggedIn ? 'Launch Hub' : 'Enter Nexus'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center pt-48 pb-20 relative w-full px-6 overflow-hidden">
        {/* Background Colorful Blobs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-400/10 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-pink-400/10 blur-[120px] rounded-full -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="max-w-7xl w-full flex flex-col items-center space-y-16 animate-billion text-center">
          <Logo size="xl" showText={false} />
          <div className="space-y-6">
             <h2 className="text-7xl md:text-[11rem] font-black font-outfit tracking-[-0.06em] leading-[0.8] text-slate-900">
               NIGERIAN <br/><span className="text-prismatic">PRODIGY.</span>
             </h2>
             <p className="text-slate-500 text-xl md:text-3xl max-w-3xl mx-auto font-medium leading-relaxed pt-8">
               Intelligence redefined by a 13-year-old Nigerian developer. 
               Experience a new era of neural engineering from the heart of Lagos.
             </p>
          </div>
          <div className="flex flex-col md:flex-row gap-8 pt-12">
            <button onClick={onGetStarted} className="button-billion text-xl !px-16 !py-6">Initialize Neural Link</button>
            <button className="px-16 py-6 bg-white border-2 border-slate-100 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all shadow-lg">Whitepaper</button>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-40">
        <div className="flex flex-col lg:flex-row items-center gap-32">
          <div className="lg:w-1/2 relative group">
            <div className="absolute -inset-8 bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 blur-[80px] opacity-10 group-hover:opacity-25 transition-opacity duration-1000"></div>
            <div className="relative aspect-[4/5] rounded-[5rem] overflow-hidden border-8 border-white shadow-2xl bg-slate-50">
               <img 
                 src={founderImage} 
                 alt="Joshua - The Architect" 
                 className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
               />
               <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-80"></div>
               <div className="absolute bottom-16 left-16">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="h-[2px] w-8 bg-accent"></div>
                     <span className="text-[12px] font-black uppercase tracking-[0.6em] text-accent">Nigerian Developer</span>
                  </div>
                  <h3 className="text-7xl font-black font-outfit text-slate-900 tracking-tighter">Joshua</h3>
               </div>
            </div>
          </div>
          
          <div className="lg:w-1/2 space-y-12">
            <div className="space-y-6">
              <h4 className="text-prismatic text-sm font-black uppercase tracking-[1em]">The Core Philosophy</h4>
              <h2 className="text-6xl md:text-8xl font-black font-outfit tracking-tight leading-[0.9] text-slate-900">Neural Speed, <br/><span className="opacity-20 italic">Nigerian Heart.</span></h2>
            </div>
            
            <p className="text-slate-600 text-2xl leading-relaxed font-medium">
              "We didn't just scale; we reimagined the substrate of thinking. MINE AI is a testament to the fact that greatness knows no age or boundary. Crafted from the vibrant energy of Nigeria."
            </p>
            
            <div className="grid grid-cols-2 gap-10 pt-8">
              <div className="p-10 glass-premium rounded-[3.5rem] space-y-3">
                <span className="text-5xl font-black font-outfit text-slate-900">13</span>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Years of Age</p>
              </div>
              <div className="p-10 glass-premium rounded-[3.5rem] space-y-3 bg-gradient-to-br from-accent/5 to-cyan-400/5">
                <span className="text-5xl font-black font-outfit text-prismatic">🇳🇬</span>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Nigerian Heritage</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="w-full bg-slate-50 py-32 px-12 md:px-24 flex flex-col md:flex-row justify-between items-center gap-16 border-t border-slate-100">
        <div className="flex flex-col gap-6 items-center md:items-start text-center md:text-left">
           <Logo size="sm" showText={false} />
           <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">CRAFTED BY JOSHUA IN NIGERIA • EST 2025</p>
        </div>
        <div className="flex gap-16">
           <a href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-accent transition-colors">Privacy</a>
           <a href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-accent transition-colors">Compliance</a>
           <a href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-accent transition-colors">Terminal</a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

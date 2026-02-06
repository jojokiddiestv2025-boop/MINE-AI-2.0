
import React from 'react';
import Logo from './Logo';

interface LandingProps {
  onGetStarted: () => void;
  onAuthClick: () => void;
  isLoggedIn: boolean;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onAuthClick, isLoggedIn }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 text-center bg-white">
      <nav className="fixed top-0 w-full p-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <Logo size="sm" showText={false} />
          <h1 className="text-xl font-black uppercase">MINE <span className="text-prismatic">AI</span></h1>
        </div>
        <button onClick={onGetStarted} className="px-8 py-3 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-prismatic transition-all">
          {isLoggedIn ? 'Launch' : 'Sync'}
        </button>
      </nav>

      <div className="max-w-4xl space-y-12 animate-billion">
        <Logo size="xl" />
        <h2 className="text-6xl md:text-8xl font-black font-outfit tracking-tighter leading-none">
          THE NEXT <br/><span className="text-prismatic">BILLION.</span>
        </h2>
        <p className="text-slate-500 text-lg font-medium">Neural Superintelligence for the Absolute Apex.</p>
        <button onClick={onGetStarted} className="button-billion">Personal Uplink</button>
      </div>
      
      <footer className="mt-32 text-[8px] font-black uppercase tracking-[0.5em] text-slate-300">
        Founder: Joshua (13) | Security Tier 5 Active
      </footer>
    </div>
  );
};

export default Landing;

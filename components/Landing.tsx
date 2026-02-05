
import React from 'react';
import Logo from './Logo';

interface LandingProps {
  onGetStarted: () => void;
  onAuthClick: () => void;
  onSchoolClick: () => void;
  onSchoolPortalClick: () => void;
  isLoggedIn: boolean;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onAuthClick, onSchoolClick, onSchoolPortalClick, isLoggedIn }) => {
  const founderImageUrl = "https://lh3.googleusercontent.com/d/1h9SbEMQSi6Jjvh5xb1vjIsaVQq-X6Jbw";

  return (
    <div className="min-h-screen w-full text-slate-900 font-inter selection:bg-cyan-500 selection:text-white">
      
      {/* Floating Navigation */}
      <nav className="fixed top-0 left-0 w-full z-[100] px-8 py-10 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Logo size="sm" showText={false} />
          <h1 className="text-2xl font-outfit font-black tracking-[-0.1em] uppercase text-slate-900">
            MINE <span className="text-prismatic">AI</span>
          </h1>
        </div>
        <div className="flex items-center space-x-8 md:space-x-12">
          {!isLoggedIn && (
             <button 
               onClick={onAuthClick}
               className="hidden sm:block text-[11px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-slate-900 transition-colors"
             >
               Personal Access
             </button>
          )}
          <button 
            onClick={onGetStarted}
            className="px-10 py-4 bg-slate-900 text-white font-black uppercase text-[11px] tracking-[0.4em] rounded-full hover:bg-prismatic hover:scale-105 transition-all shadow-[0_15px_40px_rgba(0,0,0,0.1)] active:scale-95"
          >
            {isLoggedIn ? 'Launch Nexus' : 'Initialize'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-blue-400/10 blur-[200px] rounded-full pointer-events-none"></div>
        
        <div className="mb-20 scale-90 sm:scale-100 animate-billion">
          <Logo size="xl" showText={true} />
        </div>

        <div className="max-w-7xl mx-auto text-center space-y-12 animate-billion">
          <div className="inline-flex items-center px-10 py-3 rounded-full border border-black/5 bg-white/40 text-prismatic text-[11px] font-black uppercase tracking-[0.8em] backdrop-blur-md shadow-sm">
            Neural Superintelligence Active
          </div>
          
          <h2 className="text-7xl sm:text-8xl lg:text-[13rem] font-outfit font-black tracking-[-0.05em] leading-[0.8] text-slate-900">
            THE NEXT <br />
            <span className="text-prismatic">BILLION.</span>
          </h2>
          
          <div className="pt-16 flex flex-col sm:flex-row gap-8 justify-center">
            <button onClick={onGetStarted} className="button-billion text-lg px-20">Personal Uplink</button>
            <button onClick={onSchoolPortalClick} className="px-16 py-6 bg-white border-2 border-slate-900/5 rounded-full font-black uppercase text-[12px] tracking-[0.4em] hover:bg-slate-50 transition-all shadow-xl">School Portal</button>
          </div>
        </div>
      </section>

      {/* Institutional Management Section */}
      <section className="py-60 px-8 relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center relative z-10">
          <div className="space-y-12">
             <div className="inline-flex items-center px-8 py-3 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.8em]">Institutional Core</div>
             <h3 className="text-6xl md:text-8xl font-outfit font-black tracking-tighter leading-none">
                SECURE <br />
                <span className="text-cyan-400">ACADEMY.</span>
             </h3>
             <p className="text-slate-400 text-2xl font-medium leading-relaxed max-w-xl">
                Provision your institution with a private, high-bandwidth neural link. Only admin-authorized entities can access the school's workspace.
             </p>
             <div className="flex flex-col gap-6">
                <button onClick={onSchoolClick} className="px-12 py-6 bg-cyan-400 text-slate-900 rounded-full font-black uppercase text-[12px] tracking-[0.4em] hover:scale-105 transition-all shadow-2xl self-start">Register Institution</button>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-60">Requires Enterprise Verification</p>
             </div>
          </div>
          <div className="relative">
             <div className="glass-premium !bg-white/5 border-white/10 p-16 rounded-[4rem] space-y-12 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between mb-8">
                   <div className="text-[11px] font-black uppercase tracking-widest text-cyan-400">Nexus Security Console</div>
                   <div className="w-3 h-3 rounded-full bg-green-500 animate-ping"></div>
                </div>
                <div className="space-y-6">
                   <div className="h-4 w-3/4 bg-white/5 rounded-full"></div>
                   <div className="h-4 w-1/2 bg-white/5 rounded-full"></div>
                   <div className="h-20 w-full bg-white/5 rounded-[2rem] border border-white/10 flex items-center px-8">
                      <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest">Shield: 100% Active</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-60 px-8 relative overflow-hidden bg-white/50">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-24 lg:gap-40">
          <div className="w-full lg:w-[500px] shrink-0 order-2 lg:order-1">
             <div className="relative group">
                <div className="relative aspect-[3/4.5] rounded-[4.5rem] overflow-hidden border border-black/5 shadow-2xl bg-white">
                  <img src={founderImageUrl} className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent opacity-90"></div>
                  <div className="absolute bottom-16 left-16 right-16 space-y-6 z-20">
                     <p className="text-slate-900 text-6xl font-black font-outfit uppercase tracking-tighter leading-none">Joshua</p>
                     <p className="text-prismatic text-xl font-black uppercase tracking-[0.4em] mt-2">Lead Architect</p>
                  </div>
                </div>
                <div className="absolute -top-10 -left-10 w-24 h-24 glass-premium rounded-3xl flex items-center justify-center animate-bounce duration-[4s] border-white z-30">
                  <div className="text-[12px] font-black text-prismatic">13yo</div>
                </div>
             </div>
          </div>
          <div className="flex-1 space-y-16 order-1 lg:order-2">
            <h3 className="text-7xl md:text-9xl font-outfit font-black tracking-tighter leading-none text-slate-900">
              THE MIND <br />
              <span className="text-prismatic">BEHIND MINE.</span>
            </h3>
            <p className="text-slate-500 text-2xl font-medium leading-relaxed max-w-xl">
              Building the future of academic intelligence, starting with the first 13-year-old developer to implement global-tier neural institutional security.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-32 px-16 border-t border-black/[0.05] bg-white/80">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-32">
          <div className="space-y-10">
            <h1 className="text-3xl font-outfit font-black tracking-[-0.1em] uppercase text-slate-900">MINE <span className="text-prismatic">AI</span></h1>
            <p className="text-slate-500 text-xl max-w-sm font-medium">Neural Superintelligence for the Absolute Apex.</p>
          </div>
          <div className="flex gap-20">
             <div className="space-y-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Nexus</h5>
                <ul className="space-y-4 text-slate-400 text-sm font-bold uppercase tracking-widest">
                   <li>Personal</li>
                   <li onClick={onSchoolPortalClick} className="cursor-pointer text-cyan-600">School Portal</li>
                   <li onClick={onSchoolClick} className="cursor-pointer">Register Institution</li>
                </ul>
             </div>
          </div>
        </div>
        <div className="mt-40 pt-16 border-t border-black/[0.03] text-[9px] font-black uppercase tracking-[0.6em] text-slate-400 text-center">
          Founder: Joshua (13) | Security Tier 5 Active
        </div>
      </footer>
    </div>
  );
};

export default Landing;

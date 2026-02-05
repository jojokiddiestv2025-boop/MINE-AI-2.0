import React from 'react';
import Logo from './Logo';

interface LandingProps {
  onGetStarted: () => void;
  onAuthClick: () => void;
  onSchoolClick: () => void;
  isLoggedIn: boolean;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onAuthClick, onSchoolClick, isLoggedIn }) => {
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
               Sign In
             </button>
          )}
          <button 
            onClick={onGetStarted}
            className="px-10 py-4 bg-slate-900 text-white font-black uppercase text-[11px] tracking-[0.4em] rounded-full hover:bg-prismatic hover:scale-105 transition-all shadow-[0_15px_40px_rgba(0,0,0,0.1)] active:scale-95"
          >
            {isLoggedIn ? 'Launch Interface' : 'Get Started'}
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
            Neural Nexus v4.0 Active
          </div>
          
          <h2 className="text-7xl sm:text-8xl lg:text-[13rem] font-outfit font-black tracking-[-0.05em] leading-[0.8] text-slate-900">
            THE NEXT <br />
            <span className="text-prismatic">BILLION.</span>
          </h2>
          
          <p className="text-slate-500 text-xl sm:text-3xl max-w-4xl mx-auto leading-tight font-medium opacity-90 tracking-tight px-4">
            A high-fidelity multimodal superintelligence. Engineered for the <span className="text-slate-900 font-bold">Absolute Apex.</span>
          </p>

          <div className="pt-16">
            <button 
              onClick={onGetStarted}
              className="button-billion text-lg px-20"
            >
              Initialize Node
            </button>
          </div>
        </div>

        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4 opacity-40 animate-bounce">
            <span className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-900">Explore Nexus</span>
            <div className="w-[2px] h-12 bg-gradient-to-b from-slate-900 to-transparent rounded-full"></div>
        </div>
      </section>

      {/* School Section */}
      <section className="py-60 px-8 relative bg-indigo-50/30">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-black/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div className="relative order-2 lg:order-1">
             <div className="absolute -inset-10 bg-cyan-400/10 blur-[120px] rounded-full"></div>
             <div className="relative glass-premium p-16 rounded-[4rem] space-y-12 border-white/80">
                <div className="flex gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex-1 h-2 bg-prismatic rounded-full opacity-60"></div>
                  ))}
                </div>
                <h4 className="text-4xl font-outfit font-black uppercase text-slate-900">Academic Chancellor</h4>
                <div className="space-y-6">
                   <div className="p-8 bg-white/60 rounded-3xl border border-black/[0.03] shadow-sm">
                      <p className="text-cyan-600 text-sm font-black uppercase tracking-widest mb-4">Live Quiz Generation</p>
                      <p className="text-slate-600 font-medium leading-relaxed">"I have prepared 5 questions on quantum thermodynamics based on your scan."</p>
                   </div>
                   <div className="p-8 bg-white/60 rounded-3xl border border-black/[0.03] shadow-sm">
                      <p className="text-purple-600 text-sm font-black uppercase tracking-widest mb-4">Socratic Tutoring</p>
                      <p className="text-slate-600 font-medium leading-relaxed">"Before I give you the answer, what do you think the first variable represents?"</p>
                   </div>
                </div>
             </div>
          </div>
          <div className="space-y-12 order-1 lg:order-2 text-right">
             <h3 className="text-6xl md:text-8xl font-outfit font-black tracking-tighter leading-none text-slate-900">
                MINE AI <br />
                <span className="text-prismatic">FOR SCHOOLS.</span>
             </h3>
             <p className="text-slate-500 text-2xl font-medium leading-relaxed ml-auto max-w-xl">
                Empower your institution with private neural clusters. Provision accounts, monitor academic load, and give every student an Apex Chancellor.
             </p>
             <button onClick={onSchoolClick} className="button-billion !bg-white !text-slate-900 border-2 border-black/5 hover:border-cyan-400 px-16 shadow-xl">
                Register Institution
             </button>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section id="founder" className="py-60 px-8 relative overflow-hidden bg-white/50">
        <div className="absolute top-0 right-0 text-[30rem] font-black opacity-[0.03] select-none pointer-events-none -translate-y-1/2 translate-x-1/4 text-slate-900">13</div>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-24 lg:gap-40">
          
          <div className="w-full lg:w-[500px] xl:w-[600px] shrink-0 order-2 lg:order-1">
             <div className="relative group">
                <div className="absolute -inset-8 bg-prismatic opacity-10 blur-[100px] group-hover:opacity-30 transition-all duration-1000"></div>
                <div className="relative aspect-[3/4.5] rounded-[4.5rem] overflow-hidden border border-black/5 shadow-[0_50px_100px_rgba(0,0,0,0.08)] bg-white">
                  <img 
                    src={founderImageUrl}
                    alt="Joshua - The 13 Year Old Developer" 
                    className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://drive.google.com/uc?export=view&id=1h9SbEMQSi6Jjvh5xb1vjIsaVQq-X6Jbw";
                    }}
                  />
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(255,255,255,0.05)_50%),linear-gradient(90deg,rgba(0,242,255,0.02),rgba(112,0,255,0.01),rgba(255,0,234,0.02))] z-10 bg-[length:100%_4px,3px_100%]"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent opacity-90"></div>
                  <div className="absolute bottom-16 left-16 right-16 space-y-6 z-20">
                     <div className="flex items-center gap-4">
                        <div className="h-1 w-16 bg-prismatic rounded-full"></div>
                        <div className="px-4 py-1 rounded-full bg-cyan-100 border border-cyan-200 text-[10px] font-black text-cyan-600 uppercase tracking-widest">Verified Founder</div>
                     </div>
                     <div>
                        <p className="text-slate-900 text-6xl font-black font-outfit uppercase tracking-tighter leading-none">Joshua</p>
                        <p className="text-prismatic text-xl font-black uppercase tracking-[0.4em] mt-2">Lead Neural Architect</p>
                     </div>
                  </div>
                </div>
                <div className="absolute -top-10 -left-10 w-24 h-24 glass-premium rounded-3xl flex items-center justify-center animate-bounce duration-[4s] shadow-[0_20px_40px_rgba(0,0,0,0.05)] border-white z-30">
                  <div className="text-[12px] font-black text-prismatic">13yo</div>
                </div>
                <div className="absolute -bottom-8 -right-8 w-36 h-36 glass-premium rounded-full flex items-center justify-center animate-pulse duration-[3s] shadow-[0_0_80px_rgba(0,242,255,0.15)] border-white z-30">
                  <Logo size="sm" showText={false} />
                </div>
             </div>
          </div>

          <div className="flex-1 space-y-16 order-1 lg:order-2">
            <div className="space-y-8">
              <div className="inline-flex items-center px-10 py-4 rounded-full border border-black/[0.03] bg-white/60 text-prismatic text-[11px] font-black uppercase tracking-[0.8em] shadow-sm backdrop-blur-md">
                Founder Spotlight
              </div>
              <h3 className="text-7xl md:text-9xl font-outfit font-black tracking-tighter leading-none text-slate-900">
                THE MIND <br />
                <span className="text-prismatic">BEHIND MINE.</span>
              </h3>
            </div>
            <div className="relative">
              <div className="absolute -left-12 top-0 text-8xl font-black text-slate-900/5 pointer-events-none">"</div>
              <p className="text-slate-600 text-3xl md:text-4xl font-medium leading-[1.1] max-w-2xl tracking-tight relative z-10">
                Building the future isn't about age, it's about the <span className="text-slate-900 font-bold underline decoration-prismatic decoration-4 underline-offset-8">bandwidth of your ideas.</span>
              </p>
            </div>
            <div className="space-y-12">
              <p className="text-slate-500 text-2xl font-medium leading-relaxed max-w-xl">
                Joshua, at age 13, engineered MINE AI to bridge the latency between human intuition and machine intelligence. This is the first neural link optimized for the speed of modern academic thought.
              </p>
              <div className="flex flex-wrap gap-10">
                <div className="px-12 py-10 glass-premium rounded-[3rem] border-white/80 hover:border-cyan-400/20 transition-all group/stat shadow-xl">
                  <div className="text-5xl font-black text-slate-900 mb-2 group-hover/stat:text-prismatic transition-colors">13</div>
                  <div className="text-[11px] uppercase font-black tracking-[0.5em] text-slate-400">Architect Age</div>
                </div>
                <div className="px-12 py-10 glass-premium rounded-[3rem] border-white/80 hover:border-cyan-400/20 transition-all group/stat shadow-xl">
                  <div className="text-5xl font-black text-slate-900 mb-2 group-hover/stat:text-cyan-600 transition-colors">4.0</div>
                  <div className="text-[11px] uppercase font-black tracking-[0.5em] text-slate-400">Nexus Core</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-32 px-16 border-t border-black/[0.05] bg-white/80 backdrop-blur-3xl">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-32">
          <div className="space-y-10">
            <div className="flex items-center space-x-6">
              <Logo size="sm" showText={false} />
              <h1 className="text-3xl font-outfit font-black tracking-[-0.1em] uppercase text-slate-900">
                MINE <span className="text-prismatic">AI</span>
              </h1>
            </div>
            <p className="text-slate-500 text-xl max-w-sm font-medium leading-relaxed">
              High-bandwidth human-AI symbiosis for the next generation.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-24">
            <FooterColumn title="Protocol" links={['Neural Link', 'Spatial Core', 'Bionic Voice']} />
            <FooterColumn title="Institutional" links={['School Nexus', 'Matrix Access', 'Academic Tier']} />
            <FooterColumn title="Network" links={['Security', 'Status', 'Contact']} />
          </div>
        </div>
        
        <div className="max-w-[1600px] mx-auto mt-40 pt-16 border-t border-black/[0.03] flex flex-col md:flex-row justify-between items-center gap-10 opacity-40 text-[10px] font-black uppercase tracking-[0.6em] text-slate-900">
          <span>© 2025 Mine Tech Technologies</span>
          <span>Founder: Joshua (13)</span>
          <span>Status: Optimal</span>
        </div>
      </footer>
    </div>
  );
};

const FooterColumn: React.FC<{title: string, links: string[]}> = ({ title, links }) => (
  <div className="space-y-8">
    <h5 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-900">{title}</h5>
    <ul className="space-y-4">
      {links.map(l => (
        <li key={l} className="text-slate-400 hover:text-cyan-600 transition-colors cursor-pointer text-lg font-medium">{l}</li>
      ))}
    </ul>
  </div>
);

export default Landing;
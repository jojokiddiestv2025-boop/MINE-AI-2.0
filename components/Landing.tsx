import React from 'react';
import Logo from './Logo';

interface LandingProps {
  onGetStarted: () => void;
  onAuthClick: () => void;
  isLoggedIn: boolean;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onAuthClick, isLoggedIn }) => {
  return (
    <div className="min-h-screen w-full text-white bg-black/20 font-inter selection:bg-cyan-500 selection:text-black">
      
      {/* Floating Navigation */}
      <nav className="fixed top-0 left-0 w-full z-[100] px-8 py-10 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Logo size="sm" showText={false} />
          <h1 className="text-2xl font-outfit font-black tracking-[-0.1em] uppercase text-white">
            MINE <span className="text-prismatic">AI</span>
          </h1>
        </div>
        <div className="flex items-center space-x-8 md:space-x-12">
          {!isLoggedIn && (
             <button 
               onClick={onAuthClick}
               className="hidden sm:block text-[11px] font-black uppercase tracking-[0.6em] text-white/40 hover:text-white transition-colors"
             >
               Sign In
             </button>
          )}
          <button 
            onClick={onGetStarted}
            className="px-10 py-4 bg-white text-black font-black uppercase text-[11px] tracking-[0.4em] rounded-full hover:bg-prismatic hover:text-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-95"
          >
            {isLoggedIn ? 'Launch Interface' : 'Get Started'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-blue-600/5 blur-[180px] rounded-full pointer-events-none"></div>
        
        <div className="mb-20 scale-90 sm:scale-100 animate-billion">
          <Logo size="xl" showText={true} />
        </div>

        <div className="max-w-7xl mx-auto text-center space-y-12 animate-billion">
          <div className="inline-flex items-center px-10 py-3 rounded-full border border-white/10 bg-white/[0.02] text-prismatic text-[11px] font-black uppercase tracking-[0.8em]">
            Neural Nexus v4.0 Active
          </div>
          
          <h2 className="text-7xl sm:text-8xl lg:text-[13rem] font-outfit font-black tracking-[-0.05em] leading-[0.8] text-white">
            THE NEXT <br />
            <span className="text-prismatic">BILLION.</span>
          </h2>
          
          <p className="text-gray-400 text-xl sm:text-3xl max-w-4xl mx-auto leading-tight font-medium opacity-90 tracking-tight px-4">
            A high-fidelity multimodal superintelligence. Engineered for the <span className="text-white font-bold">Absolute Apex.</span>
          </p>

          <div className="pt-16">
            <button 
              onClick={onGetStarted}
              className="button-billion text-lg"
            >
              Initialize Node
            </button>
          </div>
        </div>

        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4 opacity-30 animate-bounce">
            <span className="text-[10px] font-black uppercase tracking-[0.6em]">Scroll to Discover</span>
            <div className="w-1 h-12 bg-gradient-to-b from-white to-transparent rounded-full"></div>
        </div>
      </section>

      {/* School Section */}
      <section className="py-60 px-8 bg-white/[0.01] border-y border-white/[0.03]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div className="relative order-2 lg:order-1">
             <div className="absolute -inset-10 bg-cyan-500/20 blur-[120px] rounded-full"></div>
             <div className="relative glass-premium p-16 rounded-[4rem] space-y-12">
                <div className="flex gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex-1 h-2 bg-prismatic rounded-full opacity-40"></div>
                  ))}
                </div>
                <h4 className="text-4xl font-outfit font-black">ACADEMIC CHANCELLOR</h4>
                <div className="space-y-6">
                   <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                      <p className="text-cyan-400 text-sm font-black uppercase tracking-widest mb-4">Live Quiz Generation</p>
                      <p className="text-gray-400 font-medium">"I have prepared 5 questions on quantum thermodynamics based on your scan."</p>
                   </div>
                   <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                      <p className="text-purple-400 text-sm font-black uppercase tracking-widest mb-4">Socratic Tutoring</p>
                      <p className="text-gray-400 font-medium">"Before I give you the answer, what do you think the first variable represents?"</p>
                   </div>
                </div>
             </div>
          </div>
          <div className="space-y-12 order-1 lg:order-2">
             <h3 className="text-6xl md:text-8xl font-outfit font-black tracking-tighter leading-none">
                MINE AI <br />
                <span className="text-prismatic">FOR SCHOOLS.</span>
             </h3>
             <p className="text-gray-400 text-2xl font-medium leading-relaxed">
                Empower your institution with private neural clusters. Provision accounts, monitor academic load, and give every student an Apex Chancellor.
             </p>
             <button onClick={onAuthClick} className="button-billion !bg-transparent border-2 border-white/20 hover:border-cyan-400 hover:text-cyan-400 !text-white px-16">
                Register Institution
             </button>
          </div>
        </div>
      </section>

      {/* Standard Features */}
      <section className="py-60 px-8 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
        <div className="space-y-16">
          <div className="space-y-6">
            <h3 className="text-5xl md:text-7xl font-outfit font-black tracking-tighter leading-none">
              Spatial Intelligence <br />
              <span className="text-prismatic">Refined.</span>
            </h3>
            <p className="text-gray-400 text-2xl leading-relaxed font-medium">
              MINE AI perceives reality through high-chrome visual analysis and environmental reasoning.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="p-10 glass-premium rounded-[3rem] space-y-6 group hover:border-cyan-500/40 transition-all">
              <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth={2}/></svg>
              </div>
              <h4 className="text-2xl font-bold font-outfit">Visual Cortex</h4>
              <p className="text-gray-500 font-medium">Real-time object detection and spatial context mapping.</p>
            </div>
            <div className="p-10 glass-premium rounded-[3rem] space-y-6 group hover:border-purple-500/40 transition-all">
               <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={2}/></svg>
              </div>
              <h4 className="text-2xl font-bold font-outfit">Neural Voice</h4>
              <p className="text-gray-500 font-medium">Bionic prosody and human inflection modeling.</p>
            </div>
          </div>
        </div>

        <div className="relative group">
           <div className="absolute -inset-10 bg-prismatic opacity-20 blur-[100px] group-hover:opacity-40 transition-all duration-1000"></div>
           <div className="relative glass-premium aspect-square rounded-[5rem] overflow-hidden shadow-[0_100px_200px_rgba(0,0,0,1)] border-white/20">
              <div className="absolute inset-0 bg-black/40"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <Logo size="lg" showText={false} />
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-32 px-16 border-t border-white/[0.05] bg-black">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-32">
          <div className="space-y-10">
            <div className="flex items-center space-x-6">
              <Logo size="sm" showText={false} />
              <h1 className="text-3xl font-outfit font-black tracking-[-0.1em] uppercase text-white">
                MINE <span className="text-prismatic">AI</span>
              </h1>
            </div>
            <p className="text-gray-500 text-xl max-w-sm font-medium leading-relaxed">
              High-bandwidth human-AI symbiosis for the next generation.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-24">
            <FooterColumn title="Protocol" links={['Neural Link', 'Spatial Core', 'Bionic Voice']} />
            <FooterColumn title="Institutional" links={['School Nexus', 'Matrix Access', 'Academic Tier']} />
            <FooterColumn title="Network" links={['Security', 'Status', 'Contact']} />
          </div>
        </div>
        
        <div className="max-w-[1600px] mx-auto mt-40 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 opacity-40 text-[10px] font-black uppercase tracking-[0.6em]">
          <span>© 2025 Mine Tech Technologies</span>
          <span>Status: Optimal</span>
        </div>
      </footer>
    </div>
  );
};

const FooterColumn: React.FC<{title: string, links: string[]}> = ({ title, links }) => (
  <div className="space-y-8">
    <h5 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">{title}</h5>
    <ul className="space-y-4">
      {links.map(l => (
        <li key={l} className="text-gray-500 hover:text-prismatic transition-colors cursor-pointer text-lg font-medium">{l}</li>
      ))}
    </ul>
  </div>
);

export default Landing;
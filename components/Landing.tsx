
import React from 'react';
import Logo from './Logo';
import { Sparkles, Zap, Shield, ArrowRight, Github, Twitter, Globe, Cpu, Mic, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingProps {
  onGetStarted: () => void;
  onAuthClick: () => void;
  isLoggedIn: boolean;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onAuthClick, isLoggedIn }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-white overflow-y-auto custom-scrollbar selection:bg-accent selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full px-6 lg:px-20 py-4 lg:py-8 flex justify-between items-center z-[100] bg-white/80 backdrop-blur-2xl border-b border-slate-50">
        <div className="flex items-center gap-3 md:gap-4">
          <Logo size="sm" showText={false} />
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900">MINE <span className="text-accent">AI</span></h1>
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">SOVEREIGN CORE V3.1</span>
          </div>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <button onClick={onAuthClick} className="hidden md:block text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-slate-900 transition-colors">
            {isLoggedIn ? 'Dashboard' : 'Sign In'}
          </button>
          <button onClick={onGetStarted} className="button-billion !py-3 md:!py-4 !px-6 md:!px-8 shadow-xl shadow-accent/20 flex items-center gap-2 md:gap-3 text-[10px] md:text-base">
            <Cpu className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />
            Initialize
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center pt-24 md:pt-32 pb-12 md:pb-20 relative w-full px-6 overflow-hidden">
        <div className="mesh-gradient opacity-30"></div>
        
        {/* Flash Attractive Text for Mine AI 2.0 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-8 relative z-10"
        >
          <div className="px-6 py-2 rounded-full bg-accent/10 border border-accent/20 backdrop-blur-xl flex items-center gap-3 animate-pulse shadow-xl shadow-accent/10">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-accent">
              Try Mine AI 2.0: Faster, Smarter & Fun Counselling
            </span>
          </div>
        </motion.div>

        <div className="max-w-6xl w-full flex flex-col items-center space-y-12 md:space-y-16 animate-billion text-center">
          <Logo size="lg" className="scale-75 md:scale-100" />
          
          <div className="space-y-6 md:space-y-8">
             <h2 className="text-4xl md:text-6xl lg:text-[10rem] font-black font-outfit tracking-tight leading-[0.9] md:leading-[0.85] text-slate-900 uppercase">
               NEURAL <br/><span className="text-prismatic">VOICE 2.0.</span>
             </h2>
             <p className="text-slate-400 text-base md:text-lg lg:text-2xl max-w-2xl mx-auto font-medium leading-relaxed pt-2 md:pt-4">
               Engineering high-fidelity sovereign multimodal reasoning and real-time voice intelligence. Experience the new Mine AI 2.0 core.
             </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full max-w-2xl pt-6 md:pt-10">
            <button onClick={onGetStarted} className="flex-1 button-billion !py-6 md:!py-8 text-lg md:text-xl shadow-2xl flex items-center justify-center gap-3 md:gap-4">
              <Mic className="w-[20px] h-[20px] md:w-[24px] md:h-[24px]" />
              Launch Voice 2.0
            </button>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="w-full py-24 md:py-40 px-6 md:px-8 relative bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-24 items-center">
          <div className="relative animate-billion">
            <div className="rounded-[2rem] md:rounded-[5rem] overflow-hidden shadow-2xl border-[8px] md:border-[12px] border-white relative z-10 bg-white">
              <img 
                src="https://lh3.googleusercontent.com/d/1h9SbEMQSi6Jjvh5xb1vjIsaVQq-X6Jbw" 
                alt="Joshua Fred" 
                className="w-full h-auto block hover:scale-[1.02] transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent pointer-events-none"></div>
            </div>
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-cyan-400/20 rounded-full blur-[80px]"></div>
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-accent/20 rounded-full blur-[80px]"></div>
          </div>

          <div className="space-y-8 md:space-y-12 animate-billion [animation-delay:0.2s]">
            <div className="space-y-4">
              <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.8em] text-accent">The Architect</span>
              <h2 className="text-4xl md:text-5xl lg:text-8xl font-black font-outfit text-slate-900 uppercase leading-[0.9]">Joshua <br/><span className="text-prismatic">Fred.</span></h2>
            </div>
            <p className="text-slate-500 text-lg md:text-xl lg:text-2xl font-medium leading-relaxed italic border-l-4 border-accent pl-6 md:pl-10 py-2">
              "MINE AI represents the pinnacle of autonomous intelligence. We've bridged the gap between raw multimodal processing and high-fidelity real-time interaction."
            </p>
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4 md:gap-6">
                 <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                    <div className="w-3 h-3 md:w-4 md:h-4 bg-accent rounded-full animate-pulse"></div>
                 </div>
                 <div>
                    <h4 className="font-black uppercase text-slate-900 text-xs md:text-sm tracking-widest">13-Year-Old Nigerian Dev</h4>
                    <p className="text-slate-400 text-[8px] md:text-xs font-bold uppercase tracking-widest">Master Architect of Sovereign Intelligence</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Co-Founder Section */}
      <section className="w-full py-24 md:py-40 px-6 md:px-8 relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-24 items-center">
          <div className="space-y-8 md:space-y-12 animate-billion order-2 lg:order-1">
            <div className="space-y-4">
              <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.8em] text-accent">The Counsellor</span>
              <h2 className="text-4xl md:text-5xl lg:text-8xl font-black font-outfit text-slate-900 uppercase leading-[0.9]">Chidimma <br/><span className="text-prismatic">Okoye.</span></h2>
            </div>
            <p className="text-slate-500 text-lg md:text-xl lg:text-2xl font-medium leading-relaxed italic border-l-4 border-accent pl-6 md:pl-10 py-2">
              "True intelligence requires emotional resonance. We are building systems that not only think but understand the human condition."
            </p>
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4 md:gap-6">
                 <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                    <div className="w-3 h-3 md:w-4 md:h-4 bg-accent rounded-full animate-pulse"></div>
                 </div>
                 <div>
                    <h4 className="font-black uppercase text-slate-900 text-xs md:text-sm tracking-widest">Co-Founder & Counsellor</h4>
                    <p className="text-slate-400 text-[8px] md:text-xs font-bold uppercase tracking-widest">Architect of Empathetic Systems</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="relative animate-billion order-1 lg:order-2">
            <div className="rounded-[2rem] md:rounded-[5rem] overflow-hidden shadow-2xl border-[8px] md:border-[12px] border-slate-50 relative z-10 bg-white">
              <img 
                src="https://lh3.googleusercontent.com/d/1tL3zK5VRoKpcUgZuEWa8CGCB1XcL9rYO" 
                alt="Chidimma Okoye" 
                className="w-full h-auto block hover:scale-[1.02] transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent pointer-events-none"></div>
            </div>
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-pink-400/20 rounded-full blur-[80px]"></div>
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-accent/20 rounded-full blur-[80px]"></div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="w-full py-24 md:py-40 px-6 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto text-center space-y-16 md:space-y-32">
          <div className="space-y-6 md:space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-8xl font-black font-outfit text-slate-900 uppercase">Powered by <br/><span className="text-prismatic">Sovereign Tech.</span></h2>
            <p className="text-slate-400 max-w-3xl mx-auto text-base md:text-lg font-medium">Integrated with MINE Neural Clusters for rapid visual synthesis and deep reasoning.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {[
              { title: 'Neural Voice', desc: 'Unlimited real-time voice intelligence for rapid high-fidelity interaction and sovereign reasoning.', icon: <Mic className="text-accent w-[28px] h-[28px] md:w-[32px] md:h-[32px]" /> },
              { title: 'Flash Reasoning', desc: 'Rapid 32K multimodal logic for complex problem solving and advanced planning.', icon: <Zap className="text-cyan-400 w-[28px] h-[28px] md:w-[32px] md:h-[32px]" /> }
            ].map((tech, i) => (
              <div key={i} className="p-8 md:p-16 rounded-[2rem] md:rounded-[4rem] bg-slate-50 border border-slate-100 text-left space-y-4 md:space-y-6 hover:shadow-2xl transition-all hover:-translate-y-2 group">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl md:rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {tech.icon}
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">{tech.title}</h3>
                <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <footer className="w-full bg-white py-24 px-8 border-t border-slate-50 flex flex-col items-center gap-12">
        <Logo size="sm" showText={false} />
        <div className="flex flex-col items-center gap-4">
          <p className="text-[11px] font-black uppercase tracking-[0.8em] text-slate-300">MINE AI • JOSHUA FRED • 2025</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

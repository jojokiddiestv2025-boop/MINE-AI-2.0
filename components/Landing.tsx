
import React from 'react';
import Logo from './Logo';
import { Sparkles, Zap, Shield, ArrowRight, Github, Twitter, Globe, Cpu, Music } from 'lucide-react';
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
      <nav className="fixed top-0 w-full px-8 lg:px-20 py-8 flex justify-between items-center z-[100] bg-white/80 backdrop-blur-2xl border-b border-slate-50">
        <div className="flex items-center gap-4">
          <Logo size="sm" showText={false} />
          <div className="flex flex-col">
            <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900">MINE <span className="text-accent">AI</span></h1>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">SOVEREIGN CORE V3.1</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={onAuthClick} className="hidden md:block text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-slate-900 transition-colors">
            {isLoggedIn ? 'Dashboard' : 'Sign In'}
          </button>
          <button onClick={onGetStarted} className="button-billion !py-4 shadow-xl shadow-accent/20 flex items-center gap-3">
            <Cpu size={18} />
            Initialize
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center pt-32 pb-20 relative w-full px-6 overflow-hidden">
        <div className="mesh-gradient opacity-30"></div>
        <div className="max-w-6xl w-full flex flex-col items-center space-y-16 animate-billion text-center">
          <Logo size="xl" />
          
          <div className="space-y-8">
             <h2 className="text-6xl lg:text-[10rem] font-black font-outfit tracking-tight leading-[0.85] text-slate-900 uppercase">
               NEURAL <br/><span className="text-prismatic">IMAGINE.</span>
             </h2>
             <p className="text-slate-400 text-lg lg:text-2xl max-w-2xl mx-auto font-medium leading-relaxed pt-4">
               Engineering high-fidelity visual synthesis and sovereign multimodal reasoning using Mine AI Core.
             </p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 w-full max-w-2xl pt-10">
            <button onClick={onGetStarted} className="flex-1 button-billion !py-8 text-xl shadow-2xl flex items-center justify-center gap-4">
              <Sparkles size={24} />
              Launch Imagine
            </button>
            <button className="flex-1 py-8 px-12 rounded-[1.5rem] bg-slate-50 text-slate-400 text-sm font-black uppercase tracking-[0.4em] border border-slate-100 hover:bg-slate-100 transition-all flex items-center justify-center gap-4">
              <Globe size={20} />
              Documentation
            </button>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="w-full py-40 px-8 relative bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="relative animate-billion">
            <div className="aspect-square rounded-[5rem] overflow-hidden shadow-2xl border-[12px] border-white relative z-10">
              <img 
                src="https://lh3.googleusercontent.com/d/1h9SbEMQSi6Jjvh5xb1vjIsaVQq-X6Jbw" 
                alt="Joshua Fred" 
                className="w-full h-full object-cover bg-accent/5"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-accent/20 to-transparent"></div>
            </div>
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-cyan-400/20 rounded-full blur-[80px]"></div>
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-accent/20 rounded-full blur-[80px]"></div>
          </div>

          <div className="space-y-12 animate-billion [animation-delay:0.2s]">
            <div className="space-y-4">
              <span className="text-[12px] font-black uppercase tracking-[0.8em] text-accent">The Architect</span>
              <h2 className="text-5xl lg:text-8xl font-black font-outfit text-slate-900 uppercase leading-[0.9]">Joshua <br/><span className="text-prismatic">Fred.</span></h2>
            </div>
            <p className="text-slate-500 text-xl lg:text-2xl font-medium leading-relaxed italic border-l-4 border-accent pl-10 py-2">
              "MINE AI represents the pinnacle of autonomous creativity. We've bridged the gap between raw multimodal processing and high-fidelity visual production."
            </p>
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-6">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                    <div className="w-4 h-4 bg-accent rounded-full animate-pulse"></div>
                 </div>
                 <div>
                    <h4 className="font-black uppercase text-slate-900 text-sm tracking-widest">13-Year-Old Nigerian Dev</h4>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Master Architect of Sovereign Intelligence</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="w-full py-40 px-8 bg-white">
        <div className="max-w-7xl mx-auto text-center space-y-32">
          <div className="space-y-8">
            <h2 className="text-5xl lg:text-8xl font-black font-outfit text-slate-900 uppercase">Powered by <br/><span className="text-prismatic">Sovereign Tech.</span></h2>
            <p className="text-slate-400 max-w-3xl mx-auto text-lg font-medium">Integrated with MINE Neural Clusters for rapid visual synthesis and deep reasoning.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { title: 'Mine AI', desc: 'Unlimited visual synthesis for rapid high-fidelity image generation and prototyping.', icon: <Sparkles className="text-accent" size={32} /> },
              { title: 'Flash Reasoning', desc: 'Rapid 32K multimodal logic for complex problem solving and advanced planning.', icon: <Zap className="text-cyan-400" size={32} /> }
            ].map((tech, i) => (
              <div key={i} className="p-16 rounded-[4rem] bg-slate-50 border border-slate-100 text-left space-y-6 hover:shadow-2xl transition-all hover:-translate-y-2 group">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {tech.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{tech.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{tech.desc}</p>
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

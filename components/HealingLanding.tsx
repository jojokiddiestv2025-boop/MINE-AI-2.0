
import React from 'react';
import { motion } from 'motion/react';
import { Heart, Sparkles, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

interface HealingLandingProps {
  onBack: () => void;
  onEnter: () => void;
  isLoggedIn: boolean;
}

const HealingLanding: React.FC<HealingLandingProps> = ({ onBack, onEnter, isLoggedIn }) => {
  return (
    <div className="min-h-screen bg-[#0a0502] text-[#e0d8d0] relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#ff4e0010,transparent_70%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ff4e00]/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#3a1510]/10 rounded-full blur-[150px] [animation-delay:2s] animate-pulse"></div>
      </div>

      {/* Header */}
      <nav className="absolute top-0 w-full p-8 flex justify-between items-center z-50">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.4em] text-[#e0d8d0]/40 hover:text-[#e0d8d0] transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Core
        </button>
        <img 
          src="https://lh3.googleusercontent.com/d/10P339qAplGMcC5io0w2F2qFmKfIGw3ZM" 
          alt="Healing Logo" 
          className="w-10 h-10 object-contain brightness-200"
        />
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl w-full flex flex-col items-center text-center space-y-16 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-[#ff4e00]/30"></div>
            <Heart className="text-[#ff4e00]" size={24} />
            <div className="h-[1px] w-12 bg-[#ff4e00]/30"></div>
          </div>
          <h1 className="text-6xl md:text-9xl font-black font-outfit uppercase tracking-tighter leading-[0.85]">
            Sovereign <br/><span className="text-[#ff4e00]">Restoration.</span>
          </h1>
          <p className="text-[#e0d8d0]/60 text-xl md:text-2xl max-w-2xl mx-auto font-medium leading-relaxed">
            Experience the pinnacle of neural balance. Healing with MMA combines advanced multimodal reasoning with meditative protocols for total mental clarity.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-10 w-full"
        >
          <button 
            onClick={onEnter}
            className="group relative px-12 py-8 bg-[#ff4e00] text-white rounded-[2rem] text-xl font-black uppercase tracking-[0.4em] shadow-[0_20px_60px_rgba(255,78,0,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-6 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <span>{isLoggedIn ? 'Enter Healing Core' : 'Sign In to Protocol'}</span>
            <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
          </button>

          {!isLoggedIn && (
            <button 
              onClick={onEnter}
              className="text-[11px] font-black uppercase tracking-[0.6em] text-[#e0d8d0]/40 hover:text-[#ff4e00] transition-colors"
            >
              New to MINE AI? Create Account
            </button>
          )}

          <div className="flex items-center gap-12 opacity-40">
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className="text-[#ff4e00]" />
              <span className="text-[10px] font-black uppercase tracking-widest">Secure Sync</span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles size={16} className="text-[#ff4e00]" />
              <span className="text-[10px] font-black uppercase tracking-widest">Neural Ready</span>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-12">
          {[
            { title: 'Live Counsellor', desc: 'Empathetic real-time AI voice support for emotional clarity.' },
            { title: 'Box Breathing', desc: '4-4-4-4 neural synchronization protocol.' },
            { title: 'Sovereign Space', desc: 'Private, encrypted restoration environment.' }
          ].map((item, i) => (
            <div key={i} className="p-10 rounded-[2.5rem] bg-white/5 border border-white/5 text-left space-y-4 hover:border-[#ff4e00]/20 transition-all group">
              <h3 className="text-[#ff4e00] font-black uppercase tracking-widest text-sm">{item.title}</h3>
              <p className="text-[#e0d8d0]/40 text-sm font-medium leading-relaxed group-hover:text-[#e0d8d0]/60 transition-colors">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-12 text-center opacity-10">
        <p className="text-[9px] font-black uppercase tracking-[1em]">MINE AI • HEALING LANDING V1.0</p>
      </footer>
    </div>
  );
};

export default HealingLanding;

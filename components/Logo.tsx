
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = true }) => {
  const sizes = { 
    sm: 'w-14 h-14', 
    md: 'w-48 h-48', 
    lg: 'w-72 h-72', 
    xl: 'w-[450px] h-[450px]' 
  };
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizes[size]} relative group select-none`}>
        <div className="absolute inset-0 bg-accent/30 blur-[100px] rounded-full animate-pulse group-hover:scale-125 transition-transform duration-1000"></div>
        <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-[0_0_30px_rgba(112,0,255,0.4)] transition-transform duration-700 group-hover:rotate-6">
          <defs>
            <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f2ff" />
              <stop offset="50%" stopColor="#7000ff" />
              <stop offset="100%" stopColor="#ff00ea" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M50 5 L92 27 L92 73 L50 95 L8 73 L8 27 Z" fill="url(#mainGradient)" />
          <path d="M50 22 L78 38 L50 54 L22 38 Z" fill="white" opacity="0.95" filter="url(#glow)" />
          <path d="M47 50 Q50 48 53 50 L53 82 Q50 85 47 82 Z" fill="white" opacity="0.9" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" />
        </svg>
      </div>
      {showText && (
        <div className="mt-12 text-center animate-billion">
          <h1 className="font-outfit font-black tracking-[-0.05em] text-prismatic" 
              style={{ fontSize: size === 'xl' ? '8rem' : '4rem', lineHeight: '0.9' }}>
            MINE <span className="text-white">AI</span>
          </h1>
          <div className="flex items-center gap-4 mt-4 justify-center">
            <div className="h-[1px] w-8 bg-white/20"></div>
            <p className="text-[11px] font-black uppercase tracking-[0.8em] text-slate-400">Neural Superintelligence</p>
            <div className="h-[1px] w-8 bg-white/20"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;

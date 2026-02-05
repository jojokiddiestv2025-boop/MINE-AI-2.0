import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = true }) => {
  const sizes = {
    sm: 'w-12',
    md: 'w-48',
    lg: 'w-72',
    xl: 'w-[420px]'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizes[size]} aspect-square relative group select-none`}>
        {/* Dynamic Multi-Layer Glow */}
        <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full scale-110 group-hover:scale-150 transition-all duration-[2s]"></div>
        <div className="absolute inset-0 bg-purple-500/10 blur-[80px] rounded-full scale-90 group-hover:scale-125 transition-all duration-[3s] animate-pulse"></div>
        <div className="absolute inset-0 bg-pink-500/5 blur-[120px] rounded-full group-hover:scale-110 transition-all duration-[4s]"></div>
        
        <svg viewBox="0 0 400 400" className="w-full h-full relative z-10 drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)] transition-transform duration-700 group-hover:scale-[1.02]">
          <defs>
            <linearGradient id="hexBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2c3e50" />
              <stop offset="100%" stopColor="#000000" />
            </linearGradient>
            <linearGradient id="circuitPrismatic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f2ff" />
              <stop offset="50%" stopColor="#7000ff" />
              <stop offset="100%" stopColor="#ff00ea" />
            </linearGradient>
            <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="hyperGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="prismaticBloom">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
            </filter>
          </defs>

          {/* Hexagon Core Shell */}
          <path d="M200 10 L370 110 L370 290 L200 390 L30 290 L30 110 Z" fill="rgba(255,255,255,0.03)" />
          <path d="M200 20 L360 110 L360 290 L200 380 L40 290 L40 110 Z" fill="url(#hexBaseGrad)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

          {/* Prismatic Neural Flow */}
          <g transform="translate(200, 200) scale(0.9) translate(-200, -200)" filter="url(#prismaticBloom)">
            <path d="M150 40 L340 120 L340 200 L230 140 Z" fill="url(#circuitPrismatic)" opacity="0.9" />
            <path d="M60 200 L60 280 L250 360 L170 260 Z" fill="url(#circuitPrismatic)" opacity="0.9" />
          </g>

          {/* High-Chrome Neural Link Pickaxe */}
          <g transform="rotate(-45, 200, 200) translate(0, -10)" filter="url(#hyperGlow)">
            {/* Precision Shaft */}
            <rect x="185" y="130" width="30" height="200" rx="15" fill="url(#chromeGrad)" />
            <rect x="194" y="145" width="8" height="170" rx="4" fill="rgba(255,255,255,0.9)" />
            
            {/* Prismatic Head */}
            <path d="M80 150 Q200 0 320 150 L200 130 Z" fill="url(#chromeGrad)" />
            <path d="M200 0 L320 150 L200 130 Z" fill="rgba(112,0,255,0.2)" />
            <path d="M80 150 Q200 0 200 130 Z" fill="rgba(0,242,255,0.2)" />
          </g>
        </svg>
      </div>
      
      {showText && (
        <div className="mt-12 animate-apex text-center">
          <h1 className="font-outfit font-black tracking-[-0.08em] text-prismatic" 
              style={{ fontSize: size === 'xl' ? '8rem' : size === 'lg' ? '5rem' : '3.5rem' }}>
            Mine AI
          </h1>
          <div className="flex items-center justify-center gap-6 opacity-60 mt-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white"></div>
            <span className="text-[12px] font-black uppercase tracking-[0.8em] text-white">Neural Superintelligence</span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
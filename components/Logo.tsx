import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = true }) => {
  const sizes = {
    sm: 'w-12',
    md: 'w-40',
    lg: 'w-64',
    xl: 'w-96'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizes[size]} aspect-square relative group select-none`}>
        {/* Enhanced atmospheric depth glow */}
        <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full scale-110 group-hover:scale-125 transition-transform duration-1000"></div>
        
        <svg viewBox="0 0 400 400" className="w-full h-full relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <defs>
            <linearGradient id="hexBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <linearGradient id="circuitBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Hexagon Background Shadow/Base */}
          <path d="M200 20 L360 110 L360 290 L200 380 L40 290 L40 110 Z" fill="#334155" />
          <path d="M200 25 L350 110 L350 285 L200 370 L50 285 L50 110 Z" fill="url(#hexBaseGrad)" />

          {/* Inner Circuit Sections (Blue) */}
          <g transform="translate(200, 200) scale(0.85) translate(-200, -200)">
            {/* Top Blue Part */}
            <path d="M150 40 L340 120 L340 200 L230 140 Z" fill="url(#circuitBlue)" />
            {/* Bottom Blue Part */}
            <path d="M60 200 L60 280 L250 360 L170 260 Z" fill="url(#circuitBlue)" />
            
            {/* Circuit Line Patterns */}
            <g stroke="rgba(255,255,255,0.4)" strokeWidth="3" fill="none">
              <path d="M280 100 L320 120 M300 130 L340 150" />
              <path d="M80 230 L120 250 M100 260 L140 280" />
              <circle cx="310" cy="115" r="4" fill="white" />
              <circle cx="90" cy="240" r="4" fill="white" />
            </g>
          </g>

          {/* Central Silver Pickaxe */}
          <g transform="rotate(-45, 200, 200) translate(0, -10)" filter="url(#innerGlow)">
            {/* Shaft */}
            <rect x="188" y="140" width="24" height="180" rx="12" fill="url(#chromeGrad)" stroke="#1e293b" strokeWidth="0.5" />
            <rect x="194" y="150" width="6" height="160" rx="3" fill="rgba(255,255,255,0.6)" />
            
            {/* Head */}
            <path d="M100 150 Q200 20 300 150 L200 130 Z" fill="url(#chromeGrad)" stroke="#1e293b" strokeWidth="0.5" />
            <path d="M200 20 L300 150 L200 130 Z" fill="rgba(0,0,0,0.2)" />
            <path d="M100 150 Q200 20 200 130 Z" fill="rgba(255,255,255,0.3)" />
          </g>
        </svg>
      </div>
      
      {showText && (
        <div className="mt-6 animate-reveal text-center">
          <h1 className="font-outfit font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
              style={{ fontSize: size === 'xl' ? '6rem' : size === 'lg' ? '4rem' : '2.8rem' }}>
            Mine <span className="text-blue-500">Ai</span>
          </h1>
          <div className="flex items-center justify-center gap-4 opacity-50 mt-2">
            <div className="h-[1px] w-10 bg-white"></div>
            <span className="text-[11px] font-black uppercase tracking-[0.6em] text-white">APEX INTERFACE</span>
            <div className="h-[1px] w-10 bg-white"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
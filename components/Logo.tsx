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
        {/* Atmospheric depth glow */}
        <div className="absolute inset-0 bg-blue-500/10 blur-[60px] rounded-full scale-110 group-hover:scale-125 transition-transform duration-1000"></div>
        
        <svg viewBox="0 0 400 400" className="w-full h-full relative z-10 drop-shadow-2xl">
          <defs>
            <linearGradient id="hexBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            <linearGradient id="circuitBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d2ff" />
              <stop offset="100%" stopColor="#0072ff" />
            </linearGradient>
            <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Hexagon Background Shadow/Base */}
          <path d="M200 20 L360 110 L360 290 L200 380 L40 290 L40 110 Z" fill="#242b38" />
          <path d="M200 25 L350 110 L350 285 L200 370 L50 285 L50 110 Z" fill="url(#hexBaseGrad)" />

          {/* Inner Circuit Sections (Blue) */}
          <g transform="translate(200, 200) scale(0.85) translate(-200, -200)">
            <path d="M200 40 L340 120 L340 200 L200 280 L60 200 L60 120 Z" fill="none" />
            
            {/* Top Blue Part */}
            <path d="M150 40 L340 120 L340 200 L230 140 Z" fill="url(#circuitBlue)" />
            {/* Bottom Blue Part */}
            <path d="M60 200 L60 280 L250 360 L170 260 Z" fill="url(#circuitBlue)" />
            
            {/* Circuit Line Patterns */}
            <g stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none">
              <path d="M280 100 L320 120 M300 130 L340 150 M320 160 L340 170" />
              <path d="M80 230 L120 250 M100 260 L140 280 M120 290 L160 310" />
              <circle cx="310" cy="115" r="3" fill="white" />
              <circle cx="90" cy="240" r="3" fill="white" />
            </g>
          </g>

          {/* Central Silver Pickaxe */}
          <g transform="rotate(-45, 200, 200) translate(0, -10)" filter="url(#innerGlow)">
            {/* Shaft */}
            <rect x="188" y="140" width="24" height="180" rx="12" fill="url(#chromeGrad)" />
            <rect x="194" y="150" width="6" height="160" rx="3" fill="rgba(255,255,255,0.4)" />
            
            {/* Head */}
            <path d="M100 150 Q200 20 300 150 L200 130 Z" fill="url(#chromeGrad)" />
            <path d="M200 20 L300 150 L200 130 Z" fill="rgba(0,0,0,0.15)" />
            <path d="M100 150 Q200 20 200 130 Z" fill="rgba(255,255,255,0.2)" />
          </g>
        </svg>
      </div>
      
      {showText && (
        <div className="mt-4 animate-reveal text-center">
          <h1 className="font-outfit font-black tracking-tight text-[#1e293b]" 
              style={{ fontSize: size === 'xl' ? '6rem' : size === 'lg' ? '4rem' : '2.5rem' }}>
            Mine <span className="text-[#1e293b]">Ai</span>
          </h1>
          <div className="flex items-center justify-center gap-4 opacity-30">
            <div className="h-[1px] w-8 bg-[#1e293b]"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#1e293b]">Official Node</span>
            <div className="h-[1px] w-8 bg-[#1e293b]"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
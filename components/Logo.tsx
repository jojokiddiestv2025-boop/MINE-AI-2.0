import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = false }) => {
  const sizes = {
    sm: 'w-10',
    md: 'w-32',
    lg: 'w-56',
    xl: 'w-80'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${sizes[size]} aspect-square group`}>
        {/* Deep Atmosphere Glow */}
        <div className="absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full scale-100 group-hover:scale-125 transition-transform duration-1000"></div>
        
        <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 transition-all duration-1000 ease-in-out">
          <defs>
            <linearGradient id="chromeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="apexBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00c2ff" />
              <stop offset="100%" stopColor="#0047ff" />
            </linearGradient>
            <filter id="hyperGlow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>

          {/* Outer Rotating Ring */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="10 20" className="animate-[spin_20s_linear_infinite]" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0,102,255,0.15)" strokeWidth="0.5" strokeDasharray="1 10" className="animate-[spin_30s_linear_infinite_reverse]" />

          {/* Main Core Hex */}
          <path d="M50 8 L87 30 L87 70 L50 92 L13 70 L13 30 Z" 
                fill="#010307" 
                stroke="rgba(255,255,255,0.1)" 
                strokeWidth="1.5" />
          
          {/* Active Core Pulse */}
          <path d="M50 15 L80 32 L80 68 L50 85 L20 68 L20 32 Z" 
                fill="url(#apexBlue)" 
                opacity="0.85" 
                filter="url(#hyperGlow)"
                className="animate-pulse" />

          {/* Precision Pickaxe Overlay */}
          <g transform="rotate(-45, 50, 50) translate(0, -6)">
             {/* Mirror Polished Shaft */}
             <rect x="47.5" y="35" width="5" height="50" rx="2.5" fill="url(#chromeGlow)" />
             <rect x="49" y="37" width="2" height="46" rx="1" fill="rgba(255,255,255,0.5)" />
             
             {/* Chrome Apex Head */}
             <path d="M22 46 Q50 12 78 46 L50 40 Z" fill="url(#chromeGlow)" stroke="#1e293b" strokeWidth="0.2" />
             <path d="M50 12 Q68 30 78 46 L50 40 Z" fill="rgba(0,0,0,0.2)" />
          </g>
        </svg>
      </div>
      
      {showText && (
        <div className="mt-12 flex flex-col items-center">
          <h1 className="font-outfit font-black tracking-[-0.1em] leading-none text-white flex items-baseline" 
              style={{ fontSize: size === 'xl' ? '7rem' : '4rem' }}>
            MINE
            <span className="ml-3 bg-gradient-to-br from-blue-400 to-blue-700 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,102,255,0.6)]">AI</span>
          </h1>
          <div className="mt-6 flex items-center gap-6 opacity-40">
            <div className="h-[0.5px] w-12 bg-white"></div>
            <span className="text-[11px] font-black uppercase tracking-[1em] text-white">Apex Interface</span>
            <div className="h-[0.5px] w-12 bg-white"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
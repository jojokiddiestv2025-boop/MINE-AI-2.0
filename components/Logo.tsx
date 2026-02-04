import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = false }) => {
  const sizes = {
    sm: 'w-10',
    md: 'w-24',
    lg: 'w-40',
    xl: 'w-64'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${sizes[size]} aspect-square`}>
        {/* Glow Layer */}
        <div className="absolute inset-0 bg-blue-500/20 blur-[30px] rounded-full scale-75 animate-pulse"></div>
        
        {/* Hexagonal Base */}
        <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          <defs>
            <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="metallic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <clipPath id="hexClip">
              <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" />
            </clipPath>
          </defs>
          
          {/* Main Hexagon Background */}
          <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="#0f172a" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          
          {/* Inner Area */}
          <g clipPath="url(#hexClip)">
            <path d="M50 8 L87 30 L87 70 L50 92 L13 70 L13 30 Z" fill="url(#circuitGrad)" opacity="0.9" />
            
            {/* Subtle Texture/Circuits */}
            <g stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" fill="none" opacity="0.6">
              <path d="M20 40 H40 V30 M30 50 H50 V70 M70 30 V50 H85 M60 80 V60 H40" />
              <circle cx="40" cy="30" r="0.8" fill="rgba(255,255,255,0.3)" />
              <circle cx="50" cy="70" r="0.8" fill="rgba(255,255,255,0.3)" />
              <circle cx="85" cy="50" r="0.8" fill="rgba(255,255,255,0.3)" />
            </g>
          </g>

          {/* The Silver Pickaxe with improved metallic look */}
          <g transform="rotate(-45, 50, 50) translate(0, -5)">
             {/* Handle */}
             <rect x="47" y="40" width="6" height="45" rx="3" fill="url(#metallic)" />
             
             {/* Pickaxe Head */}
             <path d="M30 45 L50 20 L70 45 L50 40 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.5" />
             <path d="M50 20 L70 45 L50 40 Z" fill="#cbd5e1" />
          </g>
        </svg>
      </div>
      
      {showText && (
        <h1 className="mt-6 font-outfit font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500" 
            style={{ fontSize: size === 'xl' ? '4.5rem' : '2.5rem' }}>
          MINE <span className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">AI</span>
        </h1>
      )}
    </div>
  );
};

export default Logo;
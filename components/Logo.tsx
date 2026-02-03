
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
        {/* Hexagonal Base */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
          <defs>
            <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00b4ff" />
              <stop offset="100%" stopColor="#0072ff" />
            </linearGradient>
            <clipPath id="hexClip">
              <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" />
            </clipPath>
          </defs>
          
          {/* Shadow Hexagon */}
          <path d="M52 7 L92 29.5 L92 74.5 L52 97 L12 74.5 L12 29.5 Z" fill="rgba(0,0,0,0.3)" />
          
          {/* Main Hexagon Background */}
          <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="#2d3436" />
          
          {/* Inner Blue Circuit Area */}
          <g clipPath="url(#hexClip)">
            <path d="M50 8 L87 30 L87 70 L50 92 L13 70 L13 30 Z" fill="url(#circuitGrad)" />
            
            {/* Circuit Lines */}
            <g stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" fill="none">
              <path d="M20 40 H40 V30 M30 50 H50 V70 M70 30 V50 H85 M60 80 V60 H40" />
              <circle cx="40" cy="30" r="1" fill="rgba(0,0,0,0.2)" />
              <circle cx="50" cy="70" r="1" fill="rgba(0,0,0,0.2)" />
              <circle cx="85" cy="50" r="1" fill="rgba(0,0,0,0.2)" />
              <circle cx="40" cy="60" r="1" fill="rgba(0,0,0,0.2)" />
            </g>
          </g>

          {/* The Silver Pickaxe */}
          <g transform="rotate(-45, 50, 50) translate(0, -5)">
             {/* Handle */}
             <rect x="47" y="40" width="6" height="45" rx="3" fill="#bdc3c7" />
             <rect x="47" y="40" width="3" height="45" rx="1.5" fill="#ecf0f1" opacity="0.5" />
             
             {/* Pickaxe Head */}
             <path d="M30 45 L50 20 L70 45 L50 40 Z" fill="#ecf0f1" stroke="#95a5a6" strokeWidth="0.5" />
             <path d="M50 20 L70 45 L50 40 Z" fill="#bdc3c7" />
          </g>
        </svg>
      </div>
      
      {showText && (
        <h1 className="mt-4 font-outfit font-extrabold text-[#2d3436] dark:text-white tracking-tight" 
            style={{ fontSize: size === 'xl' ? '4rem' : '2rem' }}>
          Mine Ai
        </h1>
      )}
    </div>
  );
};

export default Logo;

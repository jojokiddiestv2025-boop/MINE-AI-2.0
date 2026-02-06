
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = true }) => {
  const sizes = { sm: 'w-12', md: 'w-48', lg: 'w-72', xl: 'w-96' };
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizes[size]} aspect-square relative group select-none`}>
        <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full animate-pulse"></div>
        <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-xl">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f2ff" />
              <stop offset="50%" stopColor="#7000ff" />
              <stop offset="100%" stopColor="#ff00ea" />
            </linearGradient>
          </defs>
          <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="url(#g)" />
          <path d="M50 25 L75 40 L50 55 L25 40 Z" fill="white" opacity="0.8" />
          <rect x="47" y="50" width="6" height="30" rx="3" fill="white" />
        </svg>
      </div>
      {showText && (
        <div className="mt-8 text-center">
          <h1 className="font-outfit font-black tracking-tighter text-prismatic" style={{ fontSize: size === 'xl' ? '6rem' : '3rem' }}>
            Mine AI
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Neural Superintelligence</p>
        </div>
      )}
    </div>
  );
};

export default Logo;

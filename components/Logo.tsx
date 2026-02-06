
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = true }) => {
  const sizes = { 
    sm: 'w-16 h-16', 
    md: 'w-56 h-56', 
    lg: 'w-80 h-80', 
    xl: 'w-[450px] h-[450px]' 
  };
  
  const logoUrl = "https://lh3.googleusercontent.com/d/18F18te63zPCQfDOj_PP1o8i62sXxHuu3";
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizes[size]} relative group select-none`}>
        {/* Colorful Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 blur-[60px] opacity-20 rounded-full animate-pulse group-hover:scale-110 transition-transform duration-1000"></div>
        
        <div className="relative z-10 w-full h-full rounded-[2.5rem] p-2 bg-white/50 backdrop-blur-md shadow-2xl border border-white flex items-center justify-center overflow-hidden transition-all duration-700 group-hover:rotate-3 group-hover:scale-105">
          <img 
            src={logoUrl} 
            alt="MINE AI Logo" 
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>
      </div>
      
      {showText && (
        <div className="mt-12 text-center animate-billion">
          <h1 className="font-outfit font-black tracking-[-0.05em] text-prismatic" 
              style={{ fontSize: size === 'xl' ? '8.5rem' : '4.5rem', lineHeight: '0.9' }}>
            MINE <span className="text-slate-900">AI</span>
          </h1>
          <div className="flex items-center gap-4 mt-6 justify-center">
            <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-slate-200"></div>
            <p className="text-[12px] font-black uppercase tracking-[1em] text-slate-400">BY A 13-YEAR-OLD NIGERIAN DEVELOPER</p>
            <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-slate-200"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;

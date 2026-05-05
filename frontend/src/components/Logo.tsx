import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  hideText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 40, hideText = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
        >
          {/* Outer circle of 'G' */}
          <path
            d="M 50 10 
               C 27.9 10, 10 27.9, 10 50 
               C 10 72.1, 27.9 90, 50 90 
               C 66.5 90, 80.8 80, 86.8 65 
               L 71.5 60 
               C 67.5 70, 59.5 75, 50 75 
               C 36.2 75, 25 63.8, 25 50 
               C 25 36.2, 36.2 25, 50 25 
               C 61.5 25, 71.2 32.8, 74.2 44 
               L 50 44 
               L 50 56 
               L 89 56 
               C 89.6 54, 90 52, 90 50 
               C 90 27.9, 72.1 10, 50 10 Z"
            fill="url(#g-gradient)"
          />

          {/* Underlay shadow for depth */}
          <path
            d="M 50 44 L 89 44 C 88 35, 81 28, 73.5 25.5 Z"
            fill="white"
            opacity="0.1"
          />

          {/* Dynamic Intersecting Diagonal 'X' - Pink Layer */}
          <path
            d="M 64 12
               L 32 88
               L 48 88
               L 80 12 Z"
            fill="url(#x-pink)"
            opacity="0.85"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* Dynamic Intersecting Diagonal 'X' - Violet Layer */}
          <path
            d="M 36 12
               L 68 88
               L 52 88
               L 20 12 Z"
            fill="url(#x-violet)"
            opacity="0.85"
            style={{ mixBlendMode: 'screen' }}
          />

          <defs>
            <linearGradient id="g-gradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" /> {/* Rich blue */}
              <stop offset="0.6" stopColor="#06b6d4" /> {/* Cyan */}
              <stop offset="1" stopColor="#6366f1" /> {/* Indigo */}
            </linearGradient>
            <linearGradient id="x-pink" x1="32" y1="12" x2="80" y2="88" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ec4899" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="x-violet" x1="20" y1="12" x2="68" y2="88" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {!hideText && (
        <span className="font-unbounded font-black text-2xl tracking-tighter text-white inline-flex items-center select-none">
          Grade<span className="text-[#8b5cf6]">X</span>
        </span>
      )}
    </div>
  );
};

export default Logo;

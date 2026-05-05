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
          {/* Organic Circular Base 'G' */}
          <path
            d="M 72 24
               C 60 14, 32 16, 22 36
               C 12 56, 20 78, 44 80
               C 66 82, 78 66, 76 48
               L 48 48"
            stroke="url(#g-gradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Seamlessly Integrated Intersecting 'X' — Diagonal 1 (Top-Left to Bottom-Right) */}
          <path
            d="M 32 20 
               L 76 80"
            stroke="url(#x-pink)"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* Seamlessly Integrated Intersecting 'X' — Diagonal 2 (Bottom-Left to Top-Right) */}
          <path
            d="M 32 80 
               L 76 20"
            stroke="url(#x-violet)"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
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

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Glow */}
        <div className="absolute inset-0 bg-purple-600/30 blur-xl rounded-full scale-150 animate-pulse" />
        
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 w-full h-full drop-shadow-[0_0_15px_rgba(124,58,237,0.4)]"
        >
          {/* Main G-Loop */}
          <path
            d="M 45 15 C 25 15 10 30 10 50 C 10 70 25 85 45 85 C 60 85 72 75 77 62 L 63 58 C 60 65 53 70 45 70 C 34 70 25 61 25 50 C 25 39 34 30 45 30 C 53 30 60 35 63 42 L 50 42 L 50 54 L 85 54 L 85 50 C 85 30 70 15 45 15 Z"
            fill="url(#gx-gradient)"
          />
          {/* Intersecting X-Diagonal Left-to-Right */}
          <path
            d="M 52 15 L 75 15 L 45 60 L 58 85 L 35 85 Z"
            fill="url(#x-gradient-1)"
            opacity="0.95"
          />
          {/* Intersecting X-Diagonal Right-to-Left with glowing overlap */}
          <path
            d="M 48 85 L 25 85 L 55 40 L 42 15 L 65 15 Z"
            fill="url(#x-gradient-2)"
            opacity="0.95"
          />
          <defs>
            <linearGradient id="gx-gradient" x1="10" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C3AED" />
              <stop offset="0.5" stopColor="#06B6D4" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id="x-gradient-1" x1="35" y1="15" x2="75" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06B6D4" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id="x-gradient-2" x1="25" y1="15" x2="65" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EC4899" />
              <stop offset="1" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <span className="font-unbounded font-black text-2xl tracking-tighter text-white inline-flex items-center">
        Grade<span className="text-purple-accent">X</span>
      </span>
    </div>
  );
};

export default Logo;

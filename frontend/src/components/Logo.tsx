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
          className="relative z-10 w-full h-full drop-shadow-2xl"
        >
          {/* Main Diamond Shape */}
          <path
            d="M50 5L95 50L50 95L5 50L50 5Z"
            fill="url(#logo-gradient)"
            stroke="white"
            strokeWidth="2"
            strokeOpacity="0.1"
          />
          
          {/* Stylized X / Checkmark */}
          <path
            d="M35 50L45 60L65 40"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw"
          />
          
          {/* Decorative Elements */}
          <circle cx="50" cy="50" r="45" stroke="url(#border-gradient)" strokeWidth="1" strokeDasharray="4 4" />
          
          <defs>
            <linearGradient id="logo-gradient" x1="5" y1="5" x2="95" y2="95" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C3AED" />
              <stop offset="1" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id="border-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" stopOpacity="0.5" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
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

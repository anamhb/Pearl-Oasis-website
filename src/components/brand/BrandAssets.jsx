import React from 'react';

/**
 * BrandAssets.jsx
 * Preserves the exact Pearl Oasis visual identity:
 * - Handcrafted cursive gold script wordmark (from logo-text.png)
 * - Ornate gold arabesque crest emblem (from logo.PNG)
 * - Architectural illuminated marquee (from Pearl Oasis Entrance Corridor.png)
 * - 3D Rotating Gold Emblem Medallion (Continuous 360° animation)
 */

export const PearlOasisEmblem = ({ className = "w-10 h-10" }) => {
  return (
    <svg
      viewBox="0 0 120 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pearl Oasis Emblem"
    >
      <defs>
        <linearGradient id="poGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fae08c" />
          <stop offset="35%" stopColor="#dfb746" />
          <stop offset="70%" stopColor="#b6891e" />
          <stop offset="100%" stopColor="#ffd875" />
        </linearGradient>
        <filter id="poGoldShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
        </filter>
      </defs>

      <g filter="url(#poGoldShadow)">
        <path
          d="M60 4 C64 16 70 28 60 40 C50 28 56 16 60 4 Z"
          fill="url(#poGoldGrad)"
        />
        <path
          d="M60 38 C68 28 84 26 82 44 C80 56 68 56 60 68 C52 56 40 56 38 44 C36 26 52 28 60 38 Z"
          fill="url(#poGoldGrad)"
        />
        <path
          d="M38 44 C26 38 18 50 24 64 C28 72 38 72 38 64 C38 56 32 54 38 44 Z"
          fill="url(#poGoldGrad)"
        />
        <path
          d="M82 44 C94 38 102 50 96 64 C92 72 82 72 82 64 C82 56 88 54 82 44 Z"
          fill="url(#poGoldGrad)"
        />
        <path
          d="M60 62 C72 54 88 64 94 78 C98 86 92 98 80 96 C72 94 70 82 60 88 C50 82 48 94 40 96 C28 98 22 86 26 78 C32 64 48 54 60 62 Z"
          fill="url(#poGoldGrad)"
        />
        <path
          d="M60 70 C64 78 72 82 68 90 C64 96 56 96 52 90 C48 82 56 78 60 70 Z"
          fill="#ffd875"
        />
        <path
          d="M60 92 C68 104 76 112 60 128 C44 112 52 104 60 92 Z"
          fill="url(#poGoldGrad)"
        />
        <path
          d="M50 114 C38 116 34 126 40 136 C46 142 54 136 50 126 Z"
          fill="url(#poGoldGrad)"
        />
        <path
          d="M70 114 C82 116 86 126 80 136 C74 142 66 136 70 126 Z"
          fill="url(#poGoldGrad)"
        />
        <path
          d="M60 130 C63 140 65 148 60 156 C55 148 57 140 60 130 Z"
          fill="url(#poGoldGrad)"
        />
      </g>
    </svg>
  );
};

export const PearlOasisRotating3DLogo = ({ className = "w-24 h-24" }) => {
  return (
    <div className={`relative flex items-center justify-center [perspective:1000px] ${className}`}>
      {/* 3D Container rotating continuously 360 degrees */}
      <div className="relative w-full h-full animate-rotate-3d flex items-center justify-center">
        {/* Soft radial gold glow background */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#d4af37]/25 via-[#ffd875]/40 to-[#d4af37]/25 blur-lg pointer-events-none" />

        {/* Outer Golden Beveled Ring */}
        <div className="absolute inset-1 rounded-full border-2 border-[#d4af37]/70 shadow-[0_0_20px_rgba(212,175,55,0.45)] bg-gradient-to-tr from-[#16140f]/90 via-[#262013]/90 to-[#16140f]/90" />

        {/* Inner Filigree Ring */}
        <div className="absolute inset-3 rounded-full border border-[#f5cf68]/40 border-dashed opacity-80" />

        {/* Central Emblem Badge with drop shadow and dimensional pop */}
        <div className="relative z-10 p-2 transform-gpu">
          <PearlOasisEmblem className="w-12 h-16 sm:w-14 sm:h-18 drop-shadow-[0_4px_16px_rgba(212,175,55,0.65)]" />
        </div>
      </div>
    </div>
  );
};

export const PearlOasisWordmark = ({ className = "h-10", showSubtitle = true }) => {
  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <span
        className="font-script text-3xl sm:text-4xl tracking-wide text-gold-shimmer leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] select-none"
        style={{ fontFamily: "'Alex Brush', cursive" }}
      >
        Pearl Oasis
      </span>
      {showSubtitle && (
        <span
          className="font-cinzel text-[9px] sm:text-[10px] tracking-[0.35em] text-[#d4af37] font-semibold mt-1 uppercase select-none opacity-90"
        >
          Restaurant
        </span>
      )}
    </div>
  );
};

export const PearlOasisFullLogo = ({ className = "", variant = 'horizontal' }) => {
  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <PearlOasisEmblem className="w-12 h-16 drop-shadow-[0_4px_12px_rgba(212,175,55,0.3)]" />
        <PearlOasisWordmark showSubtitle={true} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <PearlOasisEmblem className="w-8 h-10 drop-shadow-[0_2px_8px_rgba(212,175,55,0.25)] shrink-0" />
      <PearlOasisWordmark showSubtitle={true} />
    </div>
  );
};

export const EntranceSignMarquee = ({ className = "" }) => {
  return (
    <div className={`relative px-6 py-3 bg-[#121316] border border-[#2b2518] rounded shadow-2xl flex flex-col items-center justify-center ${className}`}>
      <div className="absolute inset-x-0 -top-px h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
      <div className="text-[11px] uppercase tracking-[0.45em] text-[#e0b84c] font-cinzel font-medium">
        Pearl Oasis
      </div>
      <div className="text-xl sm:text-2xl font-black uppercase tracking-[0.25em] text-[#fff3cf] drop-shadow-[0_0_12px_rgba(255,220,120,0.65)] mt-0.5">
        Entrance
      </div>
      <div className="absolute inset-x-4 -bottom-1 h-[2px] bg-gradient-to-r from-transparent via-[#ffd875] to-transparent shadow-[0_0_8px_#ffd875]" />
    </div>
  );
};

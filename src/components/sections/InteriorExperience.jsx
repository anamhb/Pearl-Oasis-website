import React from 'react';

export const InteriorExperience = () => {
  return (
    <section id="spaces" className="relative py-28 px-6 sm:px-12 bg-[#08090a] border-t border-[#1f1d18]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 text-xs font-cinzel tracking-[0.3em] text-[#d4af37] uppercase mb-3">
            <span>Architectural Ambience</span>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <span>Spatial Design</span>
          </div>
          <h2 className="font-serif-luxury text-4xl sm:text-5xl text-[#f6efe4] font-normal tracking-tight mb-4">
            Sanctuary of Light & Shadow
          </h2>
          <p className="text-sm text-[#a49c90] font-sans leading-relaxed">
            From the double glass doors of the grand entrance to the quiet intimacy of the emerald dining salon, every space at Pearl Oasis is choreographed to soothe the senses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          <div className="lg:col-span-8 group relative rounded-lg overflow-hidden bg-[#111215] border border-[#25221b]">
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <img
                src="/src/assets/images/dining_room_ambience_1792153715910.jpg"
                alt="Pearl Oasis Main Dining Salon"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            </div>

            <div className="p-8 relative">
              <div className="flex items-center gap-2 text-xs font-cinzel tracking-[0.2em] text-[#d4af37] uppercase mb-2">
                <span>The Emerald Dining Hall</span>
                <span aria-hidden="true" className="text-neutral-700">·</span>
                <span>Main Salon</span>
              </div>
              <h3 className="font-serif-luxury text-3xl text-[#f8f5ee] font-normal mb-3">
                Intimate Twilight & Warm Amber Glow
              </h3>
              <p className="text-sm text-[#9f978c] leading-relaxed max-w-2xl font-sans">
                Curved emerald velvet banquettes framed by dark fluted walnut pillars and hand-blown amber glass pendant lights that cast a soft, flattering glow across every table.
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 group relative rounded-lg overflow-hidden bg-[#111215] border border-[#25221b] flex flex-col justify-between">
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <img
                src="/src/assets/images/sommelier_cellar_1792153715471.jpg"
                alt="Sommelier Cellar at Pearl Oasis"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            </div>

            <div className="p-8">
              <div className="flex items-center gap-2 text-xs font-cinzel tracking-[0.2em] text-[#d4af37] uppercase mb-2">
                <span>Private Reserve</span>
                <span aria-hidden="true" className="text-neutral-700">·</span>
                <span>The Vault</span>
              </div>
              <h3 className="font-serif-luxury text-2xl text-[#f8f5ee] font-normal mb-3">
                The Sommelier’s Cellar
              </h3>
              <p className="text-sm text-[#9f978c] leading-relaxed font-sans mb-4">
                Climate-controlled architectural wine library holding rare vintage champagnes and artisanal European terroir collections.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg bg-[#101114] border border-[#232019]">
            <div className="text-xs font-cinzel tracking-[0.2em] text-[#d4af37] uppercase mb-2">
              01. The Entrance Corridor
            </div>
            <h4 className="font-serif-luxury text-xl text-[#f3ece0] mb-2 font-normal">
              Polished Marble & Fluted Walnut
            </h4>
            <p className="text-xs text-[#958c7f] leading-relaxed font-sans">
              Inspired by majestic classical portals, featuring linear amber light columns and mirrored marble floors that reflect overhead coffered ceilings.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-[#101114] border border-[#232019]">
            <div className="text-xs font-cinzel tracking-[0.2em] text-[#d4af37] uppercase mb-2">
              02. The Chef's Robata Counter
            </div>
            <h4 className="font-serif-luxury text-xl text-[#f3ece0] mb-2 font-normal">
              Theater of Live Fire
            </h4>
            <p className="text-xs text-[#958c7f] leading-relaxed font-sans">
              Twelve front-row counter seats where guests observe binchotan smoke culinary choreography and bespoke omakase plating.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-[#101114] border border-[#232019]">
            <div className="text-xs font-cinzel tracking-[0.2em] text-[#d4af37] uppercase mb-2">
              03. The Pearl Oasis Salon
            </div>
            <h4 className="font-serif-luxury text-xl text-[#f3ece0] mb-2 font-normal">
              Exclusive Private Dining
            </h4>
            <p className="text-xs text-[#958c7f] leading-relaxed font-sans">
              A private dining room accommodating up to 18 guests with dedicated sommelier service, acoustic isolation, and bespoke tasting menus.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

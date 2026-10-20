/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigation } from './components/ui/Navigation.jsx';
import { EntranceExperience } from './components/3d/EntranceExperience.jsx';
import { WelcomeStory } from './components/sections/WelcomeStory.jsx';
import { SignatureDishes } from './components/sections/SignatureDishes.jsx';
import { MenuExperience } from './components/sections/MenuExperience.jsx';
import { Testimonials } from './components/sections/Testimonials.jsx';
import { Footer } from './components/sections/Footer.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-[#08090a] text-[#e5e2db] flex flex-col font-sans selection:bg-[#d4af37]/30 selection:text-[#fef08a]">
      <Navigation />

      <main className="flex-1">
        <EntranceExperience />
        <WelcomeStory />
        <SignatureDishes />
        <MenuExperience />
        <Testimonials />
      </main>

      <Footer />
    </div>
  );
}

import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedCollections } from '@/components/home/FeaturedCollections';
import { NewArrivalsGrid } from '@/components/home/NewArrivalsGrid';
import { AgraHeritageBanner } from '@/components/home/AgraHeritageBanner';
import { CraftsmanshipStory } from '@/components/home/CraftsmanshipStory';
import { TrustFeatures } from '@/components/home/TrustFeatures';

export const HomePage: React.FC = () => {
  return (
    <div className="animate-fade-in">
      <HeroSection />
      <FeaturedCollections />
      <NewArrivalsGrid />
      <AgraHeritageBanner />
      <CraftsmanshipStory />
      <TrustFeatures />
    </div>
  );
};

import React from 'react';
import { SectionType } from '@/types/landing-page';
import { HeroSection } from './sections/HeroSection';
import { TimerSection } from './sections/TimerSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { FAQSection } from './sections/FAQSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { ComparisonSection } from './sections/ComparisonSection';
import { PricingSection } from './sections/PricingSection';
import { StickyCTA } from './sections/StickyCTA';

interface SectionRendererProps {
  type: SectionType;
  data: any;
  waNumber: string;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ type, data, waNumber }) => {
  switch (type) {
    case 'hero':
      return <HeroSection data={data} waNumber={waNumber} />;
    case 'timer':
      return <TimerSection data={data} />;
    case 'features':
      return <FeaturesSection data={data} />;
    case 'faq':
      return <FAQSection data={data} />;
    case 'testimonials':
      return <TestimonialsSection data={data} />;
    case 'comparison':
      return <ComparisonSection data={data} />;
    case 'pricing':
      return <PricingSection data={data} waNumber={waNumber} />;
    case 'cta':
      return <StickyCTA data={data} waNumber={waNumber} />;
    default:
      return <div className="p-4 bg-gray-100 text-gray-500 text-center">Unknown Section Type: {type}</div>;
  }
};

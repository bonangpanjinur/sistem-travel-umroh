import React from 'react';
import { SectionType } from '@/types/landing-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Clock,
  Sparkles,
  BarChart3,
  MessageSquare,
  Scale,
  DollarSign,
  Send,
  Plus,
} from 'lucide-react';

interface SectionConfig {
  type: SectionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'hero' | 'content' | 'social' | 'conversion';
}

const SECTION_CONFIGS: SectionConfig[] = [
  {
    type: 'hero',
    label: 'Hero Section',
    description: 'Eye-catching header with title, subtitle, and image',
    icon: <Zap className="w-5 h-5" />,
    category: 'hero',
  },
  {
    type: 'timer',
    label: 'Countdown Timer',
    description: 'Create urgency with a countdown to a specific date',
    icon: <Clock className="w-5 h-5" />,
    category: 'content',
  },
  {
    type: 'features',
    label: 'Features',
    description: 'Showcase key features or benefits with icons',
    icon: <Sparkles className="w-5 h-5" />,
    category: 'content',
  },
  {
    type: 'comparison',
    label: 'Comparison',
    description: 'Compare your offering with competitors',
    icon: <Scale className="w-5 h-5" />,
    category: 'content',
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Answer common questions from your audience',
    icon: <MessageSquare className="w-5 h-5" />,
    category: 'content',
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Build trust with customer reviews and ratings',
    icon: <BarChart3 className="w-5 h-5" />,
    category: 'social',
  },
  {
    type: 'pricing',
    label: 'Pricing Plans',
    description: 'Display multiple pricing tiers with features',
    icon: <DollarSign className="w-5 h-5" />,
    category: 'conversion',
  },
  {
    type: 'cta',
    label: 'Call to Action',
    description: 'Final push to convert with a strong CTA',
    icon: <Send className="w-5 h-5" />,
    category: 'conversion',
  },
];

interface SectionSelectorProps {
  onSelect: (type: SectionType) => void;
  selectedSections?: SectionType[];
}

export function SectionSelector({ onSelect, selectedSections = [] }: SectionSelectorProps) {
  const categories = ['hero', 'content', 'social', 'conversion'] as const;

  return (
    <div className="space-y-4 w-full">
      {categories.map((category) => {
        const sections = SECTION_CONFIGS.filter((s) => s.category === category);
        const categoryLabel = {
          hero: 'Header',
          content: 'Content',
          social: 'Social Proof',
          conversion: 'Conversion',
        }[category];

        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{categoryLabel}</h3>
              <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">{sections.length}</Badge>
            </div>
            <div className="space-y-1">
              {sections.map((section) => {
                const isSelected = selectedSections.includes(section.type);
                return (
                  <Button
                    key={section.type}
                    variant="outline"
                    onClick={() => onSelect(section.type)}
                    className="w-full h-auto p-2 flex items-center justify-start gap-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
                    title={section.label}
                  >
                    <span className="flex-shrink-0 text-primary group-hover:text-primary/80">
                      {section.icon}
                    </span>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs font-medium text-foreground truncate">{section.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{section.description}</div>
                    </div>
                    {isSelected && (
                      <Badge className="flex-shrink-0 bg-accent text-accent-foreground text-xs">✓</Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SectionSelectorCard({ onSelect, selectedSections }: SectionSelectorProps) {
  return (
    <Card className="border border-border bg-card overflow-hidden flex flex-col">
      <CardHeader className="border-b border-border py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2 text-foreground">
          <Plus className="w-4 h-4 text-accent flex-shrink-0" />
          <span>Add Sections</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          Click to add section
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 overflow-y-auto flex-1 max-h-[calc(100vh-300px)]">
        <SectionSelector onSelect={onSelect} selectedSections={selectedSections} />
      </CardContent>
    </Card>
  );
}

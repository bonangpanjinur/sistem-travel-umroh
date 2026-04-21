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
    icon: <Zap className="w-6 h-6" />,
    category: 'hero',
  },
  {
    type: 'timer',
    label: 'Countdown Timer',
    description: 'Create urgency with a countdown to a specific date',
    icon: <Clock className="w-6 h-6" />,
    category: 'content',
  },
  {
    type: 'features',
    label: 'Features',
    description: 'Showcase key features or benefits with icons',
    icon: <Sparkles className="w-6 h-6" />,
    category: 'content',
  },
  {
    type: 'comparison',
    label: 'Comparison',
    description: 'Compare your offering with competitors',
    icon: <Scale className="w-6 h-6" />,
    category: 'content',
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Answer common questions from your audience',
    icon: <MessageSquare className="w-6 h-6" />,
    category: 'content',
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Build trust with customer reviews and ratings',
    icon: <BarChart3 className="w-6 h-6" />,
    category: 'social',
  },
  {
    type: 'pricing',
    label: 'Pricing Plans',
    description: 'Display multiple pricing tiers with features',
    icon: <DollarSign className="w-6 h-6" />,
    category: 'conversion',
  },
  {
    type: 'cta',
    label: 'Call to Action',
    description: 'Final push to convert with a strong CTA',
    icon: <Send className="w-6 h-6" />,
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
    <div className="space-y-6 w-full">
      {categories.map((category) => {
        const sections = SECTION_CONFIGS.filter((s) => s.category === category);
        const categoryLabel = {
          hero: 'Header',
          content: 'Content',
          social: 'Social Proof',
          conversion: 'Conversion',
        }[category];

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{categoryLabel}</h3>
              <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">{sections.length}</Badge>
            </div>
            <div className="grid gap-2 grid-cols-1 w-full">
              {sections.map((section) => {
                const isSelected = selectedSections.includes(section.type);
                return (
                  <Button
                    key={section.type}
                    variant="outline"
                    onClick={() => onSelect(section.type)}
                    className="h-auto p-3 flex flex-col items-start justify-start gap-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-300 group w-full text-left"
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="flex items-start gap-2 text-primary group-hover:text-primary flex-1 min-w-0">
                        <span className="flex-shrink-0 mt-0.5">{section.icon}</span>
                        <span className="font-medium text-sm text-foreground break-words">{section.label}</span>
                      </div>
                      {isSelected && (
                        <Badge className="flex-shrink-0 bg-accent text-accent-foreground text-xs">Added</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{section.description}</p>
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
    <Card className="border-2 border-dashed border-border bg-card overflow-hidden flex flex-col h-fit">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <Plus className="w-4 h-4 text-accent" />
          Add Sections
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          Choose from pre-built sections
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 overflow-y-auto flex-1">
        <SectionSelector onSelect={onSelect} selectedSections={selectedSections} />
      </CardContent>
    </Card>
  );
}

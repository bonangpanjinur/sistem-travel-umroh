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
    <div className="space-y-6">
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
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {sections.map((section) => {
                const isSelected = selectedSections.includes(section.type);
                return (
                  <Button
                    key={section.type}
                    variant="outline"
                    onClick={() => onSelect(section.type)}
                    className="h-auto p-4 flex flex-col items-start justify-start gap-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-2 text-primary group-hover:text-primary">
                        {section.icon}
                        <span className="font-medium text-sm text-left text-foreground">{section.label}</span>
                      </div>
                      {isSelected && (
                        <Badge className="ml-auto bg-accent text-accent-foreground">Added</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground text-left">{section.description}</p>
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
    <Card className="border-2 border-dashed border-border bg-card">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <Plus className="w-5 h-5 text-accent" />
          Add Sections
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Choose from pre-built sections to create your landing page
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SectionSelector onSelect={onSelect} selectedSections={selectedSections} />
      </CardContent>
    </Card>
  );
}

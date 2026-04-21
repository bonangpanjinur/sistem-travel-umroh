import React, { useState } from 'react';
import { LPSection, SectionType } from '@/types/landing-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Copy, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionEditorProps {
  section: LPSection;
  onUpdate: (section: LPSection) => void;
  onDelete: () => void;
}

export function SectionEditor({ section, onUpdate, onDelete }: SectionEditorProps) {
  const [editMode, setEditMode] = useState<'visual' | 'json'>('visual');

  const handleDataChange = (newData: any) => {
    onUpdate({ ...section, data: newData });
  };

  return (
    <Card className="overflow-hidden border-l-4 border-l-primary">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 py-3 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="capitalize">{section.type}</Badge>
            <span className="text-sm font-medium text-muted-foreground">Section #{section.order + 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onDelete()} className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs value={editMode} onValueChange={(val) => setEditMode(val as 'visual' | 'json')} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="visual">Visual Editor</TabsTrigger>
            <TabsTrigger value="json">JSON Editor</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-4">
            {section.type === 'hero' && (
              <HeroEditor data={section.data} onChange={handleDataChange} />
            )}
            {section.type === 'timer' && (
              <TimerEditor data={section.data} onChange={handleDataChange} />
            )}
            {section.type === 'features' && (
              <FeaturesEditor data={section.data} onChange={handleDataChange} />
            )}
            {section.type === 'faq' && (
              <FAQEditor data={section.data} onChange={handleDataChange} />
            )}
            {section.type === 'testimonials' && (
              <TestimonialsEditor data={section.data} onChange={handleDataChange} />
            )}
            {section.type === 'comparison' && (
              <ComparisonEditor data={section.data} onChange={handleDataChange} />
            )}
            {section.type === 'pricing' && (
              <PricingEditor data={section.data} onChange={handleDataChange} />
            )}
            {section.type === 'cta' && (
              <CTAEditor data={section.data} onChange={handleDataChange} />
            )}
          </TabsContent>

          <TabsContent value="json">
            <div className="space-y-2">
              <Label>JSON Data</Label>
              <textarea
                className="w-full p-3 border border-gray-200 rounded-md font-mono text-xs h-48 bg-gray-50"
                value={JSON.stringify(section.data, null, 2)}
                onChange={(e) => {
                  try {
                    const newData = JSON.parse(e.target.value);
                    handleDataChange(newData);
                  } catch (err) {
                    // Silently wait for valid JSON
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Edit the JSON directly for advanced customization.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Hero Section Editor
function HeroEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={data.title || ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Hero title"
        />
      </div>
      <div className="space-y-2">
        <Label>Subtitle</Label>
        <Input
          value={data.subtitle || ''}
          onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
          placeholder="Hero subtitle"
        />
      </div>
      <div className="space-y-2">
        <Label>Image URL</Label>
        <Input
          value={data.imageUrl || ''}
          onChange={(e) => onChange({ ...data, imageUrl: e.target.value })}
          placeholder="https://example.com/image.jpg"
          type="url"
        />
      </div>
      <div className="space-y-2">
        <Label>CTA Button Text</Label>
        <Input
          value={data.ctaText || ''}
          onChange={(e) => onChange({ ...data, ctaText: e.target.value })}
          placeholder="Call to action text"
        />
      </div>
      <div className="space-y-2">
        <Label>Background Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={data.bgColor || '#ffffff'}
            onChange={(e) => onChange({ ...data, bgColor: e.target.value })}
            className="h-10 w-20 rounded border"
          />
          <Input
            value={data.bgColor || '#ffffff'}
            onChange={(e) => onChange({ ...data, bgColor: e.target.value })}
            placeholder="#ffffff"
          />
        </div>
      </div>
    </div>
  );
}

// Timer Section Editor
function TimerEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={data.title || ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Timer title"
        />
      </div>
      <div className="space-y-2">
        <Label>End Date & Time</Label>
        <Input
          type="datetime-local"
          value={data.endDate ? new Date(data.endDate).toISOString().slice(0, 16) : ''}
          onChange={(e) => onChange({ ...data, endDate: new Date(e.target.value).toISOString() })}
        />
      </div>
      <div className="space-y-2">
        <Label>Timer Text Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={data.textColor || '#000000'}
            onChange={(e) => onChange({ ...data, textColor: e.target.value })}
            className="h-10 w-20 rounded border"
          />
          <Input
            value={data.textColor || '#000000'}
            onChange={(e) => onChange({ ...data, textColor: e.target.value })}
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  );
}

// Features Section Editor
function FeaturesEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const features = data.features || [];

  const addFeature = () => {
    onChange({
      ...data,
      features: [...features, { id: Date.now().toString(), text: '', description: '', icon: '✨' }],
    });
  };

  const updateFeature = (index: number, field: string, value: string) => {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, features: updated });
  };

  const removeFeature = (index: number) => {
    onChange({ ...data, features: features.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={data.title || ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Features title"
        />
      </div>
      <div className="space-y-2">
        <Label>Section Subtitle</Label>
        <Input
          value={data.subtitle || ''}
          onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
          placeholder="Features subtitle"
        />
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Features</Label>
          <Button size="sm" onClick={addFeature} className="gap-1">
            <Plus className="w-4 h-4" />
            Add Feature
          </Button>
        </div>

        {features.map((feature: any, index: number) => (
          <Card key={feature.id} className="p-4 bg-gray-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Feature #{index + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFeature(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input
                value={feature.text || ''}
                onChange={(e) => updateFeature(index, 'text', e.target.value)}
                placeholder="Feature title"
              />
              <Textarea
                value={feature.description || ''}
                onChange={(e) => updateFeature(index, 'description', e.target.value)}
                placeholder="Feature description"
                rows={2}
              />
              <Input
                value={feature.icon || ''}
                onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                placeholder="Icon emoji or URL"
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// FAQ Section Editor
function FAQEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const faqs = data.faqs || [];

  const addFAQ = () => {
    onChange({
      ...data,
      faqs: [...faqs, { id: Date.now().toString(), question: '', answer: '' }],
    });
  };

  const updateFAQ = (index: number, field: string, value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, faqs: updated });
  };

  const removeFAQ = (index: number) => {
    onChange({ ...data, faqs: faqs.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={data.title || ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="FAQ title"
        />
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">FAQs</Label>
          <Button size="sm" onClick={addFAQ} className="gap-1">
            <Plus className="w-4 h-4" />
            Add FAQ
          </Button>
        </div>

        {faqs.map((faq: any, index: number) => (
          <Card key={faq.id} className="p-4 bg-gray-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">FAQ #{index + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFAQ(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input
                value={faq.question || ''}
                onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                placeholder="Question"
              />
              <Textarea
                value={faq.answer || ''}
                onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                placeholder="Answer"
                rows={3}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Testimonials Section Editor
function TestimonialsEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const testimonials = data.testimonials || [];

  const addTestimonial = () => {
    onChange({
      ...data,
      testimonials: [...testimonials, { id: Date.now().toString(), name: '', role: '', content: '', rating: 5, image: '' }],
    });
  };

  const updateTestimonial = (index: number, field: string, value: any) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, testimonials: updated });
  };

  const removeTestimonial = (index: number) => {
    onChange({ ...data, testimonials: testimonials.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={data.title || ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Testimonials title"
        />
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Testimonials</Label>
          <Button size="sm" onClick={addTestimonial} className="gap-1">
            <Plus className="w-4 h-4" />
            Add Testimonial
          </Button>
        </div>

        {testimonials.map((testimonial: any, index: number) => (
          <Card key={testimonial.id} className="p-4 bg-gray-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Testimonial #{index + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeTestimonial(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input
                value={testimonial.name || ''}
                onChange={(e) => updateTestimonial(index, 'name', e.target.value)}
                placeholder="Name"
              />
              <Input
                value={testimonial.role || ''}
                onChange={(e) => updateTestimonial(index, 'role', e.target.value)}
                placeholder="Role/Title"
              />
              <Textarea
                value={testimonial.content || ''}
                onChange={(e) => updateTestimonial(index, 'content', e.target.value)}
                placeholder="Testimonial content"
                rows={3}
              />
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Rating (1-5)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={testimonial.rating || 5}
                    onChange={(e) => updateTestimonial(index, 'rating', parseInt(e.target.value))}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Image URL</Label>
                  <Input
                    value={testimonial.image || ''}
                    onChange={(e) => updateTestimonial(index, 'image', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Comparison Section Editor
function ComparisonEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const features = data.features || [];

  const addFeature = () => {
    onChange({
      ...data,
      features: [...features, { id: Date.now().toString(), name: '', ourValue: true, otherValue: false }],
    });
  };

  const updateFeature = (index: number, field: string, value: any) => {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, features: updated });
  };

  const removeFeature = (index: number) => {
    onChange({ ...data, features: features.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={data.title || ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Comparison title"
        />
      </div>
      <div className="space-y-2">
        <Label>Subtitle</Label>
        <Input
          value={data.subtitle || ''}
          onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
          placeholder="Comparison subtitle"
        />
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Comparison Features</Label>
          <Button size="sm" onClick={addFeature} className="gap-1">
            <Plus className="w-4 h-4" />
            Add Feature
          </Button>
        </div>

        {features.map((feature: any, index: number) => (
          <Card key={feature.id} className="p-4 bg-gray-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Feature #{index + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFeature(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input
                value={feature.name || ''}
                onChange={(e) => updateFeature(index, 'name', e.target.value)}
                placeholder="Feature name"
              />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feature.ourValue || false}
                    onChange={(e) => updateFeature(index, 'ourValue', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">We have it</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feature.otherValue || false}
                    onChange={(e) => updateFeature(index, 'otherValue', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">They have it</span>
                </label>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Pricing Section Editor
function PricingEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const plans = data.plans || [];

  const addPlan = () => {
    onChange({
      ...data,
      plans: [...plans, { id: Date.now().toString(), name: '', price: '0', features: [], isPopular: false, ctaText: 'Choose Plan' }],
    });
  };

  const updatePlan = (index: number, field: string, value: any) => {
    const updated = [...plans];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, plans: updated });
  };

  const removePlan = (index: number) => {
    onChange({ ...data, plans: plans.filter((_: any, i: number) => i !== index) });
  };

  const addFeatureToPlan = (planIndex: number) => {
    const updated = [...plans];
    updated[planIndex].features = [...(updated[planIndex].features || []), ''];
    onChange({ ...data, plans: updated });
  };

  const updatePlanFeature = (planIndex: number, featureIndex: number, value: string) => {
    const updated = [...plans];
    updated[planIndex].features[featureIndex] = value;
    onChange({ ...data, plans: updated });
  };

  const removePlanFeature = (planIndex: number, featureIndex: number) => {
    const updated = [...plans];
    updated[planIndex].features = updated[planIndex].features.filter((_: any, i: number) => i !== featureIndex);
    onChange({ ...data, plans: updated });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={data.title || ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Pricing title"
        />
      </div>
      <div className="space-y-2">
        <Label>Section Subtitle</Label>
        <Input
          value={data.subtitle || ''}
          onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
          placeholder="Pricing subtitle"
        />
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Pricing Plans</Label>
          <Button size="sm" onClick={addPlan} className="gap-1">
            <Plus className="w-4 h-4" />
            Add Plan
          </Button>
        </div>

        {plans.map((plan: any, planIndex: number) => (
          <Card key={plan.id} className="p-4 bg-gray-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Plan #{planIndex + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removePlan(planIndex)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input
                value={plan.name || ''}
                onChange={(e) => updatePlan(planIndex, 'name', e.target.value)}
                placeholder="Plan name"
              />
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Price</Label>
                  <Input
                    type="number"
                    value={plan.price || '0'}
                    onChange={(e) => updatePlan(planIndex, 'price', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">CTA Button Text</Label>
                  <Input
                    value={plan.ctaText || ''}
                    onChange={(e) => updatePlan(planIndex, 'ctaText', e.target.value)}
                    placeholder="Choose Plan"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={plan.isPopular || false}
                  onChange={(e) => updatePlan(planIndex, 'isPopular', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Mark as popular</span>
              </label>

              <div className="space-y-2 mt-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Features</Label>
                  <Button size="sm" variant="outline" onClick={() => addFeatureToPlan(planIndex)} className="gap-1 h-7 text-xs">
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                </div>
                {(plan.features || []).map((feature: string, featureIndex: number) => (
                  <div key={featureIndex} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => updatePlanFeature(planIndex, featureIndex, e.target.value)}
                      placeholder="Feature"
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removePlanFeature(planIndex, featureIndex)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// CTA Section Editor
function CTAEditor({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Main Text</Label>
        <Input
          value={data.text || ''}
          onChange={(e) => onChange({ ...data, text: e.target.value })}
          placeholder="Call to action text"
        />
      </div>
      <div className="space-y-2">
        <Label>Subtext</Label>
        <Input
          value={data.subtext || ''}
          onChange={(e) => onChange({ ...data, subtext: e.target.value })}
          placeholder="Additional text"
        />
      </div>
      <div className="space-y-2">
        <Label>Background Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={data.bgColor || '#000000'}
            onChange={(e) => onChange({ ...data, bgColor: e.target.value })}
            className="h-10 w-20 rounded border"
          />
          <Input
            value={data.bgColor || '#000000'}
            onChange={(e) => onChange({ ...data, bgColor: e.target.value })}
            placeholder="#000000"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Text Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={data.textColor || '#ffffff'}
            onChange={(e) => onChange({ ...data, textColor: e.target.value })}
            className="h-10 w-20 rounded border"
          />
          <Input
            value={data.textColor || '#ffffff'}
            onChange={(e) => onChange({ ...data, textColor: e.target.value })}
            placeholder="#ffffff"
          />
        </div>
      </div>
    </div>
  );
}

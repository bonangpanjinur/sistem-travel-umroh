import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface FeaturesSectionProps {
  data: {
    title: string;
    subtitle: string;
    features: { id: string; text: string; description?: string }[];
  };
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ data }) => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            {data.title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {data.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.features.map((feature) => (
            <div key={feature.id} className="flex items-start p-6 bg-gray-50 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CheckCircle2 className="w-8 h-8 text-green-500 mr-4 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">
                  {feature.text}
                </h3>
                {feature.description && (
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

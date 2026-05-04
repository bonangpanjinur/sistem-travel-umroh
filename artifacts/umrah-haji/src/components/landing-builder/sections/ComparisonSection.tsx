import React from 'react';
import { Check, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ComparisonSectionProps {
  data: {
    title: string;
    subtitle: string;
    features: { id: string; name: string; ourValue: boolean | string; otherValue: boolean | string }[];
  };
}

export const ComparisonSection: React.FC<ComparisonSectionProps> = ({ data }) => {
  const renderValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? <Check className="w-6 h-6 text-green-500 mx-auto" /> : <X className="w-6 h-6 text-red-500 mx-auto" />;
    }
    return <span className="text-gray-700 font-medium">{value}</span>;
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            {data.title || "Kenapa Memilih Kami?"}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {data.subtitle || "Bandingkan keunggulan layanan kami dengan yang lain."}
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          <Table>
            <TableHeader className="bg-gray-900 text-white">
              <TableRow className="hover:bg-gray-900">
                <TableHead className="text-white font-bold text-lg py-6 px-8">Fitur & Layanan</TableHead>
                <TableHead className="text-white font-bold text-lg text-center py-6 px-8 bg-green-600">Layanan Kami</TableHead>
                <TableHead className="text-white font-bold text-lg text-center py-6 px-8">Layanan Lain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.features.map((feature) => (
                <TableRow key={feature.id} className="hover:bg-gray-50 border-b border-gray-100">
                  <TableCell className="font-semibold text-gray-900 py-6 px-8">{feature.name}</TableCell>
                  <TableCell className="text-center py-6 px-8 bg-green-50/30">{renderValue(feature.ourValue)}</TableCell>
                  <TableCell className="text-center py-6 px-8">{renderValue(feature.otherValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
};

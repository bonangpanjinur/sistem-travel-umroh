import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, User, ArrowLeft } from 'lucide-react';

interface NotFoundProps {
  type?: 'branch' | 'agent';
  slug?: string;
}

export function NotFound({ type = 'branch', slug }: NotFoundProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="flex justify-center">
          {type === 'branch' ? (
            <Building2 className="h-16 w-16 text-muted-foreground" />
          ) : (
            <User className="h-16 w-16 text-muted-foreground" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {type === 'branch' ? 'Cabang' : 'Agen'} Tidak Ditemukan
        </h1>
        <p className="text-muted-foreground">
          {type === 'branch' 
            ? `Cabang dengan kode "${slug}" tidak ditemukan atau belum memiliki website.`
            : `Agen dengan kode "${slug}" tidak ditemukan atau belum memiliki website.`
          }
        </p>
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Beranda
          </Link>
        </Button>
      </div>
    </div>
  );
}

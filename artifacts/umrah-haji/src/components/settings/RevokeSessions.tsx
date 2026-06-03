import { useState } from 'react';
import { LogOut, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function RevokeSessions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleRevokeAll = async () => {
    if (!confirm('Apakah Anda yakin ingin menghentikan semua sesi? Anda akan dikeluarkan dari semua perangkat termasuk perangkat ini.')) {
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('revoke-all-sessions');

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Semua Sesi Dihentikan',
        description: 'Anda telah berhasil keluar dari semua perangkat.',
      });

      // Clear local session version and sign out
      if (user) {
        localStorage.removeItem(`session_version_${user.id}`);
      }
      await supabase.auth.signOut();
      navigate('/auth/login');
    } catch (error: any) {
      toast({
        title: 'Gagal Menghentikan Sesi',
        description: error.message || 'Terjadi kesalahan saat mencoba menghentikan semua sesi.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          Hentikan Semua Sesi
        </CardTitle>
        <CardDescription>
          Gunakan fitur ini jika Anda merasa akun Anda diakses dari perangkat yang tidak dikenal.
          Tindakan ini akan memaksa keluar semua perangkat yang saat ini sedang login.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-destructive/10 p-4 rounded-lg mb-4 text-sm text-destructive-foreground border border-destructive/20">
          <p className="font-semibold mb-1">Peringatan:</p>
          <p>
            Anda akan langsung dikeluarkan dari perangkat ini dan harus login kembali. 
            Semua sesi aktif di perangkat lain juga akan segera tidak berlaku.
          </p>
        </div>
        
        <Button 
          variant="destructive" 
          onClick={handleRevokeAll} 
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Keluar dari Semua Perangkat
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Send } from 'lucide-react';

export interface MahramForm {
  jamaahName: string;
  jamaahNik: string;
  jamaahBirthPlace: string;
  jamaahBirthDate: string;
  jamaahAddress: string;
  jamaahPassport: string;
  mahramName: string;
  mahramRelation: string;
  mahramNik: string;
  packageName: string;
  departureDate: string;
}

interface Props {
  mahramForm: MahramForm;
  setMahramForm: (v: any) => void;
  doGenerate: (handler: () => any, filename: string, action: 'download' | 'send') => void;
  handleGenerateSuratMahram: () => any;
}

const MAHRAM_RELATIONS = [
  'Suami',
  'Ayah',
  'Kakak Laki-laki',
  'Adik Laki-laki',
  'Paman (dari Ayah)',
  'Paman (dari Ibu)',
  'Kakek',
  'Saudara Ipar (Laki-laki)',
  'Anak Laki-laki',
];

export function MahramLetterTab({ mahramForm, setMahramForm, doGenerate, handleGenerateSuratMahram }: Props) {
  const up = (patch: Partial<MahramForm>) => setMahramForm({ ...mahramForm, ...patch });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-rose-500 text-lg">♥</span>
          Surat Keterangan Mahram
        </CardTitle>
        <CardDescription>
          Surat keterangan mahram untuk jamaah wanita — sesuai format baku Kemenag
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="col-span-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Data Jamaah (Wanita)</h3>
          </div>

          <div className="space-y-2">
            <Label>Nama Jamaah <span className="text-red-500">*</span></Label>
            <Input
              value={mahramForm.jamaahName}
              onChange={e => up({ jamaahName: e.target.value })}
              placeholder="Nama lengkap sesuai paspor"
            />
          </div>
          <div className="space-y-2">
            <Label>NIK Jamaah</Label>
            <Input
              value={mahramForm.jamaahNik}
              onChange={e => up({ jamaahNik: e.target.value })}
              placeholder="16 digit NIK KTP"
            />
          </div>
          <div className="space-y-2">
            <Label>Tempat Lahir</Label>
            <Input
              value={mahramForm.jamaahBirthPlace}
              onChange={e => up({ jamaahBirthPlace: e.target.value })}
              placeholder="Kota / kabupaten lahir"
            />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Lahir</Label>
            <Input
              type="date"
              value={mahramForm.jamaahBirthDate}
              onChange={e => up({ jamaahBirthDate: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Alamat Lengkap</Label>
            <Input
              value={mahramForm.jamaahAddress}
              onChange={e => up({ jamaahAddress: e.target.value })}
              placeholder="Alamat sesuai KTP"
            />
          </div>
          <div className="space-y-2">
            <Label>Nomor Paspor (opsional)</Label>
            <Input
              value={mahramForm.jamaahPassport}
              onChange={e => up({ jamaahPassport: e.target.value })}
              placeholder="A1234567"
            />
          </div>

          <div className="col-span-2 pt-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Data Mahram</h3>
          </div>

          <div className="space-y-2">
            <Label>Nama Mahram <span className="text-red-500">*</span></Label>
            <Input
              value={mahramForm.mahramName}
              onChange={e => up({ mahramName: e.target.value })}
              placeholder="Nama lengkap mahram"
            />
          </div>
          <div className="space-y-2">
            <Label>Hubungan dengan Jamaah <span className="text-red-500">*</span></Label>
            <Select value={mahramForm.mahramRelation} onValueChange={v => up({ mahramRelation: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih hubungan" /></SelectTrigger>
              <SelectContent>
                {MAHRAM_RELATIONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>NIK Mahram</Label>
            <Input
              value={mahramForm.mahramNik}
              onChange={e => up({ mahramNik: e.target.value })}
              placeholder="16 digit NIK mahram"
            />
          </div>

          <div className="col-span-2 pt-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Info Keberangkatan (opsional)</h3>
          </div>

          <div className="space-y-2">
            <Label>Nama Paket</Label>
            <Input
              value={mahramForm.packageName}
              onChange={e => up({ packageName: e.target.value })}
              placeholder="Contoh: Umrah Reguler 9 Hari"
            />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Keberangkatan</Label>
            <Input
              type="date"
              value={mahramForm.departureDate}
              onChange={e => up({ departureDate: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={() => doGenerate(handleGenerateSuratMahram, 'surat-mahram', 'download')}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
          <Button variant="outline" onClick={() => doGenerate(handleGenerateSuratMahram, 'surat-mahram', 'send')}>
            <Send className="h-4 w-4 mr-2" />Kirim via WA/Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

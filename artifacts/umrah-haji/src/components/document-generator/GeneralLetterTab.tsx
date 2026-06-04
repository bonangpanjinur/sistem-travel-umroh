import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Send, FileText } from 'lucide-react';

interface Props {
  generalForm: {
    recipientName: string; recipientPosition: string; recipientInstitution: string; recipientAddress: string;
    subject: string; content: string; signatoryName: string; signatoryPosition: string;
  };
  setGeneralForm: (v: any) => void;
  doGenerate: (handler: () => any, filename: string, action: 'download' | 'send') => void;
  handleGenerateGeneralLetter: () => any;
}

export function GeneralLetterTab({ generalForm, setGeneralForm, doGenerate, handleGenerateGeneralLetter }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Surat Umum</CardTitle>
        <CardDescription>Generate surat dengan format resmi perusahaan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><h3 className="font-semibold text-sm text-muted-foreground mb-1">PENERIMA SURAT</h3></div>
          <div className="space-y-2">
            <Label>Nama Penerima</Label>
            <Input value={generalForm.recipientName} onChange={(e) => setGeneralForm({ ...generalForm, recipientName: e.target.value })} placeholder="Nama penerima surat" />
          </div>
          <div className="space-y-2">
            <Label>Jabatan (Opsional)</Label>
            <Input value={generalForm.recipientPosition} onChange={(e) => setGeneralForm({ ...generalForm, recipientPosition: e.target.value })} placeholder="Jabatan" />
          </div>
          <div className="space-y-2">
            <Label>Instansi (Opsional)</Label>
            <Input value={generalForm.recipientInstitution} onChange={(e) => setGeneralForm({ ...generalForm, recipientInstitution: e.target.value })} placeholder="Nama instansi" />
          </div>
          <div className="space-y-2">
            <Label>Alamat (Opsional)</Label>
            <Input value={generalForm.recipientAddress} onChange={(e) => setGeneralForm({ ...generalForm, recipientAddress: e.target.value })} placeholder="Alamat penerima" />
          </div>

          <div className="col-span-2 pt-4"><h3 className="font-semibold text-sm text-muted-foreground mb-1">ISI SURAT</h3></div>
          <div className="col-span-2 space-y-2">
            <Label>Perihal</Label>
            <Input value={generalForm.subject} onChange={(e) => setGeneralForm({ ...generalForm, subject: e.target.value })} placeholder="Perihal surat" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Isi Surat</Label>
            <Textarea value={generalForm.content} onChange={(e) => setGeneralForm({ ...generalForm, content: e.target.value })} placeholder="Isi surat..." rows={6} />
          </div>

          <div className="col-span-2 pt-4"><h3 className="font-semibold text-sm text-muted-foreground mb-1">PENANDATANGAN</h3></div>
          <div className="space-y-2">
            <Label>Nama Penandatangan</Label>
            <Input value={generalForm.signatoryName} onChange={(e) => setGeneralForm({ ...generalForm, signatoryName: e.target.value })} placeholder="Default: Direktur Utama" />
          </div>
          <div className="space-y-2">
            <Label>Jabatan Penandatangan</Label>
            <Input value={generalForm.signatoryPosition} onChange={(e) => setGeneralForm({ ...generalForm, signatoryPosition: e.target.value })} placeholder="Default: PT. Umrah Haji Travel" />
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={() => doGenerate(handleGenerateGeneralLetter, 'surat-umum', 'download')}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
          <Button variant="outline" onClick={() => doGenerate(handleGenerateGeneralLetter, 'surat-umum', 'send')}>
            <Send className="h-4 w-4 mr-2" />Kirim via Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

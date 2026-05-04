import { PublicLayout } from "@/components/layout/PublicLayout";
import ProfileForm from "@/components/settings/ProfileForm";
import ChangePassword from "@/components/settings/ChangePassword";

export default function CustomerSettings() {
  return (
    <PublicLayout>
      <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-muted-foreground">Kelola profil dan keamanan akun Anda</p>
        </div>
        <ProfileForm />
        <ChangePassword />
      </div>
    </PublicLayout>
  );
}

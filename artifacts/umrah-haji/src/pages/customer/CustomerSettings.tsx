import { useState } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import ProfileForm from "@/components/settings/ProfileForm";
import ChangePassword from "@/components/settings/ChangePassword";
import MahramForm from "@/components/settings/MahramForm";
import NotificationPreferences from "@/components/settings/NotificationPreferences";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Lock, Users, Bell } from "lucide-react";

export default function CustomerSettings() {
  return (
    <PublicLayout>
      <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-muted-foreground">Kelola profil, keamanan akun, mahram, dan preferensi Anda</p>
        </div>

        <Tabs defaultValue="profil">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="profil" className="gap-1.5 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" /> Profil
            </TabsTrigger>
            <TabsTrigger value="mahram" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" /> Mahram
            </TabsTrigger>
            <TabsTrigger value="keamanan" className="gap-1.5 text-xs sm:text-sm">
              <Lock className="h-3.5 w-3.5" /> Keamanan
            </TabsTrigger>
            <TabsTrigger value="preferensi" className="gap-1.5 text-xs sm:text-sm">
              <Bell className="h-3.5 w-3.5" /> Preferensi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profil" className="mt-4">
            <ProfileForm />
          </TabsContent>
          <TabsContent value="mahram" className="mt-4">
            <MahramForm />
          </TabsContent>
          <TabsContent value="keamanan" className="mt-4">
            <ChangePassword />
          </TabsContent>
          <TabsContent value="preferensi" className="mt-4">
            <NotificationPreferences />
          </TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
}

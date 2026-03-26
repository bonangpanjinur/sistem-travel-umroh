'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  Check,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface Permission {
  permission_key: string;
  label: string;
  group_name: string;
  is_enabled: boolean;
  source: 'user' | 'role';
}

interface PermissionGroup {
  [key: string]: Permission[];
}

interface UserPermissionsManagerProps {
  userId: string;
  userName: string;
}

export function UserPermissionsManager({
  userId,
  userName,
}: UserPermissionsManagerProps) {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<PermissionGroup>({});
  const [allPermissions, setAllPermissions] = useState<PermissionGroup>({});
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserOnly, setShowUserOnly] = useState(false);

  // Fetch all available permissions
  useEffect(() => {
    fetchAllPermissions();
  }, []);

  // Fetch user permissions
  useEffect(() => {
    fetchUserPermissions();
  }, [userId]);

  const fetchAllPermissions = async () => {
    try {
      const response = await fetch('/api/user-permissions/all');
      const data = await response.json();

      if (data.success) {
        setAllPermissions(data.data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengambil daftar izin',
        variant: 'destructive',
      });
    }
  };

  const fetchUserPermissions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/user-permissions/${userId}`);
      const data = await response.json();

      if (data.success) {
        // Group permissions by category
        const grouped: PermissionGroup = {};
        data.data.forEach((perm: Permission) => {
          if (!grouped[perm.group_name]) {
            grouped[perm.group_name] = [];
          }
          grouped[perm.group_name].push(perm);
        });

        setPermissions(grouped);
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengambil izin pengguna',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermission = async (permissionKey: string) => {
    try {
      const response = await fetch(`/api/user-permissions/${userId}/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission_key: permissionKey }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Berhasil',
          description: `Izin ${permissionKey} berhasil diberikan`,
        });
        fetchUserPermissions();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Gagal memberikan izin',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error granting permission:', error);
      toast({
        title: 'Error',
        description: 'Gagal memberikan izin',
        variant: 'destructive',
      });
    }
  };

  const handleRevokePermission = async (permissionKey: string) => {
    try {
      const response = await fetch(`/api/user-permissions/${userId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission_key: permissionKey }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Berhasil',
          description: `Izin ${permissionKey} berhasil dicabut`,
        });
        fetchUserPermissions();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Gagal mencabut izin',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error revoking permission:', error);
      toast({
        title: 'Error',
        description: 'Gagal mencabut izin',
        variant: 'destructive',
      });
    }
  };

  const handleBulkGrant = async () => {
    if (selectedPermissions.size === 0) {
      toast({
        title: 'Warning',
        description: 'Pilih minimal satu izin',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/user-permissions/${userId}/bulk-grant`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permission_keys: Array.from(selectedPermissions),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Berhasil',
          description: `${data.granted} izin berhasil diberikan`,
        });
        setSelectedPermissions(new Set());
        fetchUserPermissions();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Gagal memberikan izin',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error bulk granting permissions:', error);
      toast({
        title: 'Error',
        description: 'Gagal memberikan izin',
        variant: 'destructive',
      });
    }
  };

  const handleSyncFromRole = async () => {
    try {
      const response = await fetch(
        `/api/user-permissions/${userId}/sync-from-role`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Berhasil',
          description: `${data.synced} izin berhasil disinkronkan dari role`,
        });
        fetchUserPermissions();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Gagal menyinkronkan izin',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error syncing permissions:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyinkronkan izin',
        variant: 'destructive',
      });
    }
  };

  const togglePermissionSelection = (permissionKey: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionKey)) {
      newSelected.delete(permissionKey);
    } else {
      newSelected.add(permissionKey);
    }
    setSelectedPermissions(newSelected);
  };

  const filteredPermissions = Object.entries(permissions).reduce(
    (acc, [group, perms]) => {
      const filtered = perms.filter(
        (p) =>
          (showUserOnly ? p.source === 'user' : true) &&
          (searchQuery === ''
            ? true
            : p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.permission_key.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      if (filtered.length > 0) {
        acc[group] = filtered;
      }

      return acc;
    },
    {} as PermissionGroup
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Kelola Izin Pengguna</CardTitle>
        <CardDescription>
          Atur hak akses granular untuk {userName}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search and Filter */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Cari izin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => setShowUserOnly(!showUserOnly)}
              className="gap-2"
            >
              {showUserOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showUserOnly ? 'Semua' : 'User Only'}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleBulkGrant}
              disabled={selectedPermissions.size === 0 || loading}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Berikan ({selectedPermissions.size})
            </Button>

            <Button
              variant="outline"
              onClick={handleSyncFromRole}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sinkronkan dari Role
            </Button>
          </div>
        </div>

        <Separator />

        {/* Permissions List */}
        <ScrollArea className="h-[600px] border rounded-lg p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Memuat izin...</p>
            </div>
          ) : Object.keys(filteredPermissions).length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Tidak ada izin yang ditemukan</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(filteredPermissions).map(([group, perms]) => (
                <div key={group} className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                    {group}
                  </h3>

                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <div
                        key={perm.permission_key}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={perm.permission_key}
                          checked={selectedPermissions.has(perm.permission_key)}
                          onCheckedChange={() =>
                            togglePermissionSelection(perm.permission_key)
                          }
                          className="mt-1"
                        />

                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={perm.permission_key}
                            className="text-sm font-medium cursor-pointer block"
                          >
                            {perm.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {perm.permission_key}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              perm.source === 'user' ? 'default' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {perm.source === 'user' ? 'User' : 'Role'}
                          </Badge>

                          {perm.is_enabled ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleRevokePermission(perm.permission_key)
                              }
                              disabled={loading}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleGrantPermission(perm.permission_key)
                              }
                              disabled={loading}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Izin dengan badge <Badge className="ml-2">User</Badge> adalah override
            dari izin berbasis role. Izin dengan badge{' '}
            <Badge variant="secondary" className="ml-2">
              Role
            </Badge>{' '}
            berasal dari peran pengguna.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

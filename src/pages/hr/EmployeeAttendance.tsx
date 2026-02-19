import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Clock, Camera, CheckCircle, LogIn, LogOut, Loader2, WifiOff, Wifi, ShieldCheck, ShieldAlert, Smartphone, SmartphoneCharging, UserCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  address?: string;
}

interface FaceVerificationResult {
  verified: boolean;
  confidence: number;
  reason?: string;
}

// Generate a device fingerprint from browser properties
function generateDeviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency || "unknown",
  ];
  // Simple hash
  let hash = 0;
  const str = parts.join("|");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "DEV-" + Math.abs(hash).toString(36).toUpperCase();
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*?;\s*(.*?)\s*(?:Build|[;)])/);
    return match ? match[1] : "Android Device";
  }
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux PC";
  return "Unknown Device";
}

export default function EmployeeAttendance() {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [faceVerification, setFaceVerification] = useState<FaceVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [proxyEmployeeId, setProxyEmployeeId] = useState<string | null>(null);

  const isHR = roles.some(r => ['super_admin', 'owner', 'branch_manager', 'operational'].includes(r));
  const deviceFingerprint = generateDeviceFingerprint();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch employee data (self)
  const { data: employee } = useQuery({
    queryKey: ["employee-self", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; full_name: string; employee_code: string; photo_url?: string } | null;
    },
    enabled: !!user?.id,
  });

  // Fetch all employees (for HR proxy)
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["all-employees-for-proxy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, employee_code, photo_url")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: isHR,
  });

  // The active employee for attendance (self or proxy)
  const activeEmployeeId = proxyEmployeeId || employee?.id;
  const activeEmployee = proxyEmployeeId
    ? allEmployees.find(e => e.id === proxyEmployeeId)
    : employee;

  // Fetch HR settings (device restriction toggle)
  const { data: hrSettings } = useQuery({
    queryKey: ["hr-settings-device"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_settings")
        .select("require_device_registration")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { require_device_registration: boolean } | null;
    },
  });

  const requireDevice = hrSettings?.require_device_registration ?? false;

  // Check if current device is registered for the active employee
  const { data: deviceStatus, isLoading: loadingDevice } = useQuery({
    queryKey: ["device-check", activeEmployeeId, deviceFingerprint],
    queryFn: async () => {
      if (!activeEmployeeId) return null;
      const { data, error } = await supabase
        .from("employee_devices")
        .select("id, is_active, device_name")
        .eq("employee_id", activeEmployeeId)
        .eq("device_fingerprint", deviceFingerprint)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeEmployeeId && requireDevice,
  });

  const isDeviceAllowed = !requireDevice || isHR || (deviceStatus?.is_active === true);

  // Fetch today's attendance
  const { data: todayAttendance } = useQuery({
    queryKey: ["today-attendance", activeEmployeeId],
    queryFn: async () => {
      if (!activeEmployeeId) return null;
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", activeEmployeeId)
        .eq("attendance_date", today)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        check_in_time?: string;
        check_out_time?: string;
        status?: string;
      } | null;
    },
    enabled: !!activeEmployeeId,
  });

  // Get current location
  const getLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation tidak didukung browser ini");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`
          );
          const data = await response.json();
          loc.address = data.display_name?.split(",").slice(0, 3).join(", ");
        } catch { /* ignore */ }
        setLocation(loc);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Akses lokasi ditolak. Mohon izinkan akses lokasi.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Informasi lokasi tidak tersedia.");
            break;
          case error.TIMEOUT:
            setLocationError("Request lokasi timeout.");
            break;
          default:
            setLocationError("Gagal mendapatkan lokasi.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Start camera
  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("Gagal mengakses kamera");
      setIsCapturing(false);
    }
  };

  // Capture photo
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const photo = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedPhoto(photo);
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
      setIsCapturing(false);
      if (!proxyEmployeeId) {
        await verifyFace(photo);
      }
    }
  };

  // Face verification
  const verifyFace = async (photo: string) => {
    setIsVerifying(true);
    setFaceVerification(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-face", {
        body: {
          employee_id: activeEmployeeId,
          captured_image: photo,
          stored_photo_url: (activeEmployee as any)?.photo_url,
        },
      });
      if (error) throw error;
      setFaceVerification({
        verified: data.verified,
        confidence: data.confidence,
        reason: data.reason,
      });
      if (data.verified) toast.success("Wajah terverifikasi!");
      else toast.warning(data.reason || "Wajah tidak terverifikasi");
    } catch {
      setFaceVerification({
        verified: false,
        confidence: 0,
        reason: "Verifikasi wajah gagal, lanjutkan manual",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Register device mutation
  const registerDeviceMutation = useMutation({
    mutationFn: async () => {
      if (!activeEmployeeId) throw new Error("Employee not found");
      const { error } = await supabase.from("employee_devices").upsert({
        employee_id: activeEmployeeId,
        device_fingerprint: deviceFingerprint,
        device_name: getDeviceName(),
        user_agent: navigator.userAgent,
        screen_info: `${screen.width}x${screen.height}`,
        registered_by: user?.id,
        is_active: true,
      }, { onConflict: "employee_id,device_fingerprint" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-check"] });
      toast.success("Perangkat berhasil didaftarkan!");
    },
    onError: (e: Error) => toast.error("Gagal daftarkan perangkat: " + e.message),
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!activeEmployeeId || !location) throw new Error("Data tidak lengkap");
      const today = format(new Date(), "yyyy-MM-dd");
      const now = new Date().toISOString();
      const isLate = new Date().getHours() >= 9;
      const locationJson = JSON.parse(JSON.stringify({ lat: location.lat, lng: location.lng, address: location.address }));

      const { error } = await supabase.from("attendance_records").insert([{
        employee_id: activeEmployeeId,
        attendance_date: today,
        check_in_time: now,
        check_in_location: locationJson,
        check_in_photo_url: capturedPhoto,
        status: isLate ? "late" : "present",
        notes: proxyEmployeeId ? `Diabsenkan oleh HR (${employee?.full_name})` : null,
      }]);
      if (error) throw error;

      // Update device last_used_at
      if (requireDevice && !proxyEmployeeId) {
        await supabase
          .from("employee_devices")
          .update({ last_used_at: now })
          .eq("employee_id", activeEmployeeId)
          .eq("device_fingerprint", deviceFingerprint);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      toast.success(proxyEmployeeId ? `Check-in untuk ${activeEmployee?.full_name} berhasil!` : "Check-in berhasil!");
      setCapturedPhoto(null);
    },
    onError: (error: Error) => toast.error("Gagal check-in: " + error.message),
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!todayAttendance?.id || !location) throw new Error("Data tidak lengkap");
      const locationJson = JSON.parse(JSON.stringify({ lat: location.lat, lng: location.lng, address: location.address }));

      const { error } = await supabase
        .from("attendance_records")
        .update({
          check_out_time: new Date().toISOString(),
          check_out_location: locationJson,
          check_out_photo_url: capturedPhoto,
        })
        .eq("id", todayAttendance.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      toast.success(proxyEmployeeId ? `Check-out untuk ${activeEmployee?.full_name} berhasil!` : "Check-out berhasil!");
      setCapturedPhoto(null);
    },
    onError: (error: Error) => toast.error("Gagal check-out: " + error.message),
  });

  // Auto-get location on mount
  useEffect(() => {
    getLocation();
  }, []);

  const hasCheckedIn = !!todayAttendance?.check_in_time;
  const hasCheckedOut = !!todayAttendance?.check_out_time;

  if (!employee && !isHR) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <p className="text-muted-foreground">Anda belum terdaftar sebagai karyawan</p>
          <p className="text-sm text-muted-foreground mt-2">Hubungi admin untuk mendaftarkan data karyawan</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary-foreground/20">
              <AvatarImage src={activeEmployee?.photo_url || ""} />
              <AvatarFallback className="bg-primary-foreground/10">
                {activeEmployee?.full_name?.[0] || "E"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{activeEmployee?.full_name || "HR Mode"}</p>
              <p className="text-xs opacity-80">{activeEmployee?.employee_code || ""}</p>
              {proxyEmployeeId && (
                <Badge variant="secondary" className="text-[10px] mt-0.5">
                  Diabsenkan oleh {employee?.full_name}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {requireDevice && !isHR && (
              <Badge variant={isDeviceAllowed ? "default" : "destructive"} className="text-[10px]">
                {isDeviceAllowed ? <Smartphone className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                {isDeviceAllowed ? "Terdaftar" : "Belum"}
              </Badge>
            )}
            {isOnline ? (
              <><Wifi className="h-4 w-4" /><span>Online</span></>
            ) : (
              <><WifiOff className="h-4 w-4" /><span>Offline</span></>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* HR Proxy Mode */}
        {isHR && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Mode HR - Absenkan Karyawan
              </CardTitle>
              <CardDescription>Pilih karyawan atau kosongkan untuk absen diri sendiri</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={proxyEmployeeId || "self"}
                onValueChange={(val) => {
                  setProxyEmployeeId(val === "self" ? null : val);
                  setCapturedPhoto(null);
                  setFaceVerification(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">
                    🙋 Diri Sendiri {employee ? `(${employee.full_name})` : ""}
                  </SelectItem>
                  {allEmployees.filter(e => e.id !== employee?.id).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Device Not Registered Warning */}
        {requireDevice && !isHR && !isDeviceAllowed && !loadingDevice && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Perangkat Belum Terdaftar</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Perangkat ini belum didaftarkan untuk akun Anda. Hubungi HR/Admin untuk mendaftarkan perangkat.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted p-2 rounded">
                    ID Perangkat: {deviceFingerprint}<br />
                    Nama: {getDeviceName()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date & Time */}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{format(new Date(), "HH:mm")}</p>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, dd MMMM yyyy", { locale: id })}
            </p>
          </CardContent>
        </Card>

        {/* Status */}
        {activeEmployeeId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status Hari Ini</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 text-center p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Check In</p>
                  {hasCheckedIn ? (
                    <p className="font-bold text-green-600">
                      {format(new Date(todayAttendance.check_in_time!), "HH:mm")}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )}
                </div>
                <div className="flex-1 text-center p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Check Out</p>
                  {hasCheckedOut ? (
                    <p className="font-bold text-blue-600">
                      {format(new Date(todayAttendance.check_out_time!), "HH:mm")}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )}
                </div>
                <div className="flex-1 text-center p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {hasCheckedIn ? (
                    <Badge variant={todayAttendance.status === "late" ? "secondary" : "default"}>
                      {todayAttendance.status === "late" ? "Terlambat" : "Hadir"}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Belum</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Lokasi
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={getLocation}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {locationError ? (
              <p className="text-sm text-destructive">{locationError}</p>
            ) : location ? (
              <div className="text-sm">
                <p className="font-medium">{location.address || "Lokasi terdeteksi"}</p>
                <p className="text-muted-foreground text-xs">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)} (±{location.accuracy.toFixed(0)}m)
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Mendapatkan lokasi...</p>
            )}
          </CardContent>
        </Card>

        {/* Camera */}
        {isDeviceAllowed && activeEmployeeId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Foto Selfie {proxyEmployeeId ? "(Opsional)" : "(Opsional)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isCapturing ? (
                <div className="space-y-2">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
                  <Button onClick={capturePhoto} className="w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    Ambil Foto
                  </Button>
                </div>
              ) : capturedPhoto ? (
                <div className="space-y-3">
                  <img src={capturedPhoto} alt="Captured" className="w-full rounded-lg" />

                  {/* Face Verification Status */}
                  {isVerifying ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Memverifikasi wajah...</span>
                      <Progress value={50} className="flex-1" />
                    </div>
                  ) : faceVerification ? (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      faceVerification.verified
                        ? "bg-green-50 border border-green-200"
                        : "bg-amber-50 border border-amber-200"
                    }`}>
                      {faceVerification.verified ? (
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                      ) : (
                        <ShieldAlert className="h-5 w-5 text-amber-600" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          faceVerification.verified ? "text-green-700" : "text-amber-700"
                        }`}>
                          {faceVerification.verified ? "Wajah Terverifikasi" : "Tidak Terverifikasi"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Confidence: {(faceVerification.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCapturedPhoto(null);
                        setFaceVerification(null);
                      }}
                      className="flex-1"
                    >
                      Ulangi
                    </Button>
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Foto OK
                    </Badge>
                  </div>
                </div>
              ) : (
                <Button variant="outline" onClick={startCamera} className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Buka Kamera
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {activeEmployeeId && (
          <div className="space-y-2">
            {!isDeviceAllowed ? (
              <Card className="p-4 text-center border-destructive/30">
                <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
                <p className="font-medium text-destructive">Tidak Bisa Absen</p>
                <p className="text-sm text-muted-foreground">Perangkat belum terdaftar</p>
              </Card>
            ) : !hasCheckedIn ? (
              <Button
                onClick={() => checkInMutation.mutate()}
                disabled={!location || checkInMutation.isPending}
                className="w-full h-14 text-lg"
              >
                {checkInMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <LogIn className="h-5 w-5 mr-2" />
                )}
                CHECK IN {proxyEmployeeId ? `(${activeEmployee?.full_name})` : ""}
              </Button>
            ) : !hasCheckedOut ? (
              <Button
                onClick={() => checkOutMutation.mutate()}
                disabled={!location || checkOutMutation.isPending}
                variant="secondary"
                className="w-full h-14 text-lg"
              >
                {checkOutMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-5 w-5 mr-2" />
                )}
                CHECK OUT {proxyEmployeeId ? `(${activeEmployee?.full_name})` : ""}
              </Button>
            ) : (
              <Card className="p-4 text-center bg-green-50 border-green-200">
                <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="font-medium text-green-700">
                  Absensi {proxyEmployeeId ? activeEmployee?.full_name : "hari ini"} selesai
                </p>
                <p className="text-sm text-green-600">
                  {format(new Date(todayAttendance.check_in_time!), "HH:mm")} - {format(new Date(todayAttendance.check_out_time!), "HH:mm")}
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

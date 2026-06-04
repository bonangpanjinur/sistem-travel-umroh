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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin, Clock, Camera, CheckCircle, LogIn, LogOut, Loader2, WifiOff, Wifi, ShieldCheck, ShieldAlert, Smartphone, SmartphoneCharging, UserCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/types";

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

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];
type AttendanceRecord = Database["public"]["Tables"]["attendance_records"]["Row"];
type AttendanceRecordInsert = Database["public"]["Tables"]["attendance_records"]["Insert"];
type HRSettings = Database["public"]["Tables"]["hr_settings"]["Row"];
type EmployeeDevice = Database["public"]["Tables"]["employee_devices"]["Row"];
type EmployeeDeviceInsert = Database["public"]["Tables"]["employee_devices"]["Insert"];

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

  const isHR = roles.some(r => ["super_admin", "owner", "branch_manager", "operational"].includes(r));
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
        .select("id, full_name, employee_code, photo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
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
      return data;
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
    enabled: !!activeEmployeeId,
    refetchInterval: 5000, // Refetch every 5 seconds to catch new registrations
  });

  const isDeviceAllowed = !requireDevice || isHR || (deviceStatus?.is_active === true);
  const deviceNeedsRegistration = requireDevice && !isHR && !deviceStatus && !loadingDevice;

  // Fetch today's attendance
  const { data: todayAttendance } = useQuery({
    queryKey: ["today-attendance", activeEmployeeId],
    queryFn: async () => {
      if (!activeEmployeeId) return null;
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, check_in_time, check_out_time, status")
        .eq("employee_id", activeEmployeeId)
        .eq("attendance_date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
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
      const res = await fetch('/api/hr/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: activeEmployeeId,
          captured_image: photo,
          stored_photo_url: activeEmployee?.photo_url,
        }),
      });
      const data = await res.json();
      setFaceVerification({
        verified: data.verified,
        confidence: data.confidence,
        reason: data.reason,
      });
      if (data.verified) toast.success(data.bypass ? "Verifikasi manual — lanjutkan absensi" : "Wajah terverifikasi!");
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
      if (!activeEmployeeId) throw new Error("Employee ID is required to register device.");
      const payload: EmployeeDeviceInsert = {
        employee_id: activeEmployeeId,
        device_fingerprint: deviceFingerprint,
        device_name: getDeviceName(),
        user_agent: navigator.userAgent,
        screen_info: `${screen.width}x${screen.height}x${screen.colorDepth}`,
        is_active: true,
      };
      const { error } = await supabase.from("employee_devices").insert(payload);
      if (error) {
        // Handle unique constraint error
        if (error.code === '23505') {
          throw new Error("Perangkat ini sudah terdaftar untuk akun Anda.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-check", activeEmployeeId, deviceFingerprint] });
      toast.success("✓ Perangkat berhasil didaftarkan! Anda sekarang dapat melakukan absensi.");
    },
    onError: (error: Error) => {
      toast.error("Gagal mendaftarkan perangkat: " + error.message);
    },
  });

  // Attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async (type: "check_in" | "check_out") => {
      if (!activeEmployeeId) {
        toast.error("Karyawan tidak ditemukan.");
        return;
      }
      if (!location) {
        toast.error("Lokasi tidak ditemukan.");
        return;
      }
      if (!capturedPhoto) {
        toast.error("Foto tidak diambil.");
        return;
      }
      if (!isDeviceAllowed && !isHR) {
        toast.error("Perangkat tidak terdaftar atau tidak aktif. Silakan daftarkan perangkat terlebih dahulu.");
        return;
      }
      if (!faceVerification?.verified && !isHR) {
        toast.error("Verifikasi wajah gagal.");
        return;
      }

      const attendanceData: AttendanceRecordInsert = {
        employee_id: activeEmployeeId,
        attendance_date: format(new Date(), "yyyy-MM-dd"),
        status: "Hadir", // Default status
      };

      if (type === "check_in") {
        attendanceData.check_in_time = format(new Date(), "HH:mm:ss");
        attendanceData.check_in_location = location as unknown as Json;
      } else {
        attendanceData.check_out_time = format(new Date(), "HH:mm:ss");
        attendanceData.check_out_location = location as unknown as Json;
      }

      if (todayAttendance?.id) {
        // Update existing record
        const { error } = await supabase
          .from("attendance_records")
          .update(attendanceData)
          .eq("id", todayAttendance.id);
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase.from("attendance_records").insert([attendanceData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-attendance", activeEmployeeId] });
      toast.success("Absensi berhasil direkam!");
      setCapturedPhoto(null);
      setFaceVerification(null);
    },
    onError: (error: Error) => {
      toast.error("Gagal merekam absensi: " + error.message);
    },
  });

  useEffect(() => {
    getLocation();
  }, []);

  // Show warning if device registration is required but not done
  useEffect(() => {
    if (deviceNeedsRegistration && !isHR) {
      console.warn("Device registration required but not completed");
    }
  }, [deviceNeedsRegistration, isHR]);

  const isCheckedIn = !!todayAttendance?.check_in_time;
  const isCheckedOut = !!todayAttendance?.check_out_time;

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-6 w-6" /> Absensi Karyawan
          </CardTitle>
          <CardDescription>Rekam kehadiran Anda dengan mudah.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isHR && (
            <div className="mb-4">
              <Label htmlFor="proxy-employee">Absensi untuk Karyawan Lain (HR)</Label>
              <Select
                value={proxyEmployeeId || ""}
                onValueChange={setProxyEmployeeId}
              >
                <SelectTrigger id="proxy-employee">
                  <SelectValue placeholder="Pilih Karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {allEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeEmployee ? (
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={activeEmployee.photo_url || undefined} />
                <AvatarFallback>{activeEmployee.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{activeEmployee.full_name}</h3>
                <p className="text-muted-foreground">{activeEmployee.employee_code}</p>
                {deviceNeedsRegistration && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    Perangkat perlu didaftarkan
                  </div>
                )}
              </div>
            </div>
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Kehadiran Hari Ini</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Check-in:</span>
                  <Badge variant={isCheckedIn ? "default" : "secondary"}>
                    {isCheckedIn ? format(new Date(`2000-01-01T${todayAttendance?.check_in_time}`), "HH:mm") : "Belum"
                    }</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Check-out:</span>
                  <Badge variant={isCheckedOut ? "default" : "secondary"}>
                    {isCheckedOut ? format(new Date(`2000-01-01T${todayAttendance?.check_out_time}`), "HH:mm") : "Belum"
                    }</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informasi Lokasi & Perangkat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {locationError ? (
                    <span className="text-red-500 text-sm">{locationError}</span>
                  ) : location ? (
                    <span className="text-sm">{location.address || `Lat: ${location.lat.toFixed(3)}, Lng: ${location.lng.toFixed(3)}`}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">Mencari lokasi...</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">Status Jaringan: {isOnline ? "Online" : "Offline"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {requireDevice ? (
                    deviceStatus?.is_active ? (
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-yellow-500" />
                    )
                  ) : (
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    Perangkat: {getDeviceName()} ({deviceFingerprint.substring(0, 8)}...)
                  </span>
                </div>
                {requireDevice && loadingDevice && (
                  <div className="text-sm text-muted-foreground">Memeriksa status perangkat...</div>
                )}
                {requireDevice && !deviceStatus?.is_active && !loadingDevice && (
                  <div className="space-y-2">
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ Perangkat ini belum terdaftar. Anda harus mendaftarkan perangkat sebelum dapat melakukan absensi.
                    </div>
                    <Button size="sm" onClick={() => registerDeviceMutation.mutate()} disabled={registerDeviceMutation.isPending} className="w-full">
                      <Smartphone className="h-4 w-4 mr-2" />
                      {registerDeviceMutation.isPending ? "Mendaftarkan..." : "Daftarkan Perangkat Ini"}
                    </Button>
                  </div>
                )}
                {requireDevice && deviceStatus?.is_active && !loadingDevice && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
                    ✓ Perangkat terdaftar dan aktif. Anda dapat melakukan absensi.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Ambil Foto</h3>
            <div className="relative w-full aspect-video bg-gray-200 rounded-md overflow-hidden">
              {isCapturing && (
                <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
              )}
              {capturedPhoto && !isCapturing && (
                <img src={capturedPhoto} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {!isCapturing && !capturedPhoto && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <Camera className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!isCapturing && (
                <Button onClick={startCamera} disabled={!activeEmployeeId || isCapturing}>
                  <Camera className="h-4 w-4 mr-2" /> Buka Kamera
                </Button>
              )}
              {isCapturing && (
                <Button onClick={capturePhoto} disabled={!activeEmployeeId}>
                  <Camera className="h-4 w-4 mr-2" /> Ambil Foto
                </Button>
              )}
              {capturedPhoto && (
                <Button variant="outline" onClick={() => setCapturedPhoto(null)}>Ulangi Foto</Button>
              )}
            </div>
          </div>

          {capturedPhoto && !isHR && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Verifikasi Wajah</h3>
              {isVerifying ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi wajah...
                </div>
              ) : faceVerification ? (
                <div className="flex items-center gap-2">
                  {faceVerification.verified ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>
                    {faceVerification.verified ? "Wajah terverifikasi" : "Wajah tidak cocok"} (Confidence: {(faceVerification.confidence * 100).toFixed(2)}%)
                  </span>
                  {faceVerification.reason && (
                    <span className="text-sm text-muted-foreground">({faceVerification.reason})</span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Menunggu verifikasi wajah...</span>
              )}
            </div>
          )}

          <div className="space-y-2">
            {requireDevice && !isDeviceAllowed && !isHR && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                🔒 Absensi terkunci: Perangkat Anda belum terdaftar atau tidak aktif. Silakan daftarkan perangkat terlebih dahulu.
              </div>
            )}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => saveAttendanceMutation.mutate("check_in")}
                disabled={!activeEmployeeId || !location || !capturedPhoto || isCheckedIn || saveAttendanceMutation.isPending || (requireDevice && !isDeviceAllowed && !isHR) || (!isHR && !faceVerification?.verified)}
                className="flex-1"
              >
                {saveAttendanceMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                Check-in
              </Button>
              <Button
                onClick={() => saveAttendanceMutation.mutate("check_out")}
                disabled={!activeEmployeeId || !location || !capturedPhoto || !isCheckedIn || isCheckedOut || saveAttendanceMutation.isPending || (requireDevice && !isDeviceAllowed && !isHR) || (!isHR && !faceVerification?.verified)}
                variant="outline"
                className="flex-1"
              >
                {saveAttendanceMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                Check-out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

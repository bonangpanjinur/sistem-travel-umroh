import { useQuery } from "@tanstack/react-query";
import { Cloud, Sun, CloudRain, Wind, Thermometer, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CityWeather {
  city: string;
  lat: number;
  lon: number;
  emoji: string;
}

const CITIES: CityWeather[] = [
  { city: "Makkah", lat: 21.3891, lon: 39.8579, emoji: "🕋" },
  { city: "Madinah", lat: 24.5247, lon: 39.5692, emoji: "🕌" },
];

const WMO_LABEL: Record<number, { label: string; icon: React.ReactNode; color: string }> = {
  0:  { label: "Cerah",       icon: <Sun className="h-5 w-5" />,       color: "text-amber-500" },
  1:  { label: "Cerah",       icon: <Sun className="h-5 w-5" />,       color: "text-amber-500" },
  2:  { label: "Berawan",     icon: <Cloud className="h-5 w-5" />,     color: "text-gray-500" },
  3:  { label: "Mendung",     icon: <Cloud className="h-5 w-5" />,     color: "text-gray-600" },
  45: { label: "Berkabut",    icon: <Cloud className="h-5 w-5" />,     color: "text-gray-400" },
  48: { label: "Berkabut",    icon: <Cloud className="h-5 w-5" />,     color: "text-gray-400" },
  51: { label: "Gerimis",     icon: <CloudRain className="h-5 w-5" />, color: "text-blue-400" },
  53: { label: "Gerimis",     icon: <CloudRain className="h-5 w-5" />, color: "text-blue-400" },
  61: { label: "Hujan",       icon: <CloudRain className="h-5 w-5" />, color: "text-blue-500" },
  63: { label: "Hujan",       icon: <CloudRain className="h-5 w-5" />, color: "text-blue-600" },
  80: { label: "Hujan Lebat", icon: <CloudRain className="h-5 w-5" />, color: "text-blue-700" },
  95: { label: "Badai",       icon: <CloudRain className="h-5 w-5" />, color: "text-purple-600" },
};

function getWmoMeta(code: number) {
  const known = [95, 80, 63, 61, 53, 51, 48, 45, 3, 2, 1, 0];
  for (const k of known) {
    if (code >= k) return WMO_LABEL[k] ?? WMO_LABEL[0];
  }
  return WMO_LABEL[0];
}

async function fetchWeather(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,wind_speed_10m,relative_humidity_2m&timezone=Asia%2FRiyadh&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  const json = await res.json();
  return json.current as {
    temperature_2m: number;
    weathercode: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
}

function CityCard({ city }: { city: CityWeather }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["weather", city.city],
    queryFn: () => fetchWeather(city.lat, city.lon),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const meta = data ? getWmoMeta(data.weathercode) : WMO_LABEL[0];

  return (
    <div className="flex-1 min-w-0 bg-white/60 rounded-2xl px-3 py-3 border border-white/80">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-gray-700">{city.emoji} {city.city}</p>
        {!isLoading && (
          <button onClick={() => refetch()} className="p-0.5 hover:bg-gray-100 rounded">
            <RefreshCw className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center gap-1 text-gray-400 mt-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs">Memuat...</span>
        </div>
      ) : isError || !data ? (
        <p className="text-xs text-gray-400 mt-1">Data tidak tersedia</p>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <span className={cn("flex-shrink-0", meta.color)}>{meta.icon}</span>
            <span className="text-2xl font-bold text-gray-800">{Math.round(data.temperature_2m)}°C</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{meta.label}</p>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500">
            <span className="flex items-center gap-0.5">
              <Wind className="h-3 w-3" />{Math.round(data.wind_speed_10m)} km/h
            </span>
            <span className="flex items-center gap-0.5">
              <Thermometer className="h-3 w-3" />{data.relative_humidity_2m}% RH
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function CuacaWidget() {
  return (
    <div className="bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl p-3 shadow-sm">
      <p className="text-xs font-semibold text-white/80 mb-2.5 flex items-center gap-1.5">
        🌤️ Cuaca Tanah Suci (Real-time)
      </p>
      <div className="flex gap-2">
        {CITIES.map(c => <CityCard key={c.city} city={c} />)}
      </div>
      <p className="text-[10px] text-white/60 mt-2 text-right">Sumber: Open-Meteo · Zona Saudi Arabia</p>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, Wind, Droplets, Thermometer, Eye, Sun } from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";

const CITIES = [
  { name: "Mekah", nameAr: "مكة المكرمة", lat: 21.3891, lng: 39.8579, emoji: "🕋", desc: "Kota Suci, Arab Saudi" },
  { name: "Madinah", nameAr: "المدينة المنورة", lat: 24.5247, lng: 39.5692, emoji: "🕌", desc: "Kota Nabi, Arab Saudi" },
  { name: "Jeddah", nameAr: "جدة", lat: 21.5433, lng: 39.1728, emoji: "✈️", desc: "Kota Pelabuhan, Arab Saudi" },
];

interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    apparent_temperature: number;
    visibility: number;
    uv_index: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max: number[];
    time: string[];
  };
}

function getWeatherDesc(code: number): { icon: string; desc: string } {
  if (code === 0) return { icon: "☀️", desc: "Cerah" };
  if (code <= 3) return { icon: "⛅", desc: "Berawan" };
  if (code <= 48) return { icon: "🌫️", desc: "Berkabut" };
  if (code <= 67) return { icon: "🌧️", desc: "Hujan" };
  if (code <= 77) return { icon: "❄️", desc: "Salju" };
  if (code <= 82) return { icon: "🌦️", desc: "Hujan Ringan" };
  return { icon: "⛈️", desc: "Badai" };
}

function CityWeather({ city }: { city: typeof CITIES[0] }) {
  const { data, isLoading } = useQuery<WeatherData>({
    queryKey: ["weather", city.lat, city.lng],
    queryFn: async () => {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature,visibility,uv_index&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Asia%2FRiyadh&forecast_days=7`
      );
      return r.json();
    },
    staleTime: 1000 * 60 * 15,
  });

  const weather = data ? getWeatherDesc(data.current.weather_code) : null;

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur overflow-hidden">
      <div className="bg-gradient-to-r from-orange-500/30 to-amber-500/30 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl">{city.emoji}</p>
            <h2 className="text-white font-bold text-xl mt-1">{city.name}</h2>
            <p className="text-amber-200 text-sm font-arabic">{city.nameAr}</p>
            <p className="text-gray-300 text-xs">{city.desc}</p>
          </div>
          {isLoading ? (
            <div className="w-20 h-20 bg-white/10 rounded-full animate-pulse" />
          ) : data ? (
            <div className="text-right">
              <div className="text-5xl">{weather?.icon}</div>
              <div className="text-4xl font-bold text-white mt-1">{Math.round(data.current.temperature_2m)}°C</div>
              <p className="text-amber-200 text-sm">{weather?.desc}</p>
            </div>
          ) : null}
        </div>
      </div>

      {data && (
        <CardContent className="p-4">
          {/* Current details */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
              <Thermometer className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">Terasa</p>
                <p className="text-white text-sm font-medium">{Math.round(data.current.apparent_temperature)}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
              <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">Kelembaban</p>
                <p className="text-white text-sm font-medium">{data.current.relative_humidity_2m}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
              <Wind className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">Angin</p>
                <p className="text-white text-sm font-medium">{Math.round(data.current.wind_speed_10m)} km/j</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
              <Sun className="w-4 h-4 text-yellow-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">Indeks UV</p>
                <p className="text-white text-sm font-medium">{Math.round(data.current.uv_index)}</p>
              </div>
            </div>
          </div>

          {/* 7-day forecast */}
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Prakiraan 7 Hari</p>
          <div className="grid grid-cols-7 gap-1">
            {data.daily.time.slice(0, 7).map((date, i) => {
              const dayWeather = getWeatherDesc(data.daily.weather_code[i]);
              const d = new Date(date);
              const dayName = i === 0 ? "Hari ini" : d.toLocaleDateString("id-ID", { weekday: "short" });
              return (
                <div key={date} className="text-center bg-white/5 rounded-lg p-1">
                  <p className="text-gray-400 text-xs">{dayName}</p>
                  <div className="text-lg my-1">{dayWeather.icon}</div>
                  <p className="text-white text-xs font-bold">{Math.round(data.daily.temperature_2m_max[i])}°</p>
                  <p className="text-gray-400 text-xs">{Math.round(data.daily.temperature_2m_min[i])}°</p>
                </div>
              );
            })}
          </div>

          {/* Precipitation */}
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <Droplets className="w-3 h-3 text-blue-400" />
            Peluang hujan hari ini: {data.daily.precipitation_probability_max[0]}%
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function CuacaMekkah() {
  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-orange-950 to-amber-950 pb-16">
        <div className="bg-gradient-to-r from-orange-800 to-amber-700 py-10 px-4 text-center">
          <Badge className="mb-3 bg-white/20 text-white border-0">🌡️ Cuaca</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Cuaca Tanah Suci</h1>
          <p className="text-amber-200 text-sm">Mekah, Madinah & Jeddah — Update real-time</p>
        </div>

        <div className="max-w-2xl mx-auto px-4 mt-6 space-y-4">
          {CITIES.map(city => <CityWeather key={city.name} city={city} />)}

          <Card className="bg-amber-900/20 border-amber-700/30">
            <CardContent className="p-4">
              <p className="text-amber-300 text-sm font-medium mb-2">⚠️ Tips Ibadah di Cuaca Panas</p>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• Gunakan payung dan tabir surya SPF 50+</li>
                <li>• Minum minimal 3-4 liter air per hari</li>
                <li>• Hindari aktivitas di luar saat pukul 12-15</li>
                <li>• Kenakan pakaian berwarna putih dan longgar</li>
                <li>• Selalu bawa semprotan air / air zam-zam</li>
              </ul>
            </CardContent>
          </Card>

          <p className="text-center text-gray-500 text-xs pb-4">
            Data dari Open-Meteo.com • Diperbarui setiap 15 menit
          </p>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}

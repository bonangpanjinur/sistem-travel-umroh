import React, { useState, useEffect } from 'react';

interface TimerSectionProps {
  data: {
    title: string;
    endDate: string;
  };
}

export const TimerSection: React.FC<TimerSectionProps> = ({ data }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(data.endDate) - +new Date();
      let timeLeft = null;

      if (difference > 0) {
        timeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return timeLeft;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [data.endDate]);

  if (!timeLeft) return null;

  return (
    <section className="bg-red-600 text-white py-12">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 uppercase tracking-wider">
          {data.title || "Promo Berakhir Dalam:"}
        </h2>
        <div className="flex justify-center gap-4 md:gap-8">
          {[
            { label: 'Hari', value: timeLeft.days },
            { label: 'Jam', value: timeLeft.hours },
            { label: 'Menit', value: timeLeft.minutes },
            { label: 'Detik', value: timeLeft.seconds },
          ].map((item, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="bg-white text-red-600 rounded-lg w-16 h-16 md:w-24 md:h-24 flex items-center justify-center text-2xl md:text-4xl font-bold mb-2 shadow-lg">
                {String(item.value).padStart(2, '0')}
              </div>
              <span className="text-sm md:text-base font-medium uppercase">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

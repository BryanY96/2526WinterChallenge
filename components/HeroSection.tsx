import React, { useState, useEffect } from 'react';
import { Timer, MapPin } from 'lucide-react';

interface HeroSectionProps {
  // No props needed now
}

export const HeroSection: React.FC<HeroSectionProps> = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    // Target Date: Feb 17, 2026 (Chinese New Year)
    const targetDate = new Date('2026-03-03T00:00:00');

    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        setTimeLeft({ days, hours, minutes });
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-8 pb-4 text-center space-y-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/30 border border-red-500/30 text-red-200 text-xs font-medium uppercase tracking-wider mb-2">
        <MapPin size={12} /> DC to China
      </div>
      
      <div className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-red-500 drop-shadow-sm">
          🏃‍♂️ 跑向春天
        </h1>
        <h2 className="text-xl md:text-2xl text-slate-300 font-light">
          2025-2026 冬训大挑战
        </h2>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mx-auto w-full max-w-sm shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
        
        <div className="flex items-center justify-center gap-2 text-amber-400 mb-4">
          <Timer size={20} />
          <span className="text-sm font-semibold tracking-wide uppercase">距离马年元宵</span>
        </div>

        <div className="flex justify-center items-end gap-4 font-mono text-white mb-2">
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold leading-none">{timeLeft.days}</span>
            <span className="text-xs text-slate-400 mt-1 uppercase">Days</span>
          </div>
          <span className="text-2xl text-slate-600 mb-4">:</span>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-xs text-slate-400 mt-1 uppercase">Hrs</span>
          </div>
          <span className="text-2xl text-slate-600 mb-4">:</span>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-bold leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-xs text-slate-400 mt-1 uppercase">Mins</span>
          </div>
        </div>
      </div>
    </section>
  );
};
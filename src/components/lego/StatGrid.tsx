import React from 'react';
import { Users, DollarSign, Activity } from 'lucide-react';
import { LegoPieceDNA } from '@/types/lego';

interface StatGridProps {
  dna: LegoPieceDNA;
  data: unknown[]; // Mock data inyectada por el motor
}

interface MetricConfig {
  icon: string;
  colorClass: string;
  label: string;
  format?: string;
  value: string;
}

const icons: Record<string, React.ElementType> = {
  Users,
  DollarSign,
  Activity
};

export const StatGrid: React.FC<StatGridProps> = ({ dna, data }) => {
  const { metrics } = dna.config as { metrics: MetricConfig[] };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric: MetricConfig, index: number) => {
        const Icon = icons[metric.icon] || Activity;
        return (
          <div key={index} className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col h-full hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metric.colorClass}`}>
                <Icon size={20} />
              </div>
              <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{metric.label}</span>
            </div>
            {/* Si data viene vacío (cargando), mostramos el skeleton */}
            {data.length === 0 ? (
              <div className="h-8 w-24 skeleton mt-auto" />
            ) : (
              <p className="text-2xl font-black text-foreground tracking-tight mt-auto">
                {metric.format === 'currency' ? '$' : ''}{metric.value}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

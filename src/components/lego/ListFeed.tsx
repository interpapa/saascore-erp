import React from 'react';
import { LegoPieceDNA } from '@/types/lego';
import { EmptyState } from '@/components/core/EmptyState';
import { Inbox } from 'lucide-react';

interface ListFeedProps {
  dna: LegoPieceDNA;
  data: unknown[];
  onRowClick?: (item: unknown) => void;
  /** Optional CTA for the empty state, passed from the parent page */
  emptyAction?: { label: string; onClick: () => void };
}

interface ListFeedConfig {
  title: string;
  columns: Array<{
    field: string;
    format?: string;
    type?: string;
  }>;
}

export const ListFeed: React.FC<ListFeedProps> = ({ dna, data, onRowClick, emptyAction }) => {
  const { title, columns } = dna.config as ListFeedConfig;

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden flex flex-col h-full">
      <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-white/30 dark:bg-slate-800/30">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!data || data.length === 0 ? (
          <EmptyState
            icon={<Inbox size={40} />}
            title="Sin registros"
            description={`Aún no hay datos en "${title}". Empieza creando el primer registro.`}
            action={emptyAction}
          />
        ) : (
          <div className="space-y-3">
            {data.map((itemObj: unknown, idx) => {
              const item = itemObj as Record<string, unknown>;
              return (
              <div
                key={idx}
                onClick={() => onRowClick && onRowClick(item)}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 dark:border-white/5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all group cursor-pointer bg-white/50 dark:bg-slate-800/40 backdrop-blur-md btn-haptic"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {String(item[columns[0].field] || '').charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{String(item[columns[0].field] || '')}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{String(item[columns[1].field] || '')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">
                    {columns[2].format === 'currency' ? '$' : ''}{String(item[columns[2].field] || '')}
                  </p>
                  {columns[3] && (
                    <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full mt-1 ${
                      columns[3].type === 'status'
                        ? (['Active', 'Ok', 'Al día', 'Al Día'].includes(String(item[columns[3].field] || ''))
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400')
                        : 'bg-slate-500/10 text-slate-600'
                    }`}>
                      {String(item[columns[3].field] || '')}
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

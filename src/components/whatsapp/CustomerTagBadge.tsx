'use client';

import { X } from 'lucide-react';
import { CustomerTag } from '@/types/whatsapp';

interface CustomerTagBadgeProps {
  tag: string | CustomerTag;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export function CustomerTagBadge({ tag, onRemove, size = 'sm' }: CustomerTagBadgeProps) {
  const tagName = typeof tag === 'string' ? tag : tag.name;
  const lower = tagName.toLowerCase();

  let colorClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50';
  if (lower.includes('vip')) {
    colorClasses = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50';
  } else if (lower.includes('lead')) {
    colorClasses = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50';
  } else if (lower.includes('soporte') || lower.includes('support')) {
    colorClasses = 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-semibold' : 'px-2.5 py-1 text-xs font-bold';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border transition-colors ${colorClasses} ${sizeClasses}`}>
      <span>{tagName}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-75 focus:outline-none rounded-full p-0.5"
          title="Eliminar etiqueta"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}

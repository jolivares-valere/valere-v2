import React from 'react';
import { cn } from '@/core/utils/cn';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'green' | 'gradient';
}

/**
 * Reusable stat card — eliminates the copy-pasted KPI cards in Dashboard/Tracking.
 */
export default function StatCard({ icon, label, value, subtitle, variant = 'default' }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-2xl p-6 transition-all hover:shadow-lg",
      variant === 'gradient'
        ? "bg-gradient-to-br from-valere-blue-dark to-valere-blue-medium text-white shadow-md"
        : "bg-white shadow-md border border-slate-50"
    )}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "p-2 rounded-lg",
          variant === 'gradient' ? "bg-white/10" :
          variant === 'green' ? "bg-valere-green-medium/10" :
          "bg-valere-blue-medium/10"
        )}>
          {icon}
        </div>
        <h3 className={cn(
          "text-[10px] font-bold uppercase tracking-[0.15em]",
          variant === 'gradient' ? "text-white/50" : "text-valere-ink/40"
        )}>
          {label}
        </h3>
      </div>
      <p className={cn(
        "text-3xl font-display font-bold",
        variant === 'gradient' ? "text-white" :
        variant === 'green' ? "text-valere-green-dark" :
        "text-valere-blue-dark"
      )}>
        {value}
      </p>
      {subtitle && (
        <p className={cn(
          "mt-1 text-[10px] font-bold uppercase tracking-widest",
          variant === 'gradient' ? "text-white/30" : "text-valere-ink/30"
        )}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

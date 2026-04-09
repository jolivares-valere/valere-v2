import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Reusable empty state component — replaces empty tables/sections with a
 * professional, branded placeholder that guides the user.
 */
export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-valere-blue-medium/5 flex items-center justify-center mb-4 text-valere-blue-medium/30">
        {icon}
      </div>
      <h3 className="text-base font-display font-semibold text-valere-blue-dark/70 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-valere-ink/40 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

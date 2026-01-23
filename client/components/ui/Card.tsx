import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, children, noPadding, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col',
        className
      )}
      {...props}
    >
      <div className={cn('flex-1 w-full', noPadding ? '' : 'p-6')}>{children}</div>
    </div>
  );
};

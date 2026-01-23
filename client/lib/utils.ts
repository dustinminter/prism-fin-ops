export const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString()}`;
};

export const formatCurrencyPrecise = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

export const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'Watch': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'New': return 'bg-blue-100 text-blue-700';
    case 'Reviewing': return 'bg-purple-100 text-purple-700';
    case 'Mitigated': return 'bg-green-100 text-green-700';
    case 'Accepted Risk': return 'bg-slate-100 text-slate-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

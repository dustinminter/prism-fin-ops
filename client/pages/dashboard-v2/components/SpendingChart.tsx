import React from 'react';
import { Card } from '../../../components/ui/Card';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { MONTHLY_TRENDS } from '../../../data';
import { ChevronRight } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export const SpendingChart = () => {
    const data = {
        labels: MONTHLY_TRENDS.map(d => d.month),
        datasets: [
            {
                label: 'Actual Spend',
                data: MONTHLY_TRENDS.map(d => d.actualBurn),
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.05)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#4f46e5',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
            },
            {
                label: 'Planned Burn',
                data: MONTHLY_TRENDS.map(d => d.plannedBurn),
                borderColor: '#94a3b8',
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0,
            },
        ],
    };

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: '#fff',
                titleColor: '#1e293b',
                bodyColor: '#1e293b',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                boxPadding: 4,
                usePointStyle: true,
                callbacks: {
                    label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 0
                            }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                border: {
                    display: false,
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        size: 11
                    }
                }
            },
            y: {
                grid: {
                    color: '#f1f5f9',
                },
                border: {
                    display: false,
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        size: 11
                    },
                    callback: (value) => {
                        if (typeof value === 'number') {
                            return '$' + (value / 1000000) + 'M';
                        }
                        return value;
                    }
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    return (
        <Card className="h-full border-none shadow-sm" noPadding>
            <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Spending Trends</h3>
                        <p className="text-sm text-slate-500 mt-1">Monthly burn analysis across all agencies</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-6 mr-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                                <span className="text-xs font-semibold text-slate-600">Actual</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                                <span className="text-xs font-semibold text-slate-600">Planned</span>
                            </div>
                        </div>
                        <button className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                            Full Report <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 w-full relative min-h-[300px]">
                    <Line data={data} options={options} />
                </div>
            </div>
        </Card>
    );
};

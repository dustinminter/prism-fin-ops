import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Agency } from '../../../data';

ChartJS.register(ArcElement, Tooltip, Legend);

interface RiskDistributionProps {
    agencies: Agency[];
}

export const RiskDistribution = ({ agencies }: RiskDistributionProps) => {
    const riskCounts = agencies.reduce((acc, agency) => {
        acc[agency.riskLevel] = (acc[agency.riskLevel] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const data = {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [
            {
                data: [
                    riskCounts['Critical'] || 0,
                    riskCounts['High'] || 0,
                    riskCounts['Medium'] || 0,
                    riskCounts['Low'] || 0
                ],
                backgroundColor: [
                    '#f43f5e', // rose-500
                    '#f59e0b', // amber-500
                    '#3b82f6', // blue-500
                    '#10b981'  // emerald-500
                ],
                borderWidth: 0,
                hoverOffset: 4,
                cutout: '75%'
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: '#fff',
                titleColor: '#1e293b',
                bodyColor: '#1e293b',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
            }
        }
    };

    return (
        <Card className="h-full border-none shadow-sm" noPadding>
            <div className="p-6 h-full flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Risk Portfolio</h3>
                <p className="text-sm text-slate-500 mb-8">Agency risk distribution</p>
                
                <div className="flex-1 relative min-h-[180px] mb-6">
                    <Doughnut data={data} options={options} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-slate-900">{agencies.length}</span>
                        <span className="text-xs font-medium text-slate-500">Agencies</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {data.labels.map((label, i) => (
                        <div key={label} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.datasets[0].backgroundColor[i] }}></div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-900">{label}</span>
                                <span className="text-[10px] text-slate-500">{data.datasets[0].data[i]} agencies</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

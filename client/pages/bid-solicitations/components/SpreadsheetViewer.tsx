import React, { useState, useEffect } from 'react';
import { parseSpreadsheet, SpreadsheetData } from '../utils/fileParsers';
import { Loader2, AlertCircle } from 'lucide-react';

interface SpreadsheetViewerProps {
    fileUrl: string;
}

export const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({ fileUrl }) => {
    const [data, setData] = useState<SpreadsheetData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSheet, setActiveSheet] = useState<string>('');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const parsedData = await parseSpreadsheet(fileUrl);
                setData(parsedData);
                if (parsedData.sheetNames.length > 0) {
                    setActiveSheet(parsedData.sheetNames[0]);
                }
            } catch (err) {
                setError('Failed to load spreadsheet. Please try downloading it instead.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [fileUrl]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-slate-500 font-medium">Parsing spreadsheet data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <AlertCircle className="w-12 h-12 text-orange-500" />
                <div className="space-y-1">
                    <p className="text-slate-900 font-semibold">{error}</p>
                    <p className="text-sm text-slate-500">The file format might be unsupported or corrupted.</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const currentRows = data.sheets[activeSheet] || [];

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {data.sheetNames.length > 1 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-4 border-b border-slate-100 shrink-0">
                    {data.sheetNames.map(name => (
                        <button
                            key={name}
                            onClick={() => setActiveSheet(name)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                activeSheet === name
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 overflow-auto border border-slate-100 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                        {currentRows.map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50/50'}>
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="px-4 py-3 border-r border-slate-50 last:border-r-0 min-w-[120px]">
                                        {cell?.toString() || ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

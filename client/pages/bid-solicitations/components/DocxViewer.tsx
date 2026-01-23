import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { Loader2, AlertCircle } from 'lucide-react';

interface DocxViewerProps {
    fileUrl: string;
}

export const DocxViewer: React.FC<DocxViewerProps> = ({ fileUrl }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDocx = async () => {
            if (!containerRef.current) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const response = await fetch(fileUrl);
                if (!response.ok) throw new Error('Failed to fetch document');
                
                const arrayBuffer = await response.arrayBuffer();
                
                // Clear container before rendering
                containerRef.current.innerHTML = '';
                
                await renderAsync(arrayBuffer, containerRef.current, undefined, {
                    className: 'docx-content',
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    debug: false
                });
            } catch (err) {
                console.error('Error rendering docx:', err);
                setError('Failed to render document. Please try downloading it instead.');
            } finally {
                setLoading(false);
            }
        };

        loadDocx();
    }, [fileUrl]);

    return (
        <div className="flex flex-col h-full bg-slate-100/50">
            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Rendering document...</p>
                </div>
            )}
            
            {error && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4 text-center">
                    <AlertCircle className="w-12 h-12 text-orange-500" />
                    <div className="space-y-1">
                        <p className="text-slate-900 font-semibold">{error}</p>
                    </div>
                </div>
            )}

            <div 
                ref={containerRef} 
                className={`flex-1 overflow-y-auto p-4 md:p-12 flex flex-col items-center ${loading ? 'hidden' : ''}`}
            />
            
            <style>{`
                .docx-wrapper {
                    background: transparent !important;
                    padding: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    width: 100% !important;
                }
                .docx-content {
                    background: white !important;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
                    margin-bottom: 3rem !important;
                    padding: 48pt !important;
                    width: 100% !important;
                    max-width: 850px !important;
                    min-height: 1100px !important;
                    position: relative !important;
                }
                .docx-content section {
                    margin-bottom: 0 !important;
                }
            `}</style>
        </div>
    );
};

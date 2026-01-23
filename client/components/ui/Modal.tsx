import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    fullScreen?: boolean;
    noPadding?: boolean;
}

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-[95vw]'
};

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    className,
    maxWidth = '2xl',
    fullScreen = false,
    noPadding = false
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div 
                className={cn(
                    "relative bg-white rounded-2xl shadow-2xl flex flex-col w-full animate-in zoom-in-95 duration-200 overflow-hidden",
                    fullScreen ? "h-[95vh] w-[95vw] max-w-none" : cn("max-h-[90vh]", maxWidthClasses[maxWidth]),
                    className
                )}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <h3 className="text-lg font-semibold text-slate-900 truncate pr-4">{title}</h3>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                <div className={cn("flex-1 overflow-auto", noPadding ? "" : "p-6")}>
                    {children}
                </div>
            </div>
        </div>
    );
};

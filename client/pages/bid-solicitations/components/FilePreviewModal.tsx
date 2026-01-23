import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { SpreadsheetViewer } from './SpreadsheetViewer';
import { DocxViewer } from './DocxViewer';
import { getFileExtension } from '../utils/fileParsers';
import { FileText, Download, AlertCircle } from 'lucide-react';

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    filename: string;
    fileUrl: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
    isOpen,
    onClose,
    filename,
    fileUrl
}) => {
    const extension = getFileExtension(filename);

    const renderContent = () => {
        if (extension === 'pdf') {
            return (
                <div className="w-full h-full rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                    <iframe 
                        src={`${fileUrl}#view=FitH`} 
                        className="w-full h-full border-0"
                        title={filename}
                    />
                </div>
            );
        }

        if (extension === 'xlsx' || extension === 'csv') {
            return (
                <div className="h-full flex flex-col p-6">
                    <SpreadsheetViewer fileUrl={fileUrl} />
                </div>
            );
        }

        if (extension === 'docx') {
            return (
                <div className="h-full flex flex-col">
                    <DocxViewer fileUrl={fileUrl} />
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center">
                    <FileText className="w-10 h-10 text-slate-400" />
                </div>
                <div className="space-y-2 max-w-xs">
                    <h4 className="text-slate-900 font-semibold">Preview not available</h4>
                    <p className="text-sm text-slate-500">
                        We can't preview <b>.{extension}</b> files yet. Please download the file to view its contents.
                    </p>
                </div>
                <a 
                    href={fileUrl}
                    download={filename}
                    className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                    <Download className="w-4 h-4" />
                    Download {extension.toUpperCase()}
                </a>
            </div>
        );
    };

    const isFullSize = ['pdf', 'xlsx', 'csv', 'docx'].includes(extension);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={filename}
            fullScreen={isFullSize}
            noPadding={extension === 'pdf' || extension === 'docx'}
            maxWidth={isFullSize ? 'full' : 'md'}
        >
            <div className="h-full">
                {renderContent()}
            </div>
        </Modal>
    );
};

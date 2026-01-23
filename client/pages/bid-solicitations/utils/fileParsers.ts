import * as XLSX from 'xlsx';

export interface SpreadsheetData {
    sheetNames: string[];
    sheets: Record<string, any[][]>;
}

export const parseSpreadsheet = async (url: string): Promise<SpreadsheetData> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const spreadsheetData: SpreadsheetData = {
            sheetNames: workbook.SheetNames,
            sheets: {}
        };
        
        workbook.SheetNames.forEach(name => {
            const worksheet = workbook.Sheets[name];
            spreadsheetData.sheets[name] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        });
        
        return spreadsheetData;
    } catch (error) {
        console.error('Error parsing spreadsheet:', error);
        throw error;
    }
};

export const getFileExtension = (filename: string): string => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
};

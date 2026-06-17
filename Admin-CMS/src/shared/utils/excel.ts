/**
 * Excel export utilities using ExcelJS
 */

import ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExcelColumn[];
  data: Record<string, unknown>[];
  author?: string;
  title?: string;
}

/**
 * Export data to Excel file using ExcelJS
 */
export async function exportToExcel({
  filename,
  sheetName = 'Sheet1',
  columns,
  data,
  author = 'QV Admin Panel',
  title,
}: ExcelExportOptions): Promise<void> {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = author;
  workbook.created = new Date();
  workbook.modified = new Date();
  if (title) {
    workbook.title = title;
  }

  // Add a worksheet
  const worksheet = workbook.addWorksheet(sheetName);

  // Define columns
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Style the header row
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  data.forEach((item) => {
    worksheet.addRow(item);
  });

  // Apply auto-filter to header row
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  // Freeze the header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Create blob and download
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file using ExcelJS
 */
export async function exportToCSV({
  filename,
  columns,
  data,
}: Omit<ExcelExportOptions, 'sheetName' | 'author' | 'title'>): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Define columns
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Add data rows
  data.forEach((item) => {
    worksheet.addRow(item);
  });

  // Generate CSV buffer
  const buffer = await workbook.csv.writeBuffer();

  // Create blob and download
  const blob = new Blob([buffer], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read Excel file and return data
 */
export async function readExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in the file');
  }

  const data: Record<string, unknown>[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row is headers
      row.eachCell((cell) => {
        headers.push(String(cell.value));
      });
    } else {
      // Data rows
      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });
      data.push(rowData);
    }
  });

  return data;
}

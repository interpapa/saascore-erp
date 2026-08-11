/**
 * Utility to export an array of objects as a downloadable UTF-8 CSV file.
 * Compatible with Microsoft Excel, Google Sheets, and standard CSV parsers.
 */

export interface CSVColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

export function exportToCSV<T>(filename: string, columns: CSVColumn<T>[], data: T[]): void {
  if (typeof window === 'undefined') return;

  // Build header row
  const headerRow = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',');

  // Build data rows
  const dataRows = data.map(item => {
    return columns.map(c => {
      const val = c.accessor(item);
      if (val === null || val === undefined) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(',');
  });

  // Combine CSV content with UTF-8 BOM byte order mark (\uFEFF)
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

  // Trigger browser download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

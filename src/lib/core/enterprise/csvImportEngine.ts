/**
 * SaaSCore ERP - Asistente de Importación & Mapeo CSV/Excel (Import Wizard)
 * 
 * Permite cargar archivos CSV/Excel con mapeo visual dinámico de columnas
 * reconociendo encabezados y transformando datos al esquema ERP.
 */

export interface ColumnMapping {
  csvHeader: string;
  targetField: string; // ej. "name", "email", "base_price", "sku"
}

export interface CSVImportResult<T> {
  success: boolean;
  totalRows: number;
  importedRows: T[];
  skippedRows: number;
  errors: string[];
}

/**
 * Parsea el texto plano CSV a un array de objetos según el mapeo de columnas configurado.
 */
export function processCSVMapping<T = Record<string, unknown>>(
  csvRawContent: string,
  mappings: ColumnMapping[]
): CSVImportResult<T> {
  const lines = csvRawContent.split(/\r?\n/).filter(line => line.trim() !== '');

  if (lines.length < 2) {
    return { success: false, totalRows: 0, importedRows: [], skippedRows: 0, errors: ['El archivo CSV está vacío o no contiene filas de datos.'] };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const dataRows = lines.slice(1);

  const importedRows: T[] = [];
  const errors: string[] = [];
  let skippedRows = 0;

  dataRows.forEach((rowStr, idx) => {
    const values = rowStr.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const itemObj: Record<string, unknown> = {};

    mappings.forEach(map => {
      const colIndex = headers.indexOf(map.csvHeader);
      if (colIndex !== -1 && values[colIndex] !== undefined) {
        itemObj[map.targetField] = values[colIndex];
      }
    });

    if (Object.keys(itemObj).length > 0) {
      importedRows.push(itemObj as T);
    } else {
      skippedRows++;
      errors.push(`Fila ${idx + 2}: sin coincidencias de mapeo.`);
    }
  });

  return {
    success: true,
    totalRows: dataRows.length,
    importedRows,
    skippedRows,
    errors,
  };
}

// CSV Export Empirical Stress Test

function testJournalCSVExport(journalEntries: Array<{
  id: string;
  entry_number?: string;
  entry_date: string;
  description: string;
  source_document_ref?: string;
  total_debit: number;
  total_credit: number;
  status: string;
}>) {
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Asiento,Fecha,Descripcion,RefDoc,DebitoTotal,CreditoTotal,Estado\n';
  journalEntries.forEach((e) => {
    csvContent += `"${e.entry_number || e.id}","${e.entry_date}","${e.description}","${e.source_document_ref || ''}",${e.total_debit},${e.total_credit},"${e.status}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  return { csvContent, encodedUri };
}

// Test Case 1: Quotes in description
const entriesWithQuotes = [
  {
    id: 'e1',
    entry_number: 'AS-001',
    entry_date: '2026-08-01',
    description: 'Factura "Supermercado" #999',
    source_document_ref: 'INV-001',
    total_debit: 100,
    total_credit: 100,
    status: 'posted',
  },
];

const res1 = testJournalCSVExport(entriesWithQuotes);
console.log('--- Test 1: Quotes & Hash in Description ---');
console.log('Raw CSV content:\n', res1.csvContent);
console.log('Encoded URI:\n', res1.encodedUri);
console.log('Contains unescaped hash # in encoded URI?', res1.encodedUri.includes('#'));
console.log('Contains unescaped double quotes inside quote field?', res1.csvContent.includes('"Supermercado"'));

// RFC 4180 Check:
// If field contains quotes, quotes must be doubled: ""Supermercado""
// Hash character # in data: URI must be %23, otherwise browser truncates file content at fragment marker.

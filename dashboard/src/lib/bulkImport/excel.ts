import * as XLSX from 'xlsx';
import {
  BULK_IMPORT_BASE_COLUMNS,
  BULK_IMPORT_WARRANTY_COLUMNS,
  BulkImportBaseColumn,
  BulkImportColumn,
  BulkImportRow,
  BulkImportWarrantyColumn,
} from '@/lib/api/shops.types';

export const BULK_IMPORT_COLUMN_HELP: Record<
  BulkImportColumn,
  { label: string; required: boolean; hint: string }
> = {
  productName: {
    label: 'Product name',
    required: true,
    hint: 'Unique product name within the shop',
  },
  categoryName: {
    label: 'Category name',
    required: true,
    hint: 'Created automatically if it does not exist',
  },
  type: {
    label: 'Type',
    required: true,
    hint: 'product or service',
  },
  amount: {
    label: 'Selling price',
    required: false,
    hint: 'Required for product rows; optional for service',
  },
  cost: {
    label: 'Cost',
    required: false,
    hint: 'Unit cost for products; leave empty for service',
  },
  isInventoryAvailable: {
    label: 'Track inventory',
    required: true,
    hint: 'true/false, yes/no, or 1/0',
  },
  openingQty: {
    label: 'Opening qty',
    required: false,
    hint: 'Required when inventory tracking is true',
  },
  barcode: {
    label: 'Barcode',
    required: false,
    hint: 'Optional unique barcode for products',
  },
  productNumber: {
    label: 'Product number',
    required: false,
    hint: 'Optional menu/POS code. Must be unique in the file and unique per shop when set',
  },
  warrantyAvailable: {
    label: 'Warranty available',
    required: false,
    hint: 'true/false, yes/no, or 1/0 — product rows only; leave empty for false',
  },
  warrantyMonths: {
    label: 'Warranty months',
    required: false,
    hint: 'Required when warrantyAvailable is true; whole number greater than 0',
  },
};

export const DEFAULT_SAMPLE_ROWS: Array<
  Record<BulkImportBaseColumn, string | number | boolean> &
    Partial<Record<BulkImportWarrantyColumn, string | number | boolean>>
> = [
  {
    productName: 'Chicken Fried Rice',
    categoryName: 'Main Dishes',
    type: 'product',
    amount: 850,
    cost: 420,
    isInventoryAvailable: false,
    openingQty: '',
    barcode: '',
    productNumber: '101',
  },
  {
    productName: 'Mineral Water 500ml',
    categoryName: 'Beverages',
    type: 'product',
    amount: 120,
    cost: 70,
    isInventoryAvailable: true,
    openingQty: 24,
    barcode: '4790012345678',
    productNumber: '102',
  },
  {
    productName: 'Table Service Charge',
    categoryName: 'Services',
    type: 'service',
    amount: '',
    cost: '',
    isInventoryAvailable: false,
    openingQty: '',
    barcode: '',
    productNumber: '',
  },
];

function normalizeCellValue(value: unknown): string | number | boolean {
  if (value == null) return '';
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  return String(value).trim();
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '');
}

export function resolveBulkImportColumns(warrantyModule = false): BulkImportColumn[] {
  return warrantyModule
    ? [...BULK_IMPORT_BASE_COLUMNS, ...BULK_IMPORT_WARRANTY_COLUMNS]
    : [...BULK_IMPORT_BASE_COLUMNS];
}

export function buildBulkImportWorkbook(
  columns: BulkImportColumn[],
  rows: BulkImportRow[] = DEFAULT_SAMPLE_ROWS,
) {
  const sheetRows = [
    [...columns],
    ...rows.map((row) => columns.map((column) => row[column] ?? '')),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet['!cols'] = columns.map((column) => ({
    wch: Math.max(column.length + 4, 18),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  return workbook;
}

export function downloadBulkImportSample(
  filename = 'smartcost-bulk-upload-sample.xlsx',
  columns: BulkImportColumn[] = [...BULK_IMPORT_BASE_COLUMNS],
  rows: BulkImportRow[] = DEFAULT_SAMPLE_ROWS,
) {
  const workbook = buildBulkImportWorkbook(columns, rows);
  XLSX.writeFile(workbook, filename);
}

export type ParsedBulkImportFile = {
  columns: BulkImportColumn[];
  rows: BulkImportRow[];
  fileName: string;
};

export function validateBulkImportRows(rows: BulkImportRow[]): string[] {
  const errors: string[] = [];
  const productNameTracker = new Map<string, number>();
  const productNumberTracker = new Map<string, number>();
  const barcodeTracker = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const productName = String(row.productName ?? '').trim();
    if (productName) {
      const key = productName.toLowerCase();
      if (productNameTracker.has(key)) {
        errors.push(
          `Row ${rowNumber}: productName "${productName}" is duplicated (first seen on row ${productNameTracker.get(key)})`,
        );
      } else {
        productNameTracker.set(key, rowNumber);
      }
    }

    const productNumber = String(row.productNumber ?? '').trim();
    if (productNumber) {
      const key = productNumber.toLowerCase();
      if (productNumberTracker.has(key)) {
        errors.push(
          `Row ${rowNumber}: productNumber "${productNumber}" is duplicated (first seen on row ${productNumberTracker.get(key)})`,
        );
      } else {
        productNumberTracker.set(key, rowNumber);
      }
    }

    const barcode = String(row.barcode ?? '').trim();
    if (barcode) {
      const key = barcode.toLowerCase();
      if (barcodeTracker.has(key)) {
        errors.push(
          `Row ${rowNumber}: barcode "${barcode}" is duplicated (first seen on row ${barcodeTracker.get(key)})`,
        );
      } else {
        barcodeTracker.set(key, rowNumber);
      }
    }
  });

  return errors;
}

export function parseBulkImportWorkbook(
  buffer: ArrayBuffer,
  fileName: string,
  expectedColumns: BulkImportColumn[],
): ParsedBulkImportFile {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The Excel file has no worksheets');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!matrix.length) {
    throw new Error('The Excel file is empty');
  }

  const headerRow = matrix[0] ?? [];
  const normalizedHeaders = headerRow.map(normalizeHeader);

  const columns = expectedColumns.map((expected, index) => {
    const received = normalizedHeaders[index] ?? '';
    if (received !== expected) {
      throw new Error(
        `Column ${index + 1} must be "${expected}" but received "${received || '(empty)'}"`,
      );
    }
    return expected;
  });

  const rows: BulkImportRow[] = matrix
    .slice(1)
    .filter((row) =>
      row.some((cell) => String(cell ?? '').trim() !== ''),
    )
    .map((row) => {
      const record = {} as BulkImportRow;
      columns.forEach((column, index) => {
        record[column] = normalizeCellValue(row[index]);
      });
      return record;
    });

  if (!rows.length) {
    throw new Error('No product rows found below the header row');
  }

  return { columns, rows, fileName };
}

export async function parseBulkImportFile(
  file: File,
  expectedColumns: BulkImportColumn[],
): Promise<ParsedBulkImportFile> {
  const buffer = await file.arrayBuffer();
  return parseBulkImportWorkbook(buffer, file.name, expectedColumns);
}

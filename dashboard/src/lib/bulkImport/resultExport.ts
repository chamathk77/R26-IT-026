import * as XLSX from 'xlsx';
import type { BulkImportResultResponse } from '@/lib/api/shops.types';

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-LK');
}

export function downloadBulkImportResultReport(
  shopId: string,
  result: BulkImportResultResponse,
  filename?: string,
) {
  const summary = result.summary;
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ['Shop ID', shopId],
    ['Imported by', result.importedByName ?? ''],
    ['Imported at', formatDate(result.importedAt)],
    ['Total rows', summary?.totalRows ?? 0],
    ['Imported', summary?.imported ?? 0],
    ['Failed', summary?.failed ?? 0],
    ['Categories created', summary?.categoriesCreated ?? 0],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

  const importedProducts = result.importedProducts ?? [];
  if (importedProducts.length > 0) {
    const importedSheet = XLSX.utils.json_to_sheet(
      importedProducts.map((product) => ({
        rowNumber: product.rowNumber,
        productName: product.productName ?? '',
        productNumber: product.productNumber ?? '',
        categoryName: product.categoryName ?? '',
        type: product.type ?? '',
        productId: product.id,
        categoryId: product.categoryId ?? '',
      })),
    );
    XLSX.utils.book_append_sheet(workbook, importedSheet, 'Imported');
  }

  const failedRows = result.failedRows ?? [];
  if (failedRows.length > 0) {
    const failedSheet = XLSX.utils.json_to_sheet(
      failedRows.map((row) => ({
        rowNumber: row.rowNumber,
        productName: row.productName ?? '',
        productNumber: row.productNumber ?? '',
        categoryName: row.categoryName ?? '',
        type: row.type ?? '',
        amount: row.amount ?? '',
        cost: row.cost ?? '',
        isInventoryAvailable: row.isInventoryAvailable ?? '',
        openingQty: row.openingQty ?? '',
        barcode: row.barcode ?? '',
        errors: row.errors.join('; '),
      })),
    );
    XLSX.utils.book_append_sheet(workbook, failedSheet, 'Failed rows');
  }

  const categories = result.categoriesCreated ?? [];
  if (categories.length > 0) {
    const categorySheet = XLSX.utils.json_to_sheet(
      categories.map((category) => ({
        categoryId: category.id,
        name: category.name,
        colorCode: category.colorCode ?? '',
      })),
    );
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'New categories');
  }

  const safeShopId = shopId.replace(/[^\w-]+/g, '_');
  XLSX.writeFile(
    workbook,
    filename ?? `${safeShopId}-bulk-import-result.xlsx`,
  );
}

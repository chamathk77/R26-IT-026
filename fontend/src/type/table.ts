export interface ShopTable {
  _id: string;
  shopId: string;
  branchId: string;
  tableNumber: string;
  tableName: string;
  capacity: number | null;
  zone: string;
  sortOrder: number;
  isActive: boolean;
  status?: TablePickerStatus;
  occupiedSessionId?: string | null;
  occupiedCartNumber?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export type TablePickerStatus = 'free' | 'occupied';

export interface TablePickerItem extends ShopTable {
  status: TablePickerStatus;
}

export interface CreateTableRequest {
  tableNumber: string;
  tableName?: string;
  capacity?: number | null;
  zone?: string;
  sortOrder?: number;
}

export interface BulkCreateTablesRequest {
  count: number;
  startNumber?: number;
  prefix?: string;
  zone?: string;
  defaultCapacity?: number | null;
}

export interface UpdateTablePayload {
  id: string;
  tableNumber?: string;
  tableName?: string;
  capacity?: number | null;
  zone?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface GetTablesResponse {
  success: boolean;
  count: number;
  data: ShopTable[];
  message?: string;
}

export interface CreateTableResponse {
  success: boolean;
  data: ShopTable;
  message?: string;
}

export interface BulkCreateTablesResponse {
  success: boolean;
  count: number;
  data: ShopTable[];
  message?: string;
}

export interface UpdateTableResponse {
  success: boolean;
  data: ShopTable;
  message?: string;
}

export interface DeleteTableResponse {
  success: boolean;
  id?: string;
  message?: string;
}

export interface BulkDeleteTablesRequest {
  ids: string[];
}

export interface BulkDeleteTablesResponse {
  success: boolean;
  count: number;
  message?: string;
}

export function getTableDisplayLabel(table: Pick<ShopTable, 'tableNumber'>): string {
  return table.tableNumber.trim();
}

export interface ParsedTableNumber {
  prefix: string;
  number: number | null;
  raw: string;
}

/** Split values like T1, Table12, S3 into prefix + trailing number. */
export function parseTableNumber(value: string): ParsedTableNumber {
  const raw = value.trim();
  const match = raw.match(/^(.*?)(\d+)$/);

  if (!match) {
    return { prefix: raw.toUpperCase(), number: null, raw };
  }

  return {
    prefix: match[1].toUpperCase(),
    number: Number.parseInt(match[2], 10),
    raw,
  };
}

/** Numeric order within the same prefix: T1, T2, T3 (not T1, T10, T2). */
export function compareTablesWithinPrefix(
  a: Pick<ShopTable, 'tableNumber'>,
  b: Pick<ShopTable, 'tableNumber'>,
): number {
  const parsedA = parseTableNumber(a.tableNumber);
  const parsedB = parseTableNumber(b.tableNumber);

  if (
    parsedA.number != null &&
    parsedB.number != null &&
    parsedA.number !== parsedB.number
  ) {
    return parsedA.number - parsedB.number;
  }

  return parsedA.raw.localeCompare(parsedB.raw, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/** Natural order: prefix group (T…, S…), then numeric suffix (1, 2, 3 … not 1, 10, 2). */
export function compareTablesByNumber(
  a: Pick<ShopTable, 'tableNumber'>,
  b: Pick<ShopTable, 'tableNumber'>,
): number {
  const parsedA = parseTableNumber(a.tableNumber);
  const parsedB = parseTableNumber(b.tableNumber);

  const prefixCompare = parsedA.prefix.localeCompare(parsedB.prefix, undefined, {
    sensitivity: 'base',
  });
  if (prefixCompare !== 0) {
    return prefixCompare;
  }

  return compareTablesWithinPrefix(a, b);
}

interface PrefixGroupMeta {
  minSortOrder: number;
  minCreatedAt: string;
}

function buildPrefixGroupMeta(
  tables: Pick<ShopTable, 'tableNumber' | 'sortOrder' | 'createdAt'>[],
): Map<string, PrefixGroupMeta> {
  const meta = new Map<string, PrefixGroupMeta>();

  for (const table of tables) {
    const prefix = parseTableNumber(table.tableNumber).prefix;
    const createdAt = String(table.createdAt ?? '');
    const existing = meta.get(prefix);

    if (!existing) {
      meta.set(prefix, { minSortOrder: table.sortOrder, minCreatedAt: createdAt });
      continue;
    }

    existing.minSortOrder = Math.min(existing.minSortOrder, table.sortOrder);
    if (createdAt && (!existing.minCreatedAt || createdAt < existing.minCreatedAt)) {
      existing.minCreatedAt = createdAt;
    }
  }

  return meta;
}

/**
 * List order: full prefix groups first (T1…T35), then next group (S1…S3).
 * Within a group: 1, 2, 3 …
 * Group order uses bulk sortOrder / created time so T batch stays before S batch.
 */
export function compareTablesForDisplay(
  a: Pick<ShopTable, 'tableNumber' | 'sortOrder' | 'createdAt'>,
  b: Pick<ShopTable, 'tableNumber' | 'sortOrder' | 'createdAt'>,
  prefixMeta: Map<string, PrefixGroupMeta>,
): number {
  const prefixA = parseTableNumber(a.tableNumber).prefix;
  const prefixB = parseTableNumber(b.tableNumber).prefix;

  if (prefixA !== prefixB) {
    const metaA = prefixMeta.get(prefixA);
    const metaB = prefixMeta.get(prefixB);

    if (metaA && metaB && metaA.minSortOrder !== metaB.minSortOrder) {
      return metaA.minSortOrder - metaB.minSortOrder;
    }

    if (metaA && metaB) {
      const createdCompare = metaA.minCreatedAt.localeCompare(metaB.minCreatedAt);
      if (createdCompare !== 0) {
        return createdCompare;
      }
    }

    return prefixA.localeCompare(prefixB, undefined, { sensitivity: 'base' });
  }

  return compareTablesWithinPrefix(a, b);
}

export function sortTablesForDisplay<
  T extends Pick<ShopTable, 'tableNumber' | 'sortOrder' | 'createdAt'>,
>(tables: T[]): T[] {
  if (tables.length <= 1) {
    return [...tables];
  }

  const prefixMeta = buildPrefixGroupMeta(tables);
  return [...tables].sort((a, b) => compareTablesForDisplay(a, b, prefixMeta));
}

export interface TablePrefixGroup<
  T extends Pick<ShopTable, 'tableNumber' | 'sortOrder' | 'createdAt'>,
> {
  prefix: string;
  title: string;
  tables: T[];
}

export function getTablePrefixGroupTitle(prefix: string): string {
  if (!prefix.trim()) {
    return 'Tables';
  }
  return prefix;
}

/** Group sorted tables into separate prefix sections (T…, then S…). */
export function groupTablesByPrefix<
  T extends Pick<ShopTable, 'tableNumber' | 'sortOrder' | 'createdAt'>,
>(tables: T[]): TablePrefixGroup<T>[] {
  const sorted = sortTablesForDisplay(tables);
  const groups: TablePrefixGroup<T>[] = [];
  const indexByPrefix = new Map<string, number>();

  for (const table of sorted) {
    const prefix = parseTableNumber(table.tableNumber).prefix;
    const existingIndex = indexByPrefix.get(prefix);

    if (existingIndex === undefined) {
      indexByPrefix.set(prefix, groups.length);
      groups.push({
        prefix,
        title: getTablePrefixGroupTitle(prefix),
        tables: [table],
      });
      continue;
    }

    groups[existingIndex].tables.push(table);
  }

  return groups;
}

export function toTablePickerItems(tables: ShopTable[]): TablePickerItem[] {
  return tables.map((table) => ({
    ...table,
    status: table.status === 'occupied' ? 'occupied' : 'free',
  }));
}

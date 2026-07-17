export interface SalePerson {
  _id: string;
  shopId: string;
  salePersonId: string;
  firstName: string;
  lastName: string;
  position: string;
  allowedBranchIds: string[];
  image: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetSalePersonsResponse {
  success: boolean;
  count: number;
  data: SalePerson[];
}

export interface GetSalePersonByIdResponse {
  success: boolean;
  data: SalePerson;
}

export interface CreateSalePersonRequest {
  salePersonId: string;
  firstName: string;
  lastName: string;
  position: string;
  allowedBranchIds: string[];
  imageUri?: string | null;
}

export interface UpdateSalePersonPayload {
  id: string;
  salePersonId?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  allowedBranchIds?: string[];
  imageUri?: string | null;
}

export interface CreateSalePersonResponse {
  success: boolean;
  data: SalePerson;
}

export interface UpdateSalePersonResponse {
  success: boolean;
  data: SalePerson;
}

export interface DeleteSalePersonResponse {
  success: boolean;
  message: string;
  id: string;
}

export function getSalePersonFullName(
  person: Pick<SalePerson, 'firstName' | 'lastName'>,
): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function formatSalePersonJoinedDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

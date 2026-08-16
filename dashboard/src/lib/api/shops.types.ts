export interface OnboardUserSummary {
  shopId: string;
  shopName: string;
  shopMobileNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber: string;
  oneTimePaymentAmount: number | null;
  isOneTimePaymentGenerated: boolean;
  isOneTimePaymentDone: boolean;
}

export interface OnboardUsersResponse {
  success: boolean;
  count: number;
  shops: OnboardUserSummary[];
}

export interface OnboardingShopDetails {
  shopName: string;
  address: string;
  shopMobileNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber: string;
  email: string | null;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
  warrantyModule: boolean;
  quotationsModule: boolean;
  oneTimePaymentAmount: number | null;
  isOneTimePaymentDone: boolean;
  isOneTimePaymentGenerated: boolean;
  oneTimePaymentReceiptNo: string | null;
  shopId: string;
}

export interface OnboardingShopDetailsResponse {
  success: boolean;
  shop: OnboardingShopDetails;
}

export interface UpdateOnboardingShopPayload {
  shopName?: string;
  address?: string;
  shopMobileNumber?: string;
  email?: string | null;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerMobileNumber?: string;
  oneTimePaymentAmount?: number | null;
  kpi?: boolean;
  analyticsModule?: boolean;
  customerManualOrder?: boolean;
  costModule?: boolean;
  marketingModule?: boolean;
  warrantyModule?: boolean;
  quotationsModule?: boolean;
}

export interface UpdateOnboardingShopResponse {
  success: boolean;
  message: string;
  shop: OnboardingShopDetails;
}

export type TrialShopStatus = 'trial' | 'trialExpired';

export interface TrialShopSummary {
  shopId: string;
  shopName: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber: string;
  shopMobileNumber: string;
  status: TrialShopStatus;
  isTrailStared: boolean;
  isTrailCompleted: boolean;
  trailStartDate: string | null;
  trailEndDate: string | null;
  trialSecondsRemaining: number;
  onboardStep: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrialShopsResponse {
  success: boolean;
  count: number;
  shops: TrialShopSummary[];
}

export interface TrialShopDetails {
  shopId: string;
  shopName: string;
  address: string;
  shopMobileNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber: string;
  email: string | null;
  status: TrialShopStatus;
  onboardStep: string;
  isTrailStared: boolean;
  isTrailCompleted: boolean;
  trailStartDate: string | null;
  trailEndDate: string | null;
  trialSecondsRemaining: number;
  oneTimePaymentAmount: number | null;
  isOneTimePaymentDone: boolean;
  isOneTimePaymentGenerated: boolean;
  oneTimePaymentReceiptNo: string | null;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
  warrantyModule: boolean;
  quotationsModule: boolean;
  maxUsers: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrialShopDetailsResponse {
  success: boolean;
  shop: TrialShopDetails;
}

export interface FinishTrialShopResponse {
  success: boolean;
  message: string;
  shop: TrialShopDetails;
  trialExpired: boolean;
  sessionEnded: boolean;
  clearedUserTokens: number;
}

export type ActiveShopStatus =
  | 'active'
  | 'due'
  | 'paymentPending'
  | 'changeSubscription'
  | 'initialPaymentApproved'
  | 'subscriptionPaymentPending';

export interface ActiveShopSummary {
  shopId: string;
  shopName: string;
  address: string;
  shopMobileNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber: string;
  email: string | null;
  status: ActiveShopStatus;
  subscriptionType: string | null;
  nextPaymentDate: string | null;
  maxUsers: number | null;
  onboardStep: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveShopsResponse {
  success: boolean;
  count: number;
  filters: {
    status: string | null;
    ownerMobileNumber: string | null;
    shopId: string | null;
  };
  allowedStatuses: ActiveShopStatus[];
  shops: ActiveShopSummary[];
}

export interface FetchActiveShopsParams {
  status?: ActiveShopStatus;
  ownerMobileNumber?: string;
  shopId?: string;
}

export interface ActiveShopSmsFeature {
  senderId: string | null;
  smsPackageType: string | null;
  smsUsedInPeriod: number;
  isSmsFeatureActive: boolean;
  smsFeatureStatus: string;
  smsNextRenewalDate: string | null;
  smsDueDays: number;
  smsReceiptNo: string | null;
  isSmsDeactivationScheduled: boolean;
}

export type IndustryType = 'retail' | 'restaurant' | 'salon' | 'automotive';

export interface RestaurantModuleFlags {
  kitchenOrders: boolean;
  tableManagement: boolean;
}

export interface SalonModuleFlags {
  appointments: boolean;
}

export interface ShopTaxConfig {
  id: string;
  label: string;
  rate: number;
  enabled: boolean;
}

export interface ShopBillingConfig {
  taxes: ShopTaxConfig[];
}

export interface ActiveShopDetails {
  shopId: string;
  shopName: string;
  address: string;
  shopMobileNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber: string;
  email: string | null;
  status: ActiveShopStatus;
  onboardStep: string | null;
  subscriptionType: string | null;
  subscriptionStartDate: string | null;
  currentPaymentDoneDate: string | null;
  nextPaymentDate: string | null;
  subsAmount: number | null;
  subscriptionReceiptNo: string | null;
  subscriptionDueDays: number;
  isSubscriptionChangePending: boolean;
  oneTimePaymentAmount: number | null;
  isOneTimePaymentDone: boolean;
  isOneTimePaymentGenerated: boolean;
  oneTimePaymentReceiptNo: string | null;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
  warrantyModule: boolean;
  quotationsModule: boolean;
  billingConfig: ShopBillingConfig;
  webModule: boolean;
  webModuleEnabledAt: string | null;
  industryType: IndustryType;
  restaurantModule: RestaurantModuleFlags | null;
  salonModule: SalonModuleFlags | null;
  maxUsers: number | null;
  isAdditionalUsersAdded: boolean;
  numAdditionalUsers: number | null;
  smsfeature: ActiveShopSmsFeature;
  isTrailStared: boolean;
  isTrailCompleted: boolean;
  trailStartDate: string | null;
  trailEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveShopDetailsResponse {
  success: boolean;
  shop: ActiveShopDetails;
  canEdit?: boolean;
  allowedStatuses?: string[];
  allowedSubscriptionTypes?: string[];
  allowedSmsPackageTypes?: string[];
  allowedSmsFeatureStatuses?: string[];
}

export interface UpdateActiveShopSmsFeaturePayload {
  senderId?: string | null;
  smsUsedInPeriod?: number;
  isSmsFeatureActive?: boolean;
  smsFeatureStatus?: string;
  smsNextRenewalDate?: string | null;
  smsDueDays?: number;
  isSmsDeactivationScheduled?: boolean;
}

export interface UpdateActiveShopPayload {
  shopName?: string;
  address?: string;
  shopMobileNumber?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerMobileNumber?: string;
  email?: string | null;
  status?: string;
  subscriptionType?: string | null;
  nextPaymentDate?: string | null;
  subscriptionDueDays?: number;
  isSubscriptionChangePending?: boolean;
  kpi?: boolean;
  analyticsModule?: boolean;
  customerManualOrder?: boolean;
  costModule?: boolean;
  marketingModule?: boolean;
  warrantyModule?: boolean;
  quotationsModule?: boolean;
  billingConfig?: ShopBillingConfig;
  maxUsers?: number;
  isAdditionalUsersAdded?: boolean;
  numAdditionalUsers?: number | null;
  webModule?: boolean;
  webModuleEnabledAt?: string | null;
  smsfeature?: UpdateActiveShopSmsFeaturePayload;
}

export interface UpdateActiveShopResponse {
  success: boolean;
  message: string;
  shop: ActiveShopDetails;
  canEdit?: boolean;
  allowedStatuses?: string[];
  allowedSubscriptionTypes?: string[];
  allowedSmsPackageTypes?: string[];
  allowedSmsFeatureStatuses?: string[];
}

export interface ClearActiveShopDataResponse {
  success: boolean;
  message: string;
  shopId: string;
  shopName: string;
  deleted: {
    shopsData: number;
    users: number;
    salePersons: number;
    products: number;
    categories: number;
    carts: number;
    customers: number;
    costCategories: number;
    costExpenses: number;
    bulkProductImportResults: number;
    payments: number;
    history: number;
    branchStock: number;
    branches: number;
  };
  cronReportsScrubbed: {
    dueDaysCronReportsModified: number;
    trialCronReportsModified: number;
    smsDueDaysCronReportsModified: number;
    smsBillCronReportsModified: number;
    billingCronReportsModified: number;
  };
}

export interface ActiveShopBranchItem {
  _id: string;
  shopId: string;
  branchId: string;
  branchName: string;
  address: string;
  phone: string;
  isMainBranch: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveShopBranchesResponse {
  success: boolean;
  count: number;
  activeCount: number;
  inactiveCount: number;
  shop: {
    shopId: string;
    shopName: string;
    status: string;
    industryType: IndustryType;
  };
  branches: ActiveShopBranchItem[];
}

export type ActiveShopPaymentType = 'subscription' | 'upFront' | 'sms';

export type ActiveShopPaymentStatus = 'pending' | 'approve' | 'rejected' | 'notPaid';

export interface ActiveShopPaymentItem {
  _id: string;
  shopId: string;
  receiptNumber: string;
  receiptImagePath?: string;
  receiptImageUrl?: string | null;
  receiptImageAvailable?: boolean;
  paymentType: ActiveShopPaymentType | string;
  paymentAmount: number | null;
  additionalPayments?: Array<{ name: string; amount: number }>;
  subscriptionType: string | null;
  IsOnboaringPayment: boolean;
  submittedDate: string | null;
  paymentMonth: string | null;
  exactPaymentDay: string | null;
  expiryDate: string | null;
  status: ActiveShopPaymentStatus | string;
  reason: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveShopPaymentsResponse {
  success: boolean;
  count: number;
  totalForShop: number;
  shop: {
    shopId: string;
    shopName: string;
    status: string;
    subscriptionType: string | null;
  };
  filters: {
    paymentType: ActiveShopPaymentType | null;
    status: ActiveShopPaymentStatus | null;
  };
  allowedPaymentTypes: ActiveShopPaymentType[];
  allowedStatuses: ActiveShopPaymentStatus[];
  countsByStatus: Record<string, number>;
  countsByType: Record<string, number>;
  payments: ActiveShopPaymentItem[];
}

export interface FetchActiveShopPaymentsParams {
  paymentType?: ActiveShopPaymentType;
  status?: ActiveShopPaymentStatus;
}

export interface ActiveShopPaymentDetailsResponse {
  success: boolean;
  shop: {
    shopId: string;
    shopName: string;
    status: string;
  };
  payment: ActiveShopPaymentItem;
  canEdit: boolean;
  editableStatuses: ActiveShopPaymentStatus[];
}

export interface UpdateActiveShopPaymentPayload {
  paymentAmount?: number;
  description?: string | null;
}

export interface UpdateActiveShopPaymentResponse {
  success: boolean;
  message: string;
  shop: {
    shopId: string;
    shopName: string;
    status: string;
  };
  payment: ActiveShopPaymentItem;
  canEdit: boolean;
  editableStatuses: ActiveShopPaymentStatus[];
}

export interface DeleteActiveShopPaymentResponse {
  success: boolean;
  message: string;
  shopId: string;
  paymentId: string;
  deletedPayment: ActiveShopPaymentItem;
}

export const BULK_IMPORT_BASE_COLUMNS = [
  'productName',
  'categoryName',
  'type',
  'amount',
  'cost',
  'isInventoryAvailable',
  'openingQty',
  'barcode',
  'productNumber',
] as const;

export const BULK_IMPORT_WARRANTY_COLUMNS = ['warrantyAvailable', 'warrantyMonths'] as const;

/** @deprecated use template API expectedColumns — kept for backward compatibility */
export const BULK_IMPORT_COLUMNS = BULK_IMPORT_BASE_COLUMNS;

export type BulkImportBaseColumn = (typeof BULK_IMPORT_BASE_COLUMNS)[number];
export type BulkImportWarrantyColumn = (typeof BULK_IMPORT_WARRANTY_COLUMNS)[number];
export type BulkImportColumn = BulkImportBaseColumn | BulkImportWarrantyColumn;

export type BulkImportRow = Record<BulkImportBaseColumn, string | number | boolean> &
  Partial<Record<BulkImportWarrantyColumn, string | number | boolean>>;

export interface BulkImportTemplateResponse {
  success: boolean;
  warrantyModule?: boolean;
  expectedColumns: BulkImportColumn[];
  sampleRows: BulkImportRow[];
  notes: string[];
}

export interface BulkImportSummary {
  totalRows: number;
  imported: number;
  failed: number;
  categoriesCreated: number;
}

export interface BulkImportCategoryCreated {
  id: string;
  name: string;
  colorCode?: string;
}

export interface BulkImportFailedRow {
  rowNumber: number;
  productName?: string;
  categoryName?: string;
  type?: string;
  amount?: string | number;
  cost?: string | number;
  isInventoryAvailable?: string | boolean;
  openingQty?: string | number;
  barcode?: string;
  productNumber?: string;
  warrantyAvailable?: string | boolean;
  warrantyMonths?: string | number;
  errors: string[];
}

export interface BulkImportImportedProduct {
  id: string;
  rowNumber: number;
  productName?: string;
  categoryId?: string;
  categoryName?: string;
  type?: string;
  productNumber?: string;
}

export interface BulkImportResponse {
  success: boolean;
  message?: string;
  summary?: BulkImportSummary;
  categoriesCreated?: BulkImportCategoryCreated[];
  importedProducts?: BulkImportImportedProduct[];
  failedRows?: BulkImportFailedRow[];
  shopId?: string;
  branchIdUsed?: string | null;
  errors?: string[];
  expectedColumns?: BulkImportColumn[];
  receivedColumns?: string[];
}

export interface BulkImportResultResponse extends BulkImportResponse {
  importedBy?: string;
  importedByName?: string;
  importedAt?: string | null;
}

export interface DeleteShopBulkImportCatalogResponse {
  success: boolean;
  message: string;
  shopId: string;
  deleted: {
    branchStock: number;
    products: number;
    categories: number;
    carts: number;
    bulkImportResults: number;
  };
}

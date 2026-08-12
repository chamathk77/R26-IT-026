'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import axios from 'axios';
import DashboardShell from '@/components/layout/DashboardShell';
import {
  clearActiveShopData,
  fetchActiveShopDetails,
  updateActiveShopDetails,
} from '@/lib/api/shops';
import type {
  ActiveShopDetails,
  ActiveShopStatus,
  UpdateActiveShopPayload,
} from '@/lib/api/shops.types';

type EditableActiveShopForm = {
  shopName: string;
  address: string;
  shopMobileNumber: string;
  email: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber: string;
  status: string;
  subscriptionType: string;
  nextPaymentDate: string;
  subscriptionDueDays: string;
  isSubscriptionChangePending: boolean;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
  warrantyModule: boolean;
  maxUsers: string;
  isAdditionalUsersAdded: boolean;
  numAdditionalUsers: string;
  webModule: boolean;
  webModuleEnabledAt: string;
  smsSenderId: string;
  smsUsedInPeriod: string;
  isSmsFeatureActive: boolean;
  smsFeatureStatus: string;
  smsNextRenewalDate: string;
  smsDueDays: string;
  isSmsDeactivationScheduled: boolean;
};

const DEFAULT_SMS_STATUSES = ['notActivated', 'active', 'pending', 'due', 'inactive'];
const DEFAULT_SUBSCRIPTION_TYPES = ['1month', '3months', '6months', '1year'];
const ACTIVE_BILLING_STATUSES = [
  'active',
  'due',
  'paymentPending',
  'changeSubscription',
  'initialPaymentApproved',
  'subscriptionPaymentPending',
];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAmount(amount?: number | null): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function formatStatusLabel(status: string): string {
  return status.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function statusGradient(status: ActiveShopStatus | string): string {
  switch (status) {
    case 'active':
      return 'linear-gradient(135deg, #2e7d32 0%, #00897b 100%)';
    case 'due':
      return 'linear-gradient(135deg, #ef6c00 0%, #f9a825 100%)';
    case 'paymentPending':
    case 'subscriptionPaymentPending':
      return 'linear-gradient(135deg, #c62828 0%, #ad1457 100%)';
    case 'changeSubscription':
    case 'initialPaymentApproved':
      return 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)';
    default:
      return 'linear-gradient(135deg, #455a64 0%, #607d8b 100%)';
  }
}

function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }
  return date.toISOString();
}

function toFormState(shop: ActiveShopDetails): EditableActiveShopForm {
  return {
    shopName: shop.shopName ?? '',
    address: shop.address ?? '',
    shopMobileNumber: shop.shopMobileNumber ?? '',
    email: shop.email ?? '',
    ownerFirstName: shop.ownerFirstName ?? '',
    ownerLastName: shop.ownerLastName ?? '',
    ownerMobileNumber: shop.ownerMobileNumber ?? '',
    status: shop.status ?? 'active',
    subscriptionType: shop.subscriptionType ?? '',
    nextPaymentDate: toDateTimeLocalValue(shop.nextPaymentDate),
    subscriptionDueDays: String(shop.subscriptionDueDays ?? 0),
    isSubscriptionChangePending: Boolean(shop.isSubscriptionChangePending),
    kpi: Boolean(shop.kpi),
    analyticsModule: Boolean(shop.analyticsModule),
    customerManualOrder: Boolean(shop.customerManualOrder),
    costModule: Boolean(shop.costModule),
    marketingModule: Boolean(shop.marketingModule),
    warrantyModule: Boolean(shop.warrantyModule),
    maxUsers: shop.maxUsers == null ? '' : String(shop.maxUsers),
    isAdditionalUsersAdded: Boolean(shop.isAdditionalUsersAdded),
    numAdditionalUsers:
      shop.numAdditionalUsers == null ? '' : String(shop.numAdditionalUsers),
    webModule: Boolean(shop.webModule),
    webModuleEnabledAt: toDateTimeLocalValue(shop.webModuleEnabledAt),
    smsSenderId: shop.smsfeature.senderId ?? '',
    smsUsedInPeriod: String(shop.smsfeature.smsUsedInPeriod ?? 0),
    isSmsFeatureActive: Boolean(shop.smsfeature.isSmsFeatureActive),
    smsFeatureStatus: shop.smsfeature.smsFeatureStatus ?? 'notActivated',
    smsNextRenewalDate: toDateTimeLocalValue(shop.smsfeature.smsNextRenewalDate),
    smsDueDays: String(shop.smsfeature.smsDueDays ?? 0),
    isSmsDeactivationScheduled: Boolean(shop.smsfeature.isSmsDeactivationScheduled),
  };
}

function formsEqual(a: EditableActiveShopForm, b: EditableActiveShopForm): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildUpdatePayload(form: EditableActiveShopForm): UpdateActiveShopPayload {
  const subscriptionDueDays = Number(form.subscriptionDueDays);
  if (!Number.isFinite(subscriptionDueDays) || subscriptionDueDays < 0) {
    throw new Error('Subscription due days must be a valid number ≥ 0');
  }

  const maxUsers = Number(form.maxUsers);
  if (!Number.isFinite(maxUsers) || maxUsers < 1) {
    throw new Error('Max users must be at least 1');
  }

  const smsUsedInPeriod = Number(form.smsUsedInPeriod);
  if (!Number.isFinite(smsUsedInPeriod) || smsUsedInPeriod < 0) {
    throw new Error('SMS used in period must be a valid number ≥ 0');
  }

  const smsDueDays = Number(form.smsDueDays);
  if (!Number.isFinite(smsDueDays) || smsDueDays < 0) {
    throw new Error('SMS due days must be a valid number ≥ 0');
  }

  let numAdditionalUsers: number | null = null;
  if (form.numAdditionalUsers.trim() !== '') {
    const parsed = Number(form.numAdditionalUsers);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error('Additional users must be a valid number ≥ 0');
    }
    numAdditionalUsers = parsed;
  }

  return {
    shopName: form.shopName.trim(),
    address: form.address.trim(),
    shopMobileNumber: form.shopMobileNumber.trim(),
    email: form.email.trim() === '' ? null : form.email.trim(),
    ownerFirstName: form.ownerFirstName.trim(),
    ownerLastName: form.ownerLastName.trim(),
    ownerMobileNumber: form.ownerMobileNumber.trim(),
    status: form.status,
    subscriptionType: form.subscriptionType.trim() === '' ? null : form.subscriptionType.trim(),
    nextPaymentDate: fromDateTimeLocalValue(form.nextPaymentDate),
    subscriptionDueDays,
    isSubscriptionChangePending: form.isSubscriptionChangePending,
    kpi: form.kpi,
    analyticsModule: form.analyticsModule,
    customerManualOrder: form.customerManualOrder,
    costModule: form.costModule,
    marketingModule: form.marketingModule,
    warrantyModule: form.warrantyModule,
    maxUsers,
    isAdditionalUsersAdded: form.isAdditionalUsersAdded,
    numAdditionalUsers,
    webModule: form.webModule,
    webModuleEnabledAt: fromDateTimeLocalValue(form.webModuleEnabledAt),
    smsfeature: {
      senderId: form.smsSenderId.trim() === '' ? null : form.smsSenderId.trim(),
      smsUsedInPeriod,
      isSmsFeatureActive: form.isSmsFeatureActive,
      smsFeatureStatus: form.smsFeatureStatus,
      smsNextRenewalDate: fromDateTimeLocalValue(form.smsNextRenewalDate),
      smsDueDays,
      isSmsDeactivationScheduled: form.isSmsDeactivationScheduled,
    },
  };
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

function ModuleChip({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <Chip
      label={label}
      size="small"
      color={enabled ? 'success' : 'default'}
      variant={enabled ? 'filled' : 'outlined'}
      sx={{ fontWeight: 600 }}
    />
  );
}

const INDUSTRY_TYPE_LABELS: Record<string, string> = {
  retail: 'General shop (Retail)',
  restaurant: 'Restaurant',
  salon: 'Salon',
  automotive: 'Automotive / spare parts',
};

function formatIndustryTypeLabel(industryType?: string | null): string {
  if (!industryType) return 'General shop (Retail)';
  return INDUSTRY_TYPE_LABELS[industryType] ?? industryType;
}

function IndustryModuleChips({ shop }: { shop: ActiveShopDetails }) {
  if (shop.industryType === 'restaurant' && shop.restaurantModule) {
    return (
      <>
        <ModuleChip label="Table management" enabled={shop.restaurantModule.tableManagement} />
        <ModuleChip label="Kitchen orders" enabled={shop.restaurantModule.kitchenOrders} />
      </>
    );
  }

  if (shop.industryType === 'salon' && shop.salonModule) {
    return <ModuleChip label="Appointments" enabled={shop.salonModule.appointments} />;
  }

  if (shop.industryType === 'automotive' && shop.automotiveModule) {
    return (
      <>
        <ModuleChip label="Quotations" enabled={shop.automotiveModule.quotations} />
        <ModuleChip label="Warranty" enabled={shop.automotiveModule.warranty} />
      </>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      No industry-specific modules for this business type.
    </Typography>
  );
}

export default function ActiveShopDetailsPage() {
  const router = useRouter();
  const params = useParams<{ shopId: string }>();
  const shopId = params.shopId ? decodeURIComponent(params.shopId) : '';

  const [shop, setShop] = useState<ActiveShopDetails | null>(null);
  const [originalForm, setOriginalForm] = useState<EditableActiveShopForm | null>(null);
  const [form, setForm] = useState<EditableActiveShopForm | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([]);
  const [allowedSubscriptionTypes, setAllowedSubscriptionTypes] = useState<string[]>(
    DEFAULT_SUBSCRIPTION_TYPES,
  );
  const [allowedSmsFeatureStatuses, setAllowedSmsFeatureStatuses] = useState<string[]>(
    DEFAULT_SMS_STATUSES,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmShopId, setConfirmShopId] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const editable = canEdit;

  const isDirty = useMemo(() => {
    if (!form || !originalForm) return false;
    return !formsEqual(form, originalForm);
  }, [form, originalForm]);

  const loadDetails = useCallback(async () => {
    if (!shopId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveShopDetails(shopId);
      const nextForm = toFormState(data.shop);
      setShop(data.shop);
      setOriginalForm(nextForm);
      setForm(nextForm);
      setCanEdit(Boolean(data.canEdit));
      setAllowedStatuses(data.allowedStatuses ?? []);
      setAllowedSubscriptionTypes(
        data.allowedSubscriptionTypes ?? DEFAULT_SUBSCRIPTION_TYPES,
      );
      setAllowedSmsFeatureStatuses(
        data.allowedSmsFeatureStatuses ?? DEFAULT_SMS_STATUSES,
      );
    } catch (err) {
      setShop(null);
      setOriginalForm(null);
      setForm(null);
      setError(getApiErrorMessage(err, 'Failed to load active shop details'));
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const updateField = <K extends keyof EditableActiveShopForm>(
    key: K,
    value: EditableActiveShopForm[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSuccess(null);
  };

  const handleReset = () => {
    if (!originalForm) return;
    setForm({ ...originalForm });
    setError(null);
    setSuccess(null);
  };

  const handleUpdate = async () => {
    if (!form || !shopId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = buildUpdatePayload(form);
      const response = await updateActiveShopDetails(shopId, payload);
      const nextForm = toFormState(response.shop);
      setShop(response.shop);
      setOriginalForm(nextForm);
      setForm(nextForm);
      setCanEdit(Boolean(response.canEdit));
      setSuccess(response.message || 'Shop updated successfully');

      if (!ACTIVE_BILLING_STATUSES.includes(response.shop.status)) {
        setTimeout(() => router.push('/shops/active'), 1500);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update shop'));
    } finally {
      setSaving(false);
    }
  };

  const canConfirmClear =
    confirmShopId.trim().toUpperCase() === shopId.trim().toUpperCase() && !clearing;

  const handleOpenClearDialog = () => {
    setConfirmShopId('');
    setClearError(null);
    setConfirmOpen(true);
  };

  const handleClearShopData = async () => {
    if (!shopId || !canConfirmClear) return;

    setClearing(true);
    setClearError(null);

    try {
      await clearActiveShopData(shopId, confirmShopId.trim());
      setConfirmOpen(false);
      router.push('/shops/active');
    } catch (err) {
      setClearError(getApiErrorMessage(err, 'Failed to clear shop data'));
    } finally {
      setClearing(false);
    }
  };

  const displayStatus = form?.status ?? shop?.status ?? 'active';

  return (
    <DashboardShell title="Active shop details" subtitle={`Shop ${shopId || '—'}`}>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/shops/active')}>
          Back to active shops
        </Button>

        {shop ? (
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<UploadFileOutlinedIcon />}
              onClick={() =>
                router.push(`/shops/active/${encodeURIComponent(shopId)}/bulk-upload`)
              }
              sx={{
                fontWeight: 800,
                borderRadius: 2.5,
                px: 2.5,
                background: 'linear-gradient(135deg, #6a1b9a 0%, #1565c0 100%)',
                boxShadow: '0 10px 24px rgba(106, 27, 154, 0.28)',
              }}
            >
              Bulk upload
            </Button>
            <Button
              variant="contained"
              startIcon={<AccountTreeOutlinedIcon />}
              onClick={() =>
                router.push(`/shops/active/${encodeURIComponent(shopId)}/branches`)
              }
              sx={{
                fontWeight: 800,
                borderRadius: 2.5,
                px: 2.5,
                background: 'linear-gradient(135deg, #6a1b9a 0%, #1565c0 100%)',
                boxShadow: '0 10px 24px rgba(106, 27, 154, 0.28)',
              }}
            >
              See branches
            </Button>
            <Button
              variant="contained"
              startIcon={<PaymentsOutlinedIcon />}
              onClick={() =>
                router.push(`/shops/active/${encodeURIComponent(shopId)}/payments`)
              }
              sx={{
                fontWeight: 800,
                borderRadius: 2.5,
                px: 2.5,
                background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
                boxShadow: '0 10px 24px rgba(21, 101, 192, 0.28)',
              }}
            >
              See payments
            </Button>
          </Stack>
        ) : null}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      ) : null}

      {!loading && shop && form ? (
        <>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card
                sx={{
                  mb: 3,
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    background: statusGradient(displayStatus),
                    color: '#fff',
                  }}
                >
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1 }}>
                    <StorefrontOutlinedIcon sx={{ fontSize: 36 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>
                        {form.shopName || shop.shopName || shop.shopId}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {shop.shopId}
                      </Typography>
                    </Box>
                    <Chip
                      label={formatStatusLabel(displayStatus)}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.18)',
                        color: '#fff',
                        fontWeight: 700,
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    />
                  </Stack>

                  <Typography variant="body2" sx={{ opacity: 0.95, mt: 1 }}>
                    Plan: {form.subscriptionType || shop.subscriptionType || '—'} · Next payment:{' '}
                    {form.nextPaymentDate
                      ? formatDate(fromDateTimeLocalValue(form.nextPaymentDate) ?? undefined)
                      : formatDate(shop.nextPaymentDate)}
                  </Typography>
                  <Chip
                    label={formatIndustryTypeLabel(shop.industryType)}
                    size="small"
                    sx={{
                      mt: 1.5,
                      bgcolor: 'rgba(255,255,255,0.18)',
                      color: '#fff',
                      fontWeight: 700,
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                  />
                </Box>

                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                    <CalendarMonthOutlinedIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Subscription
                    </Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      {editable ? (
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Status</InputLabel>
                          <Select
                            label="Status"
                            value={form.status}
                            onChange={(e) => updateField('status', e.target.value)}
                          >
                            {(allowedStatuses.length ? allowedStatuses : [form.status]).map(
                              (status) => (
                                <MenuItem key={status} value={status}>
                                  {formatStatusLabel(status)}
                                </MenuItem>
                              ),
                            )}
                          </Select>
                        </FormControl>
                      ) : (
                        <DetailRow label="Status" value={formatStatusLabel(shop.status)} />
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      {editable ? (
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Subscription type</InputLabel>
                          <Select
                            label="Subscription type"
                            value={form.subscriptionType}
                            onChange={(e) => updateField('subscriptionType', e.target.value)}
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {allowedSubscriptionTypes.map((type) => (
                              <MenuItem key={type} value={type}>
                                {type}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <DetailRow
                          label="Subscription type"
                          value={shop.subscriptionType || '—'}
                        />
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      {editable ? (
                        <TextField
                          label="Next payment"
                          type="datetime-local"
                          value={form.nextPaymentDate}
                          onChange={(e) => updateField('nextPaymentDate', e.target.value)}
                          fullWidth
                          slotProps={{ inputLabel: { shrink: true } }}
                          sx={{ mb: 2 }}
                        />
                      ) : (
                        <DetailRow label="Next payment" value={formatDate(shop.nextPaymentDate)} />
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      {editable ? (
                        <TextField
                          label="Subscription due days"
                          type="number"
                          value={form.subscriptionDueDays}
                          onChange={(e) => updateField('subscriptionDueDays', e.target.value)}
                          fullWidth
                          slotProps={{ htmlInput: { min: 0 } }}
                          sx={{ mb: 2 }}
                        />
                      ) : (
                        <DetailRow
                          label="Due days"
                          value={String(shop.subscriptionDueDays ?? 0)}
                        />
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DetailRow label="Amount" value={formatAmount(shop.subsAmount)} />
                      <DetailRow
                        label="Subscription start"
                        value={formatDate(shop.subscriptionStartDate)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DetailRow
                        label="Last payment done"
                        value={formatDate(shop.currentPaymentDoneDate)}
                      />
                      <DetailRow label="Receipt no." value={shop.subscriptionReceiptNo || '—'} />
                      {editable ? (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={form.isSubscriptionChangePending}
                              onChange={(e) =>
                                updateField('isSubscriptionChangePending', e.target.checked)
                              }
                            />
                          }
                          label="Plan change pending"
                          sx={{ mt: 1 }}
                        />
                      ) : (
                        <DetailRow
                          label="Plan change pending"
                          value={shop.isSubscriptionChangePending ? 'Yes' : 'No'}
                        />
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 3, mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Shop & owner
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Shop ID"
                        value={shop.shopId}
                        fullWidth
                        disabled
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Shop name"
                        value={form.shopName}
                        onChange={(e) => updateField('shopName', e.target.value)}
                        fullWidth
                        required
                        disabled={!editable}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Address"
                        value={form.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        fullWidth
                        required
                        multiline
                        minRows={2}
                        disabled={!editable}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Shop mobile"
                        value={form.shopMobileNumber}
                        onChange={(e) => updateField('shopMobileNumber', e.target.value)}
                        fullWidth
                        required
                        disabled={!editable}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        fullWidth
                        type="email"
                        disabled={!editable}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Owner first name"
                        value={form.ownerFirstName}
                        onChange={(e) => updateField('ownerFirstName', e.target.value)}
                        fullWidth
                        required
                        disabled={!editable}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Owner last name"
                        value={form.ownerLastName}
                        onChange={(e) => updateField('ownerLastName', e.target.value)}
                        fullWidth
                        required
                        disabled={!editable}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Owner mobile"
                        value={form.ownerMobileNumber}
                        onChange={(e) => updateField('ownerMobileNumber', e.target.value)}
                        fullWidth
                        required
                        disabled={!editable}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DetailRow label="Onboard step" value={shop.onboardStep || '—'} />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                    <SmsOutlinedIcon color="secondary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      SMS feature
                    </Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      {editable ? (
                        <>
                          <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>SMS feature status</InputLabel>
                            <Select
                              label="SMS feature status"
                              value={form.smsFeatureStatus}
                              onChange={(e) => updateField('smsFeatureStatus', e.target.value)}
                            >
                              {allowedSmsFeatureStatuses.map((status) => (
                                <MenuItem key={status} value={status}>
                                  {formatStatusLabel(status)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            label="Sender ID"
                            value={form.smsSenderId}
                            onChange={(e) => updateField('smsSenderId', e.target.value)}
                            fullWidth
                            sx={{ mb: 2 }}
                          />
                          <DetailRow
                            label="Package"
                            value={shop.smsfeature.smsPackageType || '—'}
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={form.isSmsFeatureActive}
                                onChange={(e) =>
                                  updateField('isSmsFeatureActive', e.target.checked)
                                }
                              />
                            }
                            label="SMS feature active"
                          />
                        </>
                      ) : (
                        <>
                          <DetailRow
                            label="Status"
                            value={formatStatusLabel(shop.smsfeature.smsFeatureStatus)}
                          />
                          <DetailRow label="Sender ID" value={shop.smsfeature.senderId || '—'} />
                          <DetailRow
                            label="Package"
                            value={shop.smsfeature.smsPackageType || '—'}
                          />
                          <DetailRow
                            label="Active"
                            value={shop.smsfeature.isSmsFeatureActive ? 'Yes' : 'No'}
                          />
                        </>
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      {editable ? (
                        <>
                          <TextField
                            label="Used this period"
                            type="number"
                            value={form.smsUsedInPeriod}
                            onChange={(e) => updateField('smsUsedInPeriod', e.target.value)}
                            fullWidth
                            slotProps={{ htmlInput: { min: 0 } }}
                            sx={{ mb: 2 }}
                          />
                          <TextField
                            label="Next renewal"
                            type="datetime-local"
                            value={form.smsNextRenewalDate}
                            onChange={(e) => updateField('smsNextRenewalDate', e.target.value)}
                            fullWidth
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ mb: 2 }}
                          />
                          <TextField
                            label="SMS due days"
                            type="number"
                            value={form.smsDueDays}
                            onChange={(e) => updateField('smsDueDays', e.target.value)}
                            fullWidth
                            slotProps={{ htmlInput: { min: 0 } }}
                            sx={{ mb: 2 }}
                          />
                          <DetailRow
                            label="Receipt no."
                            value={shop.smsfeature.smsReceiptNo || '—'}
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={form.isSmsDeactivationScheduled}
                                onChange={(e) =>
                                  updateField('isSmsDeactivationScheduled', e.target.checked)
                                }
                              />
                            }
                            label="Deactivation scheduled"
                          />
                        </>
                      ) : (
                        <>
                          <DetailRow
                            label="Used this period"
                            value={String(shop.smsfeature.smsUsedInPeriod ?? 0)}
                          />
                          <DetailRow
                            label="Next renewal"
                            value={formatDate(shop.smsfeature.smsNextRenewalDate)}
                          />
                          <DetailRow
                            label="SMS due days"
                            value={String(shop.smsfeature.smsDueDays ?? 0)}
                          />
                          <DetailRow
                            label="Receipt no."
                            value={shop.smsfeature.smsReceiptNo || '—'}
                          />
                        </>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Card sx={{ mb: 3, borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                    <PaymentOutlinedIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      One-time payment
                    </Typography>
                  </Stack>
                  <DetailRow label="Amount" value={formatAmount(shop.oneTimePaymentAmount)} />
                  <DetailRow
                    label="Payment generated"
                    value={shop.isOneTimePaymentGenerated ? 'Yes' : 'No'}
                  />
                  <DetailRow
                    label="Payment done"
                    value={shop.isOneTimePaymentDone ? 'Yes' : 'No'}
                  />
                  <DetailRow label="Receipt no." value={shop.oneTimePaymentReceiptNo || '—'} />
                </CardContent>
              </Card>

              <Card sx={{ mb: 3, borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Industry
                  </Typography>
                  <DetailRow
                    label="Business type"
                    value={formatIndustryTypeLabel(shop.industryType)}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Industry modules
                  </Typography>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <IndustryModuleChips shop={shop} />
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ mb: 3, borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Modules & users
                  </Typography>
                  {editable ? (
                    <Stack spacing={1.5}>
                      {(
                        [
                          ['kpi', 'KPI'],
                          ['analyticsModule', 'Analytics'],
                          ['customerManualOrder', 'Manual order'],
                          ['costModule', 'Cost'],
                          ['marketingModule', 'Marketing'],
                          ['warrantyModule', 'Warranty'],
                          ['webModule', 'Web portal'],
                        ] as const
                      ).map(([key, label]) => (
                        <FormControlLabel
                          key={key}
                          control={
                            <Switch
                              checked={form[key]}
                              onChange={(e) => updateField(key, e.target.checked)}
                            />
                          }
                          label={label}
                        />
                      ))}
                      <TextField
                        label="Max users"
                        type="number"
                        value={form.maxUsers}
                        onChange={(e) => updateField('maxUsers', e.target.value)}
                        fullWidth
                        slotProps={{ htmlInput: { min: 1 } }}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={form.isAdditionalUsersAdded}
                            onChange={(e) =>
                              updateField('isAdditionalUsersAdded', e.target.checked)
                            }
                          />
                        }
                        label="Additional users added"
                      />
                      <TextField
                        label="Additional users count"
                        type="number"
                        value={form.numAdditionalUsers}
                        onChange={(e) => updateField('numAdditionalUsers', e.target.value)}
                        fullWidth
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                      <TextField
                        label="Web enabled at"
                        type="datetime-local"
                        value={form.webModuleEnabledAt}
                        onChange={(e) => updateField('webModuleEnabledAt', e.target.value)}
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Stack>
                  ) : (
                    <>
                      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <ModuleChip label="KPI" enabled={shop.kpi} />
                        <ModuleChip label="Analytics" enabled={shop.analyticsModule} />
                        <ModuleChip label="Manual order" enabled={shop.customerManualOrder} />
                        <ModuleChip label="Cost" enabled={shop.costModule} />
                        <ModuleChip label="Marketing" enabled={shop.marketingModule} />
                        <ModuleChip label="Warranty" enabled={shop.warrantyModule} />
                        <ModuleChip label="Web" enabled={shop.webModule} />
                      </Stack>
                      <Divider sx={{ my: 2 }} />
                      <DetailRow label="Max users" value={String(shop.maxUsers ?? '—')} />
                      <DetailRow
                        label="Additional users added"
                        value={shop.isAdditionalUsersAdded ? 'Yes' : 'No'}
                      />
                      <DetailRow
                        label="Additional users"
                        value={
                          shop.numAdditionalUsers != null ? String(shop.numAdditionalUsers) : '—'
                        }
                      />
                      <DetailRow
                        label="Web enabled at"
                        value={formatDate(shop.webModuleEnabledAt)}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Trial history
                  </Typography>
                  <DetailRow label="Trial started" value={formatDate(shop.trailStartDate)} />
                  <DetailRow label="Trial ended" value={formatDate(shop.trailEndDate)} />
                  <DetailRow
                    label="Trial started flag"
                    value={shop.isTrailStared ? 'Yes' : 'No'}
                  />
                  <DetailRow
                    label="Trial completed"
                    value={shop.isTrailCompleted ? 'Yes' : 'No'}
                  />
                  <Divider sx={{ my: 2 }} />
                  <DetailRow label="Created" value={formatDate(shop.createdAt)} />
                  <DetailRow label="Updated" value={formatDate(shop.updatedAt)} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {editable ? (
            <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
              You have admin access. Edit the fields above and use the buttons below to save
              changes.
            </Alert>
          ) : null}

          {editable && isDirty ? (
            <Box
              sx={{
                position: 'sticky',
                bottom: 16,
                mt: 3,
                p: 2,
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
                zIndex: 10,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                You have unsaved changes
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<RestartAltIcon />}
                  onClick={handleReset}
                  disabled={saving}
                >
                  Reset
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={
                    saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />
                  }
                  onClick={() => void handleUpdate()}
                  disabled={saving}
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2.5,
                    px: 3,
                    background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
                    boxShadow: '0 10px 24px rgba(21, 101, 192, 0.28)',
                  }}
                >
                  Update
                </Button>
              </Stack>
            </Box>
          ) : null}

          <Card
            sx={{
              mt: 4,
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'error.light',
              background:
                'linear-gradient(180deg, rgba(198,40,40,0.06) 0%, rgba(255,255,255,1) 55%)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={3}
                sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
              >
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
                    <WarningAmberRoundedIcon color="error" />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'error.dark' }}>
                      Danger zone
                    </Typography>
                  </Stack>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.75 }}>
                    Clear all users data for this shop
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
                    This permanently deletes the shop record and all related data for{' '}
                    <strong>{shop.shopId}</strong>: users, branches, products, categories, carts,
                    customers, sales history, payments, sale persons, cost records, branch stock,
                    and bulk import results. Cron report entries for this shop are also removed.
                    This cannot be undone.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<DeleteForeverOutlinedIcon />}
                  onClick={handleOpenClearDialog}
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2.5,
                    px: 3,
                    py: 1.25,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 10px 24px rgba(198,40,40,0.28)',
                  }}
                >
                  Clear all data
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Dialog
        open={confirmOpen}
        onClose={() => !clearing && setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            pt: 3,
            pb: 2,
            background: 'linear-gradient(135deg, #c62828 0%, #880e4f 100%)',
            color: '#fff',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <DeleteForeverOutlinedIcon sx={{ fontSize: 28 }} />
            <DialogTitle sx={{ p: 0, fontWeight: 800, color: 'inherit' }}>
              Clear all users data?
            </DialogTitle>
          </Stack>
        </Box>

        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" variant="outlined" sx={{ mb: 2.5, borderRadius: 2 }}>
            This action will clear all the users data for{' '}
            <strong>{shop?.shopName || shopId}</strong> ({shopId}). It cannot be undone.
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Type the shop ID <strong>{shopId}</strong> to confirm.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            label="Confirm shop ID"
            placeholder={shopId}
            value={confirmShopId}
            onChange={(e) => setConfirmShopId(e.target.value)}
            disabled={clearing}
          />

          {clearError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {clearError}
            </Alert>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={clearing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!canConfirmClear}
            onClick={() => void handleClearShopData()}
            startIcon={
              clearing ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DeleteForeverOutlinedIcon />
              )
            }
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {clearing ? 'Clearing…' : 'Yes, clear all data'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardShell>
  );
}

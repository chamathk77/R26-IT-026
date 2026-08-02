'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import axios from 'axios';
import DashboardShell from '@/components/layout/DashboardShell';
import {
  fetchOnboardingShopDetails,
  updateOnboardingShop,
} from '@/lib/api/shops';
import type {
  OnboardingShopDetails,
  UpdateOnboardingShopPayload,
} from '@/lib/api/shops.types';

type EditableShopForm = {
  shopName: string;
  address: string;
  shopMobileNumber: string;
  email: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerMobileNumber: string;
  oneTimePaymentAmount: string;
  kpi: boolean;
  analyticsModule: boolean;
  customerManualOrder: boolean;
  costModule: boolean;
  marketingModule: boolean;
};

function toFormState(shop: OnboardingShopDetails): EditableShopForm {
  return {
    shopName: shop.shopName ?? '',
    address: shop.address ?? '',
    shopMobileNumber: shop.shopMobileNumber ?? '',
    email: shop.email ?? '',
    ownerFirstName: shop.ownerFirstName ?? '',
    ownerLastName: shop.ownerLastName ?? '',
    ownerMobileNumber: shop.ownerMobileNumber ?? '',
    oneTimePaymentAmount:
      shop.oneTimePaymentAmount == null ? '' : String(shop.oneTimePaymentAmount),
    kpi: Boolean(shop.kpi),
    analyticsModule: Boolean(shop.analyticsModule),
    customerManualOrder: Boolean(shop.customerManualOrder),
    costModule: Boolean(shop.costModule),
    marketingModule: Boolean(shop.marketingModule),
  };
}

function formsEqual(a: EditableShopForm, b: EditableShopForm): boolean {
  return (
    a.shopName === b.shopName &&
    a.address === b.address &&
    a.shopMobileNumber === b.shopMobileNumber &&
    a.email === b.email &&
    a.ownerFirstName === b.ownerFirstName &&
    a.ownerLastName === b.ownerLastName &&
    a.ownerMobileNumber === b.ownerMobileNumber &&
    a.oneTimePaymentAmount === b.oneTimePaymentAmount &&
    a.kpi === b.kpi &&
    a.analyticsModule === b.analyticsModule &&
    a.customerManualOrder === b.customerManualOrder &&
    a.costModule === b.costModule &&
    a.marketingModule === b.marketingModule
  );
}

function buildUpdatePayload(form: EditableShopForm): UpdateOnboardingShopPayload {
  let oneTimePaymentAmount: number | null = null;

  if (form.oneTimePaymentAmount.trim() !== '') {
    const amount = Number(form.oneTimePaymentAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error('One-time payment amount must be a valid number ≥ 0');
    }
    oneTimePaymentAmount = amount;
  }

  return {
    shopName: form.shopName.trim(),
    address: form.address.trim(),
    shopMobileNumber: form.shopMobileNumber.trim(),
    email: form.email.trim() === '' ? null : form.email.trim(),
    ownerFirstName: form.ownerFirstName.trim(),
    ownerLastName: form.ownerLastName.trim(),
    ownerMobileNumber: form.ownerMobileNumber.trim(),
    oneTimePaymentAmount,
    kpi: form.kpi,
    analyticsModule: form.analyticsModule,
    customerManualOrder: form.customerManualOrder,
    costModule: form.costModule,
    marketingModule: form.marketingModule,
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

export default function ShopOnboardingDetailsPage() {
  const router = useRouter();
  const params = useParams<{ shopId: string }>();
  const shopId = params.shopId ? decodeURIComponent(params.shopId) : '';

  const [shop, setShop] = useState<OnboardingShopDetails | null>(null);
  const [originalForm, setOriginalForm] = useState<EditableShopForm | null>(null);
  const [form, setForm] = useState<EditableShopForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    if (!form || !originalForm) return false;
    return !formsEqual(form, originalForm);
  }, [form, originalForm]);

  const loadDetails = useCallback(async () => {
    if (!shopId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchOnboardingShopDetails(shopId);
      const nextForm = toFormState(data.shop);
      setShop(data.shop);
      setOriginalForm(nextForm);
      setForm(nextForm);
    } catch (err) {
      setShop(null);
      setOriginalForm(null);
      setForm(null);
      setError(getApiErrorMessage(err, 'Failed to load shop details'));
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const updateField = <K extends keyof EditableShopForm>(
    key: K,
    value: EditableShopForm[K],
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
      await updateOnboardingShop(shopId, payload);
      await loadDetails();
      setSuccess('Shop updated successfully');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update shop'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell title="Onboarding shop details" subtitle={`Shop ${shopId || '—'}`}>
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
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/shops/onboarding')}
        >
          Back to onboarding list
        </Button>

        {isDirty ? (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
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
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
              onClick={() => void handleUpdate()}
              disabled={saving}
            >
              Update
            </Button>
          </Box>
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
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ mb: 3 }}>
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
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Shop name"
                      value={form.shopName}
                      onChange={(e) => updateField('shopName', e.target.value)}
                      fullWidth
                      required
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
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Shop mobile"
                      value={form.shopMobileNumber}
                      onChange={(e) => updateField('shopMobileNumber', e.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      fullWidth
                      type="email"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Owner first name"
                      value={form.ownerFirstName}
                      onChange={(e) => updateField('ownerFirstName', e.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Owner last name"
                      value={form.ownerLastName}
                      onChange={(e) => updateField('ownerLastName', e.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Owner mobile"
                      value={form.ownerMobileNumber}
                      onChange={(e) => updateField('ownerMobileNumber', e.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Modules
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Toggle module activation for this shop
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.kpi}
                        onChange={(e) => updateField('kpi', e.target.checked)}
                      />
                    }
                    label="KPI"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.analyticsModule}
                        onChange={(e) => updateField('analyticsModule', e.target.checked)}
                      />
                    }
                    label="Analytics"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.customerManualOrder}
                        onChange={(e) => updateField('customerManualOrder', e.target.checked)}
                      />
                    }
                    label="Customer manual order"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.costModule}
                        onChange={(e) => updateField('costModule', e.target.checked)}
                      />
                    }
                    label="Cost module"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.marketingModule}
                        onChange={(e) => updateField('marketingModule', e.target.checked)}
                      />
                    }
                    label="Marketing"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  One-time payment
                </Typography>
                <TextField
                  label="One-time payment amount"
                  value={form.oneTimePaymentAmount}
                  onChange={(e) => updateField('oneTimePaymentAmount', e.target.value)}
                  fullWidth
                  type="number"
                  slotProps={{
                    htmlInput: { min: 0, step: '0.01' },
                  }}
                  helperText="Leave empty to clear amount"
                  sx={{ mb: 2 }}
                />
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  Payment generated
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                  {shop.isOneTimePaymentGenerated ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  Payment done
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                  {shop.isOneTimePaymentDone ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  Receipt number
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {shop.oneTimePaymentReceiptNo || '—'}
                </Typography>
              </CardContent>
            </Card>

            {isDirty ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                You have unsaved changes. Click Update to save, or Reset to restore the previous values.
              </Alert>
            ) : null}
          </Grid>
        </Grid>
      ) : null}
    </DashboardShell>
  );
}

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
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import axios from 'axios';
import DashboardShell from '@/components/layout/DashboardShell';
import {
  formatPaymentStatusLabel,
  formatPaymentTypeLabel,
  formatSubscriptionTypeLabel,
  getPaymentStatusColor,
} from '@/components/payments/paymentUi';
import {
  deleteActiveShopPayment,
  fetchActiveShopPaymentDetails,
  updateActiveShopPayment,
} from '@/lib/api/shops';
import type { ActiveShopPaymentItem } from '@/lib/api/shops.types';

function formatDate(value?: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMonth(value?: string | null): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function statusGradient(status: string): string {
  if (status === 'approve') return 'linear-gradient(135deg, #2e7d32 0%, #00897b 100%)';
  if (status === 'pending') return 'linear-gradient(135deg, #ef6c00 0%, #f9a825 100%)';
  if (status === 'rejected') return 'linear-gradient(135deg, #c62828 0%, #ad1457 100%)';
  return 'linear-gradient(135deg, #455a64 0%, #607d8b 100%)';
}

export default function ActiveShopPaymentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ shopId: string; paymentId: string }>();
  const shopId = params.shopId ? decodeURIComponent(params.shopId) : '';
  const paymentId = params.paymentId ? decodeURIComponent(params.paymentId) : '';

  const [payment, setPayment] = useState<ActiveShopPaymentItem | null>(null);
  const [shopName, setShopName] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const paymentsListPath = `/shops/active/${encodeURIComponent(shopId)}/payments`;

  const loadDetails = useCallback(async () => {
    if (!shopId || !paymentId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveShopPaymentDetails(shopId, paymentId);
      setPayment(data.payment);
      setShopName(data.shop?.shopName ?? '');
      setCanEdit(Boolean(data.canEdit));
      setAmountInput(
        data.payment.paymentAmount == null ? '' : String(data.payment.paymentAmount),
      );
      setDescriptionInput(data.payment.description ?? '');
    } catch (err) {
      setPayment(null);
      setError(getApiErrorMessage(err, 'Failed to load payment details'));
    } finally {
      setLoading(false);
    }
  }, [shopId, paymentId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const amountChanged = useMemo(() => {
    if (!payment) return false;
    const current =
      amountInput.trim() === '' ? null : Number(amountInput);
    const original = payment.paymentAmount;
    if (current == null && original == null) return false;
    if (current == null || !Number.isFinite(current)) return true;
    return Number(current) !== Number(original);
  }, [amountInput, payment]);

  const descriptionChanged = useMemo(() => {
    if (!payment) return false;
    const current = descriptionInput.trim();
    const original = (payment.description ?? '').trim();
    return current !== original;
  }, [descriptionInput, payment]);

  const canSave =
    canEdit &&
    !saving &&
    !deleting &&
    (amountChanged || descriptionChanged) &&
    amountInput.trim() !== '' &&
    Number.isFinite(Number(amountInput)) &&
    Number(amountInput) >= 0;

  const handleUpdate = async () => {
    if (!shopId || !paymentId || !canSave) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateActiveShopPayment(shopId, paymentId, {
        paymentAmount: Number(amountInput),
        description: descriptionInput.trim() === '' ? null : descriptionInput.trim(),
      });
      setPayment(result.payment);
      setCanEdit(Boolean(result.canEdit));
      setAmountInput(
        result.payment.paymentAmount == null ? '' : String(result.payment.paymentAmount),
      );
      setDescriptionInput(result.payment.description ?? '');
      setSuccess(result.message || 'Payment updated successfully');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update payment'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!shopId || !paymentId || !canEdit) return;

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteActiveShopPayment(shopId, paymentId);
      setConfirmDeleteOpen(false);
      router.push(paymentsListPath);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete payment'));
      setDeleting(false);
    }
  };

  return (
    <DashboardShell
      title="Payment details"
      subtitle={shopName ? `${shopName} · ${shopId}` : shopId || '—'}
    >
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
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(paymentsListPath)}>
          Back to payments
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      ) : null}

      {!loading && payment ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  p: 3,
                  background: statusGradient(payment.status),
                  color: '#fff',
                }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <PaymentsOutlinedIcon sx={{ fontSize: 34 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {formatPaymentTypeLabel(payment.paymentType)} payment
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Receipt {payment.receiptNumber || '—'}
                    </Typography>
                  </Box>
                  <Chip
                    label={formatPaymentStatusLabel(payment.status)}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.18)',
                      color: '#fff',
                      fontWeight: 700,
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                  />
                </Stack>
              </Box>

              <CardContent sx={{ p: 3 }}>
                {!canEdit ? (
                  <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
                    This payment cannot be edited or deleted because its status is{' '}
                    <strong>{formatPaymentStatusLabel(payment.status)}</strong>. Only{' '}
                    <strong>Not paid</strong> and <strong>Rejected</strong> payments can be
                    updated.
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
                    You can update the amount or delete this payment while status is{' '}
                    <strong>Not paid</strong> or <strong>Rejected</strong>.
                  </Alert>
                )}

                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Payment amount (Rs.)"
                      type="number"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      disabled={!canEdit || saving || deleting}
                      slotProps={{
                        htmlInput: { min: 0, step: '0.01' },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          fontWeight: 700,
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Status"
                      value={formatPaymentStatusLabel(payment.status)}
                      disabled
                      slotProps={{
                        input: {
                          endAdornment: (
                            <Chip
                              size="small"
                              label={formatPaymentStatusLabel(payment.status)}
                              color={getPaymentStatusColor(payment.status)}
                              sx={{ fontWeight: 700 }}
                            />
                          ),
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Payment type"
                      value={formatPaymentTypeLabel(payment.paymentType)}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Receipt number"
                      value={payment.receiptNumber || ''}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Subscription plan"
                      value={formatSubscriptionTypeLabel(payment.subscriptionType)}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Billing month"
                      value={formatMonth(payment.paymentMonth)}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Submitted date"
                      value={formatDate(payment.submittedDate) || '—'}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Exact payment day"
                      value={formatDate(payment.exactPaymentDay) || '—'}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Expiry date"
                      value={formatDate(payment.expiryDate) || '—'}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Onboarding payment"
                      value={payment.IsOnboaringPayment ? 'Yes' : 'No'}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={descriptionInput}
                      onChange={(e) => setDescriptionInput(e.target.value)}
                      disabled={!canEdit || saving || deleting}
                      multiline
                      minRows={2}
                    />
                  </Grid>
                  {payment.reason ? (
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Rejection reason"
                        value={payment.reason}
                        disabled
                        multiline
                        minRows={2}
                      />
                    </Grid>
                  ) : null}
                </Grid>

                {canEdit ? (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      sx={{ justifyContent: 'flex-end' }}
                    >
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteForeverOutlinedIcon />}
                        onClick={() => setConfirmDeleteOpen(true)}
                        disabled={saving || deleting}
                        sx={{ fontWeight: 700, borderRadius: 2.5 }}
                      >
                        Delete payment
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={
                          saving ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <SaveOutlinedIcon />
                          )
                        }
                        onClick={() => void handleUpdate()}
                        disabled={!canSave}
                        sx={{
                          fontWeight: 800,
                          borderRadius: 2.5,
                          px: 3,
                          background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
                          boxShadow: '0 10px 24px rgba(21, 101, 192, 0.25)',
                        }}
                      >
                        {saving ? 'Updating…' : 'Update payment'}
                      </Button>
                    </Stack>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Record info
                </Typography>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Payment ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                    {payment._id}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Shop ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {payment.shopId}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatDate(payment.createdAt) || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Updated
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatDate(payment.updatedAt) || '—'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {payment.additionalPayments && payment.additionalPayments.length > 0 ? (
              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Additional payments
                  </Typography>
                  <Stack spacing={1.25}>
                    {payment.additionalPayments.map((item, index) => (
                      <Box
                        key={`${item.name}-${index}`}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 2,
                          p: 1.25,
                          borderRadius: 2,
                          bgcolor: 'grey.50',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Rs. {item.amount.toLocaleString('en-LK')}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ) : null}
          </Grid>
        </Grid>
      ) : null}

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => !deleting && setConfirmDeleteOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Delete this payment?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently delete receipt{' '}
            <strong>{payment?.receiptNumber || paymentId}</strong> for shop{' '}
            <strong>{shopId}</strong>.
          </DialogContentText>
          <Alert severity="error" variant="outlined">
            This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleDelete()}
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DeleteForeverOutlinedIcon />
              )
            }
            sx={{ fontWeight: 800 }}
          >
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardShell>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
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
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import {
  approveFirstMultiMonthSubscriptionPayment,
  approveUpfrontPayment,
  fetchPaymentDetails,
  getPaymentActionErrorMessage,
  rejectFirstMultiMonthSubscriptionPayment,
  rejectUpfrontPayment,
} from '@/lib/api/payments';
import type { PaymentRecord, ShopDetails } from '@/lib/api/payments.types';
import { formatDate, formatDateTime } from '@/lib/utils/formatDate';
import {
  formatPaymentAmount,
  formatPaymentStatusLabel,
  formatPaymentTypeLabel,
  getPaymentStatusColor,
  isSubscriptionPayment,
  isUpFrontPayment,
} from './paymentUi';

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value != null && value !== '' ? String(value) : '—'}
      </Typography>
    </Box>
  );
}

interface PaymentDetailsViewProps {
  paymentId: string;
  showOnboardingActions?: boolean;
}

export default function PaymentDetailsView({
  paymentId,
  showOnboardingActions = false,
}: PaymentDetailsViewProps) {
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!paymentId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPaymentDetails(paymentId);
      setPayment(data.payment);
      setShop(data.shop);
    } catch (err) {
      setPayment(null);
      setShop(null);
      setError(err instanceof Error ? err.message : 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const ownerName =
    shop?.ownerFirstName || shop?.ownerLastName
      ? `${shop?.ownerFirstName ?? ''} ${shop?.ownerLastName ?? ''}`.trim()
      : '—';

  const hasReceiptImage =
    payment?.receiptImageUrl &&
    payment.receiptImageUrl !== 'pending-upload' &&
    !payment.receiptImageUrl.includes('pending-upload');

  const canShowReceiptImage = Boolean(hasReceiptImage && payment?.receiptImageAvailable !== false);

  const isUpfrontPending =
    showOnboardingActions && isUpFrontPayment(payment?.paymentType) && payment?.status === 'pending';

  const isSubscriptionPending =
    showOnboardingActions &&
    isSubscriptionPayment(payment?.paymentType) &&
    payment?.status === 'pending';

  const canShowActions = isUpfrontPending || isSubscriptionPending;

  const rejectDialogTitle = isSubscriptionPending
    ? 'Reject subscription payment'
    : 'Reject upfront payment';

  const rejectDialogDescription = isSubscriptionPending
    ? 'Provide a reason for rejecting this subscription payment. The shop owner will be notified.'
    : 'Provide a reason for rejecting this upfront payment. The shop owner will be notified.';

  const handleApprove = async () => {
    if (!paymentId || !payment) return;

    setActionLoading('approve');
    setError(null);
    setSuccessMessage(null);

    try {
      const data = isSubscriptionPending
        ? await approveFirstMultiMonthSubscriptionPayment(paymentId)
        : await approveUpfrontPayment(paymentId);
      setPayment(data.payment);
      setShop(data.shop);
      setSuccessMessage(data.message || 'Payment approved.');
    } catch (err) {
      setError(getPaymentActionErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRejectDialog = () => {
    setRejectReason('');
    setRejectError(null);
    setRejectDialogOpen(true);
  };

  const handleCloseRejectDialog = () => {
    if (actionLoading === 'reject') return;
    setRejectDialogOpen(false);
    setRejectReason('');
    setRejectError(null);
  };

  const handleReject = async () => {
    if (!paymentId || !payment) return;

    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError('Reason is required when rejecting a payment');
      return;
    }

    setActionLoading('reject');
    setRejectError(null);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = isSubscriptionPending
        ? await rejectFirstMultiMonthSubscriptionPayment(paymentId, reason)
        : await rejectUpfrontPayment(paymentId, reason);
      setPayment(data.payment);
      setShop(data.shop);
      setSuccessMessage(data.message || 'Payment rejected.');
      setRejectDialogOpen(false);
      setRejectReason('');
    } catch (err) {
      setRejectError(getPaymentActionErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!payment) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error ?? 'Payment not found'}
      </Alert>
    );
  }

  return (
    <>
      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {successMessage}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Payment information
                </Typography>
                <Chip
                  label={formatPaymentStatusLabel(payment.status)}
                  color={getPaymentStatusColor(payment.status)}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Receipt number" value={payment.receiptNumber} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Shop ID" value={payment.shopId} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Payment type" value={formatPaymentTypeLabel(payment.paymentType)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Amount" value={formatPaymentAmount(payment.paymentAmount)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Subscription plan" value={payment.subscriptionType} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField
                    label="Onboarding payment"
                    value={payment.IsOnboaringPayment ? 'Yes' : 'No'}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Submitted date" value={formatDateTime(payment.submittedDate)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Exact payment day" value={formatDate(payment.exactPaymentDay)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Expiry date" value={formatDate(payment.expiryDate)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Created" value={formatDateTime(payment.createdAt)} />
                </Grid>
                {payment.description ? (
                  <Grid size={{ xs: 12 }}>
                    <DetailField label="Description" value={payment.description} />
                  </Grid>
                ) : null}
                {payment.reason ? (
                  <Grid size={{ xs: 12 }}>
                    <DetailField label="Reason" value={payment.reason} />
                  </Grid>
                ) : null}
              </Grid>

              {payment.additionalPayments && payment.additionalPayments.length > 0 ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Additional payments
                  </Typography>
                  {payment.additionalPayments.map((item) => (
                    <Box
                      key={`${item.name}-${item.amount}`}
                      sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                    >
                      <Typography variant="body2">{item.name}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatPaymentAmount(item.amount)}
                      </Typography>
                    </Box>
                  ))}
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Shop information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Shop name" value={shop?.shopName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Owner" value={ownerName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Mobile" value={shop?.shopMobileNumber} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Email" value={shop?.email} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Shop status" value={shop?.status} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField
                    label="Next payment date"
                    value={formatDate(shop?.nextPaymentDate as string | undefined)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Subscription type" value={shop?.subscriptionType as string} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ position: { lg: 'sticky' }, top: { lg: 88 }, borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Receipt image
              </Typography>

              {canShowReceiptImage ? (
                <Box
                  component="a"
                  href={payment.receiptImageUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'block',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                  }}
                >
                  <Box
                    component="img"
                    src={payment.receiptImageUrl ?? ''}
                    alt={`Receipt ${payment.receiptNumber}`}
                    sx={{
                      width: '100%',
                      maxHeight: 520,
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </Box>
              ) : hasReceiptImage ? (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Receipt was uploaded, but the image file is not on this server.
                </Alert>
              ) : (
                <Box
                  sx={{
                    py: 8,
                    px: 2,
                    textAlign: 'center',
                    borderRadius: 2,
                    bgcolor: 'grey.50',
                    border: '1px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <Typography color="text.secondary">No receipt image uploaded</Typography>
                </Box>
              )}

              {canShowReceiptImage && payment.receiptImageUrl ? (
                <Button
                  fullWidth
                  variant="outlined"
                  component="a"
                  href={payment.receiptImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  Open full image
                </Button>
              ) : null}

              {canShowActions ? (
                <Box sx={{ mt: 2, display: 'flex', gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    disabled={actionLoading !== null}
                    onClick={() => void handleApprove()}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    {actionLoading === 'approve' ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : (
                      'Approve'
                    )}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    disabled={actionLoading !== null}
                    onClick={handleOpenRejectDialog}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    Reject
                  </Button>
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={rejectDialogOpen} onClose={handleCloseRejectDialog} fullWidth maxWidth="sm">
        <DialogTitle>{rejectDialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {rejectDialogDescription}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Rejection reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            disabled={actionLoading === 'reject'}
            error={Boolean(rejectError)}
            helperText={rejectError ?? ' '}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseRejectDialog} disabled={actionLoading === 'reject'}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={actionLoading === 'reject'}
            onClick={() => void handleReject()}
          >
            {actionLoading === 'reject' ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              'Reject payment'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

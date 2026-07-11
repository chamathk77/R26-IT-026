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
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import {
  approveSmsBill,
  fetchSmsPaymentDetails,
  getPaymentActionErrorMessage,
  rejectSmsBill,
  resetAndApproveSmsBill,
} from '@/lib/api/payments';
import type { PaymentRecord, SmsShopDetails } from '@/lib/api/payments.types';
import { formatDate, formatDateTime } from '@/lib/utils/formatDate';
import {
  formatPaymentAmount,
  formatPaymentStatusLabel,
  formatPaymentTypeLabel,
  getPaymentStatusColor,
} from './paymentUi';

function DetailField({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: string | number | null;
  highlight?: boolean;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          fontWeight: 600,
          color: highlight ? '#dc2626' : 'text.primary',
        }}
      >
        {value != null && value !== '' ? String(value) : '—'}
      </Typography>
    </Box>
  );
}

const SMS_OVERDUE_THRESHOLD = 14;
const HIGHLIGHTABLE_PAYMENT_STATUSES = new Set(['pending', 'rejected', 'notPaid']);

interface SmsPaymentDetailsViewProps {
  paymentId: string;
}

export default function SmsPaymentDetailsView({ paymentId }: SmsPaymentDetailsViewProps) {
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [shop, setShop] = useState<SmsShopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<
    'approve' | 'reject' | 'resetApprove' | null
  >(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!paymentId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchSmsPaymentDetails(paymentId);
      setPayment(data.payment);
      setShop(data.shop);
    } catch (err) {
      setPayment(null);
      setShop(null);
      setError(err instanceof Error ? err.message : 'Failed to load SMS payment details');
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
  const canShowActions = payment?.status === 'pending';
  const smsDueDays = Number(shop?.smsDueDays ?? 0);
  const isOverduePending =
    Boolean(payment?.status && HIGHLIGHTABLE_PAYMENT_STATUSES.has(payment.status)) &&
    shop?.smsFeatureStatus === 'pending' &&
    smsDueDays > SMS_OVERDUE_THRESHOLD;

  const handleApprove = async () => {
    if (!paymentId || !payment) return;

    setActionLoading('approve');
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await approveSmsBill(paymentId);
      setPayment(data.payment);
      setShop(data.shop);
      setSuccessMessage(data.message || 'SMS payment approved.');
    } catch (err) {
      setError(getPaymentActionErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetAndApprove = async () => {
    if (!paymentId || !payment) return;

    setActionLoading('resetApprove');
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await resetAndApproveSmsBill(paymentId);
      setPayment(data.payment);
      setShop(data.shop);
      setSuccessMessage(data.message || 'SMS payment reset and approved.');
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
      const data = await rejectSmsBill(paymentId, reason);
      setPayment(data.payment);
      setShop(data.shop);
      setSuccessMessage(data.message || 'SMS payment rejected.');
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
        {error ?? 'SMS payment not found'}
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

      {isOverduePending ? (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: '#fca5a5',
            bgcolor: '#fef2f2',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
            Overdue SMS payment — settle required
          </Typography>
          <Typography variant="body2">
            SMS feature status is <strong>pending</strong> with{' '}
            <strong>{smsDueDays}</strong> due days (over {SMS_OVERDUE_THRESHOLD}). Approve or reset
            and approve after reviewing the receipt, or reject if invalid.
          </Typography>
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  SMS payment information
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
                  <DetailField
                    label="Payment type"
                    value={formatPaymentTypeLabel(payment.paymentType)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Amount" value={formatPaymentAmount(payment.paymentAmount)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField
                    label="Billing month"
                    value={
                      payment.paymentMonth
                        ? payment.paymentMonth.charAt(0).toUpperCase() +
                          payment.paymentMonth.slice(1)
                        : null
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField
                    label="SMS renewal date"
                    value={formatDate(payment.exactPaymentDay)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField
                    label="Submitted date"
                    value={formatDateTime(payment.submittedDate)}
                  />
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
            </CardContent>
          </Card>

          <Card
            sx={{
              borderRadius: 3,
              ...(isOverduePending
                ? {
                    bgcolor: '#fef2f2',
                    border: '1px solid',
                    borderColor: '#fca5a5',
                    borderLeft: '4px solid',
                    borderLeftColor: '#dc2626',
                  }
                : {}),
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Shop & SMS feature
                </Typography>
                {isOverduePending ? (
                  <Chip
                    label="Overdue pending"
                    color="error"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                ) : null}
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Shop name" value={shop?.shopName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Owner" value={ownerName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField
                    label="Owner mobile"
                    value={shop?.ownerMobileNumber ?? shop?.shopMobileNumber}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Email" value={shop?.email} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="Shop status" value={shop?.status} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField
                    label="SMS feature status"
                    value={shop?.smsFeatureStatus}
                    highlight={isOverduePending}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField
                    label="SMS due days"
                    value={smsDueDays}
                    highlight={isOverduePending}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="SMS package" value={shop?.smsPackageType} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField
                    label="SMS feature active"
                    value={shop?.isSmsFeatureActive ? 'Yes' : 'No'}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField
                    label="Next SMS renewal"
                    value={formatDate(shop?.smsNextRenewalDate)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailField label="SMS receipt ref" value={shop?.smsReceiptNo} />
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
                    src={payment.receiptImageUrl ?? undefined}
                    alt={`Receipt ${payment.receiptNumber}`}
                    sx={{
                      width: '100%',
                      maxHeight: 480,
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </Box>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No receipt image uploaded yet.
                </Alert>
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
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
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
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    disabled={actionLoading !== null}
                    onClick={() => void handleResetAndApprove()}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    {actionLoading === 'resetApprove' ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : (
                      'Reset and approve'
                    )}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Approve keeps the current renewal cycle (+30 days). Reset and approve starts a
                    new cycle from today (+30 days).
                  </Typography>
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={rejectDialogOpen} onClose={handleCloseRejectDialog} fullWidth maxWidth="sm">
        <DialogTitle>Reject SMS payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide a reason for rejecting this SMS payment. The shop owner may need this context.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Rejection reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            error={Boolean(rejectError)}
            helperText={rejectError}
            disabled={actionLoading === 'reject'}
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
            sx={{ fontWeight: 700 }}
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

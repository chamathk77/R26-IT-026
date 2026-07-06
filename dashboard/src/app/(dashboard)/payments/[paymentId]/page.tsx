'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardShell from '@/components/layout/DashboardShell';
import { fetchPaymentDetails } from '@/lib/api/payments';
import type { PaymentRecord, ShopDetails } from '@/lib/api/payments.types';
import { formatDate, formatDateTime } from '@/lib/utils/formatDate';

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value != null && value !== '' ? String(value) : '—'}
      </Typography>
    </Box>
  );
}

function formatAmount(amount?: number | null): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function getStatusColor(status: string): 'warning' | 'success' | 'error' | 'default' {
  if (status === 'pending') return 'warning';
  if (status === 'approve') return 'success';
  if (status === 'rejected') return 'error';
  return 'default';
}

export default function PaymentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ paymentId: string }>();
  const paymentId = params.paymentId;

  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <DashboardShell title="Payment details" subtitle="Review receipt and shop information">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/payments')}
        sx={{ mb: 3 }}
      >
        Back to payments
      </Button>

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

      {!loading && payment ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Payment information
                  </Typography>
                  <Chip label={payment.status} color={getStatusColor(payment.status)} size="small" />
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailField label="Receipt number" value={payment.receiptNumber} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailField label="Shop ID" value={payment.shopId} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailField label="Payment type" value={payment.paymentType} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailField label="Amount" value={formatAmount(payment.paymentAmount)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailField label="Payment month" value={payment.paymentMonth} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailField label="Subscription plan" value={payment.subscriptionType} />
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
                          {formatAmount(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
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
            <Card sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Receipt image
                </Typography>

                {hasReceiptImage ? (
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

                {hasReceiptImage && payment.receiptImageUrl ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    component="a"
                    href={payment.receiptImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ mt: 2 }}
                  >
                    Open full image
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}
    </DashboardShell>
  );
}

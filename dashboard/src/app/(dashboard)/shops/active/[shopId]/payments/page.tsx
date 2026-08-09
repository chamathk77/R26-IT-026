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
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import DashboardShell from '@/components/layout/DashboardShell';
import {
  formatPaymentAmount,
  formatPaymentStatusLabel,
  formatPaymentTypeLabel,
  formatSubscriptionTypeLabel,
  getPaymentStatusColor,
} from '@/components/payments/paymentUi';
import { fetchActiveShopPayments } from '@/lib/api/shops';
import type {
  ActiveShopPaymentItem,
  ActiveShopPaymentStatus,
  ActiveShopPaymentType,
} from '@/lib/api/shops.types';

type TypeFilter = 'all' | ActiveShopPaymentType;
type StatusFilter = 'all' | ActiveShopPaymentStatus;

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'upFront', label: 'Upfront' },
  { value: 'sms', label: 'SMS' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approve', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'notPaid', label: 'Not paid' },
];

function formatDate(value?: string | null): string {
  if (!value) return '—';
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
  if (!value) return '—';
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

function paymentDetailPath(shopId: string, payment: ActiveShopPaymentItem): string {
  return `/shops/active/${encodeURIComponent(shopId)}/payments/${encodeURIComponent(payment._id)}`;
}

function StatCard({
  title,
  value,
  gradient,
}: {
  title: string;
  value: number;
  gradient: string;
}) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        color: '#fff',
        background: gradient,
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
      }}
    >
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1.1 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ActiveShopPaymentsPage() {
  const router = useRouter();
  const params = useParams<{ shopId: string }>();
  const shopId = params.shopId ? decodeURIComponent(params.shopId) : '';

  const [payments, setPayments] = useState<ActiveShopPaymentItem[]>([]);
  const [shopName, setShopName] = useState('');
  const [totalForShop, setTotalForShop] = useState(0);
  const [countsByStatus, setCountsByStatus] = useState<Record<string, number>>({});
  const [countsByType, setCountsByType] = useState<Record<string, number>>({});
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    if (!shopId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveShopPayments(shopId, {
        ...(typeFilter !== 'all' ? { paymentType: typeFilter } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      setPayments(data.payments ?? []);
      setShopName(data.shop?.shopName ?? '');
      setTotalForShop(data.totalForShop ?? data.count ?? 0);
      setCountsByStatus(data.countsByStatus ?? {});
      setCountsByType(data.countsByType ?? {});
    } catch (err) {
      setPayments([]);
      setError(getApiErrorMessage(err, 'Failed to load shop payments'));
    } finally {
      setLoading(false);
    }
  }, [shopId, typeFilter, statusFilter]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const subtitle = useMemo(() => {
    const name = shopName || shopId;
    return `${name} · ${payments.length} shown`;
  }, [shopName, shopId, payments.length]);

  return (
    <DashboardShell title="Shop payments" subtitle={subtitle}>
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
          onClick={() => router.push(`/shops/active/${encodeURIComponent(shopId)}`)}
        >
          Back to shop details
        </Button>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={() => void loadPayments()}
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Box>

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
            background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
            color: '#fff',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <PaymentsOutlinedIcon sx={{ fontSize: 34 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {shopName || shopId}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {shopId} · {totalForShop} payment record{totalForShop === 1 ? '' : 's'} total
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Pending"
            value={countsByStatus.pending ?? 0}
            gradient="linear-gradient(135deg, #ef6c00 0%, #f9a825 100%)"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Approved"
            value={countsByStatus.approve ?? 0}
            gradient="linear-gradient(135deg, #2e7d32 0%, #00897b 100%)"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Rejected"
            value={countsByStatus.rejected ?? 0}
            gradient="linear-gradient(135deg, #c62828 0%, #ad1457 100%)"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Not paid"
            value={countsByStatus.notPaid ?? 0}
            gradient="linear-gradient(135deg, #455a64 0%, #607d8b 100%)"
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 2, borderRadius: 3, p: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="shop-payment-type-label">Payment type</InputLabel>
              <Select
                labelId="shop-payment-type-label"
                label="Payment type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.value !== 'all' ? ` (${countsByType[opt.value] ?? 0})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="shop-payment-status-label">Status</InputLabel>
              <Select
                labelId="shop-payment-status-label"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.value !== 'all' ? ` (${countsByStatus[opt.value] ?? 0})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Chip
              label={`${payments.length} matching`}
              color={payments.length > 0 ? 'primary' : 'default'}
              sx={{ fontWeight: 700 }}
            />
          </Grid>
        </Grid>
      </Card>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Card
        sx={{
          overflow: 'hidden',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Receipt #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Plan / month</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={36} />
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">
                      No payments match these filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow
                    key={payment._id}
                    hover
                    onClick={() => router.push(paymentDetailPath(shopId, payment))}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Chip
                          label={formatPaymentTypeLabel(payment.paymentType)}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700, width: 'fit-content' }}
                        />
                        {payment.IsOnboaringPayment ? (
                          <Typography variant="caption" color="text.secondary">
                            Onboarding
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {payment.receiptNumber || '—'}
                    </TableCell>
                    <TableCell>{formatPaymentAmount(payment.paymentAmount)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {payment.paymentType === 'subscription'
                          ? formatSubscriptionTypeLabel(payment.subscriptionType)
                          : formatMonth(payment.paymentMonth)}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(payment.submittedDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={formatPaymentStatusLabel(payment.status)}
                        size="small"
                        color={getPaymentStatusColor(payment.status)}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <ChevronRightIcon color="action" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </DashboardShell>
  );
}

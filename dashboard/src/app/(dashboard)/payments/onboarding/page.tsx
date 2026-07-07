'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Chip, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardShell from '@/components/layout/DashboardShell';
import PaymentFiltersBar from '@/components/payments/PaymentFiltersBar';
import PaymentsDataTable from '@/components/payments/PaymentsDataTable';
import { fetchOnboardingPayments } from '@/lib/api/payments';
import type {
  OnboardingPaymentTypeFilter,
  PaymentStatusFilter,
  PendingPayment,
} from '@/lib/api/payments.types';

const ROWS_PER_PAGE = 20;

const PAYMENT_TYPE_FILTERS: Array<{
  value: OnboardingPaymentTypeFilter | 'all';
  label: string;
}> = [
  { value: 'all', label: 'All types' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'upFront', label: 'Upfront' },
];

const STATUS_FILTERS: Array<{ value: PaymentStatusFilter | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approve', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'notPaid', label: 'Not paid' },
];

export default function OnboardingPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<OnboardingPaymentTypeFilter | 'all'>(
    'all',
  );
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(
    async (
      pageIndex: number,
      typeFilter: OnboardingPaymentTypeFilter | 'all',
      nextStatusFilter: PaymentStatusFilter | 'all',
    ) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOnboardingPayments({
          page: pageIndex + 1,
          limit: ROWS_PER_PAGE,
          ...(typeFilter !== 'all' ? { paymentType: typeFilter } : {}),
          ...(nextStatusFilter !== 'all' ? { status: nextStatusFilter } : {}),
        });
        setPayments(data.payments ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        setPayments([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : 'Failed to load onboarding payments');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadPayments(page, paymentTypeFilter, statusFilter);
  }, [loadPayments, page, paymentTypeFilter, statusFilter]);

  const handlePaymentTypeChange = (nextFilter: OnboardingPaymentTypeFilter | 'all') => {
    setPaymentTypeFilter(nextFilter);
    setPage(0);
  };

  const handleStatusChange = (nextFilter: PaymentStatusFilter | 'all') => {
    setStatusFilter(nextFilter);
    setPage(0);
  };

  return (
    <DashboardShell
      title="Onboarding payments"
      subtitle="Review onboarding upfront and subscription payments"
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/payments')}
        sx={{ mb: 3 }}
      >
        Back to payments
      </Button>

      <PaymentFiltersBar
        typeOptions={PAYMENT_TYPE_FILTERS}
        typeValue={paymentTypeFilter}
        onTypeChange={handlePaymentTypeChange}
        statusOptions={STATUS_FILTERS}
        statusValue={statusFilter}
        onStatusChange={handleStatusChange}
      />

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
        <Chip
          label={`${total} record${total === 1 ? '' : 's'}`}
          color={total > 0 ? 'primary' : 'default'}
          sx={{ fontWeight: 700, px: 0.5 }}
        />
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={() => void loadPayments(page, paymentTypeFilter, statusFilter)}
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <PaymentsDataTable
        payments={payments}
        loading={loading}
        total={total}
        page={page}
        rowsPerPage={ROWS_PER_PAGE}
        onPageChange={setPage}
        onRowClick={(paymentId) => router.push(`/payments/onboarding/${paymentId}`)}
        emptyMessage="No onboarding payments match your filters."
      />
    </DashboardShell>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Chip, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardShell from '@/components/layout/DashboardShell';
import PaymentFiltersBar from '@/components/payments/PaymentFiltersBar';
import SubscriptionPaymentsDataTable from '@/components/payments/SubscriptionPaymentsDataTable';
import { fetchSubscriptionPayments } from '@/lib/api/payments';
import type { PaymentStatusFilter, PendingPayment } from '@/lib/api/payments.types';

const ROWS_PER_PAGE = 20;

const STATUS_FILTERS: Array<{ value: PaymentStatusFilter | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approve', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'notPaid', label: 'Not paid' },
];

export default function SubscriptionPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async (pageIndex: number, nextStatusFilter: PaymentStatusFilter | 'all') => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSubscriptionPayments({
        page: pageIndex + 1,
        limit: ROWS_PER_PAGE,
        ...(nextStatusFilter !== 'all' ? { status: nextStatusFilter } : {}),
      });
      setPayments(data.payments ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setPayments([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : 'Failed to load subscription payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments(page, statusFilter);
  }, [loadPayments, page, statusFilter]);

  const handleStatusChange = (nextFilter: PaymentStatusFilter | 'all') => {
    setStatusFilter(nextFilter);
    setPage(0);
  };

  return (
    <DashboardShell
      title="Subscription payments"
      subtitle="Review non-onboarding subscription payment receipts"
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/payments')}
        sx={{ mb: 3 }}
      >
        Back to payments
      </Button>

      <PaymentFiltersBar
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
          onClick={() => void loadPayments(page, statusFilter)}
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

      <SubscriptionPaymentsDataTable
        payments={payments}
        loading={loading}
        total={total}
        page={page}
        rowsPerPage={ROWS_PER_PAGE}
        onPageChange={setPage}
        onRowClick={(paymentId) => router.push(`/payments/subscription/${paymentId}`)}
        emptyMessage="No subscription payments match your filters."
      />
    </DashboardShell>
  );
}

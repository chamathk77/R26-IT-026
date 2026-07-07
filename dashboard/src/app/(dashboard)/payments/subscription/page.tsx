'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Chip, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardShell from '@/components/layout/DashboardShell';
import PaymentsDataTable from '@/components/payments/PaymentsDataTable';
import { fetchPendingPayments } from '@/lib/api/payments';
import type { PendingPayment } from '@/lib/api/payments.types';

const ROWS_PER_PAGE = 20;

export default function SubscriptionPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async (pageIndex: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingPayments({
        page: pageIndex + 1,
        limit: ROWS_PER_PAGE,
        paymentType: 'subscription',
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
    void loadPayments(page);
  }, [loadPayments, page]);

  return (
    <DashboardShell
      title="Subscription payments"
      subtitle="Review pending subscription payment receipts"
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/payments')}
        sx={{ mb: 3 }}
      >
        Back to payments
      </Button>

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
          label={`${total} pending`}
          color={total > 0 ? 'warning' : 'default'}
          sx={{ fontWeight: 700, px: 0.5 }}
        />
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={() => void loadPayments(page)}
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
        onRowClick={(paymentId) => router.push(`/payments/subscription/${paymentId}`)}
        emptyMessage="No pending subscription payments right now."
      />
    </DashboardShell>
  );
}

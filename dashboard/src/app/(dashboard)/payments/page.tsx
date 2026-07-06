'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardShell from '@/components/layout/DashboardShell';
import { fetchPendingPayments } from '@/lib/api/payments';
import type { PendingPayment } from '@/lib/api/payments.types';
import { formatDate } from '@/lib/utils/formatDate';

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingPayments();
      setPayments(data.payments ?? []);
    } catch (err) {
      setPayments([]);
      setError(err instanceof Error ? err.message : 'Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const handleRowClick = (paymentId: string) => {
    router.push(`/payments/${paymentId}`);
  };

  return (
    <DashboardShell title="Payments" subtitle="Review pending shop payment receipts">
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Chip
          label={`${payments.length} pending`}
          color={payments.length > 0 ? 'warning' : 'default'}
          sx={{ fontWeight: 600 }}
        />
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={() => void loadPayments()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Shop</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Receipt #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No pending payments right now.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow
                    key={payment._id}
                    hover
                    onClick={() => handleRowClick(payment._id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {payment.shop?.shopName ?? payment.shopId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {payment.shop?.shopMobileNumber ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{payment.receiptNumber || '—'}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {payment.paymentType ?? '—'}
                    </TableCell>
                    <TableCell>{formatDate(payment.submittedDate)}</TableCell>
                    <TableCell>
                      <Chip label={payment.status} size="small" color="warning" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <ChevronRightIcon fontSize="small" color="action" />
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

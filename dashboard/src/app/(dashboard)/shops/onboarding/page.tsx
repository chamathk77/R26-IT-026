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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardShell from '@/components/layout/DashboardShell';
import { fetchOnboardUsers } from '@/lib/api/shops';
import type { OnboardUserSummary } from '@/lib/api/shops.types';

function formatAmount(amount?: number | null): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function BooleanChip({ value, trueLabel, falseLabel }: { value: boolean; trueLabel: string; falseLabel: string }) {
  return (
    <Chip
      label={value ? trueLabel : falseLabel}
      size="small"
      color={value ? 'success' : 'default'}
      variant={value ? 'filled' : 'outlined'}
    />
  );
}

export default function ShopOnboardingPage() {
  const router = useRouter();
  const [shops, setShops] = useState<OnboardUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOnboardUsers();
      setShops(data.shops ?? []);
    } catch (err) {
      setShops([]);
      setError(err instanceof Error ? err.message : 'Failed to load onboarding shops');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShops();
  }, [loadShops]);

  return (
    <DashboardShell
      title="Shop onboarding"
      subtitle="Shops with completed onboarding and disabled status"
    >
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/shops')}>
            Back
          </Button>
          <Chip
            label={`${shops.length} shops`}
            color={shops.length > 0 ? 'primary' : 'default'}
            sx={{ fontWeight: 600 }}
          />
        </Box>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={() => void loadShops()}
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
                <TableCell sx={{ fontWeight: 700 }}>Shop ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>One-time amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Payment generated</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Payment done</TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : shops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No onboarding shops found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                shops.map((shop) => (
                  <TableRow
                    key={shop.shopId}
                    hover
                    onClick={() => router.push(`/shops/onboarding/${encodeURIComponent(shop.shopId)}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {shop.shopId}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatAmount(shop.oneTimePaymentAmount)}</TableCell>
                    <TableCell>
                      <BooleanChip
                        value={shop.isOneTimePaymentGenerated}
                        trueLabel="Generated"
                        falseLabel="Not generated"
                      />
                    </TableCell>
                    <TableCell>
                      <BooleanChip
                        value={shop.isOneTimePaymentDone}
                        trueLabel="Done"
                        falseLabel="Pending"
                      />
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

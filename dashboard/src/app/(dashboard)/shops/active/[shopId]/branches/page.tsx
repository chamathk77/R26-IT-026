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
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import axios from 'axios';
import DashboardShell from '@/components/layout/DashboardShell';
import { fetchActiveShopBranches } from '@/lib/api/shops';
import type { ActiveShopBranchItem } from '@/lib/api/shops.types';

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

function customerOrderPath(shopId: string, branchId: string, suffix = ''): string {
  return `/order/${encodeURIComponent(shopId)}/${encodeURIComponent(branchId)}${suffix}`;
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

export default function ActiveShopBranchesPage() {
  const router = useRouter();
  const params = useParams<{ shopId: string }>();
  const shopId = params.shopId ? decodeURIComponent(params.shopId) : '';

  const [branches, setBranches] = useState<ActiveShopBranchItem[]>([]);
  const [shopName, setShopName] = useState('');
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    if (!shopId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveShopBranches(shopId);
      setBranches(data.branches ?? []);
      setShopName(data.shop?.shopName ?? '');
      setActiveCount(data.activeCount ?? 0);
      setInactiveCount(data.inactiveCount ?? 0);
    } catch (err) {
      setBranches([]);
      setError(getApiErrorMessage(err, 'Failed to load shop branches'));
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const subtitle = useMemo(() => {
    const name = shopName || shopId;
    return `${name} · ${branches.length} branch${branches.length === 1 ? '' : 'es'}`;
  }, [shopName, shopId, branches.length]);

  return (
    <DashboardShell title="Shop branches" subtitle={subtitle}>
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
          onClick={() => void loadBranches()}
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
            background: 'linear-gradient(135deg, #6a1b9a 0%, #1565c0 100%)',
            color: '#fff',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <AccountTreeOutlinedIcon sx={{ fontSize: 34 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {shopName || shopId}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {shopId} · {branches.length} branch{branches.length === 1 ? '' : 'es'} total
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            title="Total branches"
            value={branches.length}
            gradient="linear-gradient(135deg, #4527a0 0%, #7b1fa2 100%)"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4 }}>
          <StatCard
            title="Active"
            value={activeCount}
            gradient="linear-gradient(135deg, #2e7d32 0%, #43a047 100%)"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4 }}>
          <StatCard
            title="Inactive"
            value={inactiveCount}
            gradient="linear-gradient(135deg, #546e7a 0%, #78909c 100%)"
          />
        </Grid>
      </Grid>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Place order</strong> opens the same page a customer reaches by scanning the
        branch QR — use it to test orders without a phone. The shop needs the{' '}
        <strong>Manual order</strong> module enabled.
      </Alert>

      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : branches.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No branches found for this shop.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Branch ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer order</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch._id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{branch.branchId}</TableCell>
                    <TableCell>{branch.branchName}</TableCell>
                    <TableCell>{branch.address || '—'}</TableCell>
                    <TableCell>{branch.phone || '—'}</TableCell>
                    <TableCell>
                      {branch.isMainBranch ? (
                        <Chip label="Main" size="small" color="primary" sx={{ fontWeight: 700 }} />
                      ) : (
                        <Chip label="Branch" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={branch.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={branch.isActive ? 'success' : 'default'}
                        variant={branch.isActive ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>{formatDate(branch.createdAt)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<RestaurantMenuOutlinedIcon />}
                          onClick={() =>
                            window.open(customerOrderPath(shopId, branch.branchId), '_blank')
                          }
                          sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}
                        >
                          Place order
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<QrCode2OutlinedIcon />}
                          onClick={() =>
                            window.open(customerOrderPath(shopId, branch.branchId, '/qr'), '_blank')
                          }
                          sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}
                        >
                          QR
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </DashboardShell>
  );
}

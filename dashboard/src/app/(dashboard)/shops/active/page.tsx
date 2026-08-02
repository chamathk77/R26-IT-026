'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Avatar,
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
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import SearchIcon from '@mui/icons-material/Search';
import DashboardShell from '@/components/layout/DashboardShell';
import { fetchActiveShops } from '@/lib/api/shops';
import type { ActiveShopStatus, ActiveShopSummary } from '@/lib/api/shops.types';

type StatusFilter = 'all' | ActiveShopStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All active statuses' },
  { value: 'active', label: 'Active' },
  { value: 'due', label: 'Due' },
  { value: 'paymentPending', label: 'Payment pending' },
  { value: 'changeSubscription', label: 'Change subscription' },
  { value: 'initialPaymentApproved', label: 'Initial payment approved' },
  { value: 'subscriptionPaymentPending', label: 'Subscription payment pending' },
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

function ownerName(shop: ActiveShopSummary): string {
  return [shop.ownerFirstName, shop.ownerLastName].filter(Boolean).join(' ') || '—';
}

function shopInitials(shop: ActiveShopSummary): string {
  const name = shop.shopName?.trim() || shop.shopId;
  return name.slice(0, 2).toUpperCase();
}

function statusColor(
  status: ActiveShopStatus,
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'due':
      return 'warning';
    case 'paymentPending':
      return 'error';
    case 'changeSubscription':
      return 'info';
    case 'initialPaymentApproved':
      return 'info';
    case 'subscriptionPaymentPending':
      return 'warning';
    default:
      return 'default';
  }
}

function formatStatusLabel(status: string): string {
  return status.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function StatCard({
  title,
  value,
  subtitle,
  gradient,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  gradient: string;
  icon: ReactNode;
}) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ height: 4, background: gradient }} />
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'grey.100', color: 'text.primary', width: 44, height: 44 }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ActiveShopsPage() {
  const router = useRouter();
  const [shops, setShops] = useState<ActiveShopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [shopIdInput, setShopIdInput] = useState('');
  const [ownerMobileInput, setOwnerMobileInput] = useState('');
  const [appliedShopId, setAppliedShopId] = useState('');
  const [appliedOwnerMobile, setAppliedOwnerMobile] = useState('');

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveShops({
        status: statusFilter === 'all' ? undefined : statusFilter,
        shopId: appliedShopId || undefined,
        ownerMobileNumber: appliedOwnerMobile || undefined,
      });
      setShops(data.shops ?? []);
    } catch (err) {
      setShops([]);
      setError(err instanceof Error ? err.message : 'Failed to load active shops');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, appliedShopId, appliedOwnerMobile]);

  useEffect(() => {
    void loadShops();
  }, [loadShops]);

  const stats = useMemo(() => {
    const byStatus = (s: ActiveShopStatus) => shops.filter((shop) => shop.status === s).length;
    return {
      total: shops.length,
      active: byStatus('active'),
      due: byStatus('due'),
      paymentPending: byStatus('paymentPending'),
    };
  }, [shops]);

  const applySearchFilters = () => {
    setAppliedShopId(shopIdInput.trim().toUpperCase());
    setAppliedOwnerMobile(ownerMobileInput.trim());
  };

  const clearSearchFilters = () => {
    setShopIdInput('');
    setOwnerMobileInput('');
    setAppliedShopId('');
    setAppliedOwnerMobile('');
  };

  return (
    <DashboardShell
      title="Active shops"
      subtitle="Shops in active, due, payment pending, or subscription flow statuses"
    >
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/shops')}>
            Back
          </Button>
          <Chip
            icon={<StorefrontOutlinedIcon />}
            label={`${shops.length} shown`}
            color="primary"
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

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total"
            value={stats.total}
            subtitle="Matching filters"
            gradient="linear-gradient(135deg, #1565c0 0%, #00838f 100%)"
            icon={<StorefrontOutlinedIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active"
            value={stats.active}
            subtitle="Status: active"
            gradient="linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)"
            icon={<StorefrontOutlinedIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Due"
            value={stats.due}
            subtitle="Status: due"
            gradient="linear-gradient(135deg, #ef6c00 0%, #f9a825 100%)"
            icon={<StorefrontOutlinedIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Payment pending"
            value={stats.paymentPending}
            subtitle="Status: paymentPending"
            gradient="linear-gradient(135deg, #c62828 0%, #ad1457 100%)"
            icon={<StorefrontOutlinedIcon />}
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 2, borderRadius: 3, p: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="active-shop-status-label">Status</InputLabel>
              <Select
                labelId="active-shop-status-label"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Shop ID"
              placeholder="e.g. SHOP001"
              value={shopIdInput}
              onChange={(e) => setShopIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearchFilters();
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Owner mobile"
              placeholder="e.g. 07XXXXXXXX"
              value={ownerMobileInput}
              onChange={(e) => setOwnerMobileInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearchFilters();
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={applySearchFilters}
                disabled={loading}
              >
                Search
              </Button>
              <Button variant="text" onClick={clearSearchFilters} disabled={loading}>
                Clear
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Card sx={{ overflow: 'hidden', borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Shop</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Owner</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Owner mobile</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Plan</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Next payment</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : shops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No shops match these filters.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                shops.map((shop) => (
                  <TableRow
                    key={shop.shopId}
                    hover
                    onClick={() =>
                      router.push(`/shops/active/${encodeURIComponent(shop.shopId)}`)
                    }
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ width: 36, height: 36, fontSize: 13, bgcolor: 'primary.main' }}>
                          {shopInitials(shop)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{shop.shopName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {shop.shopId}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{ownerName(shop)}</TableCell>
                    <TableCell>{shop.ownerMobileNumber || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={formatStatusLabel(shop.status)}
                        size="small"
                        color={statusColor(shop.status)}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>{shop.subscriptionType || '—'}</TableCell>
                    <TableCell>{formatDate(shop.nextPaymentDate)}</TableCell>
                    <TableCell>{formatDate(shop.updatedAt)}</TableCell>
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

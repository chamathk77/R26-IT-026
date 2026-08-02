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
  Grid,
  Stack,
  Tab,
  Tabs,
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
import HourglassTopOutlinedIcon from '@mui/icons-material/HourglassTopOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DashboardShell from '@/components/layout/DashboardShell';
import { fetchTrialShops } from '@/lib/api/shops';
import type { TrialShopStatus, TrialShopSummary } from '@/lib/api/shops.types';

type StatusFilter = 'all' | TrialShopStatus;

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

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  const minutes = Math.max(1, Math.floor(seconds / 60));
  return `${minutes}m left`;
}

function ownerName(shop: TrialShopSummary): string {
  return [shop.ownerFirstName, shop.ownerLastName].filter(Boolean).join(' ') || '—';
}

function shopInitials(shop: TrialShopSummary): string {
  const name = shop.shopName?.trim() || shop.shopId;
  return name.slice(0, 2).toUpperCase();
}

function StatusChip({ status }: { status: TrialShopStatus }) {
  if (status === 'trial') {
    return <Chip label="Active trial" size="small" color="warning" sx={{ fontWeight: 700 }} />;
  }
  return <Chip label="Trial expired" size="small" color="error" variant="outlined" sx={{ fontWeight: 700 }} />;
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

export default function ShopTrialPage() {
  const router = useRouter();
  const [shops, setShops] = useState<TrialShopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrialShops(
        statusFilter === 'all' ? undefined : statusFilter,
      );
      setShops(data.shops ?? []);
    } catch (err) {
      setShops([]);
      setError(err instanceof Error ? err.message : 'Failed to load trial shops');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadShops();
  }, [loadShops]);

  const stats = useMemo(() => {
    const active = shops.filter((shop) => shop.status === 'trial').length;
    const expired = shops.filter((shop) => shop.status === 'trialExpired').length;
    return { total: shops.length, active, expired };
  }, [shops]);

  return (
    <DashboardShell
      title="Shop trials"
      subtitle="Shops currently on trial or with an expired trial period"
    >
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/shops')}>
            Back
          </Button>
          <Chip
            icon={<HourglassTopOutlinedIcon />}
            label={`${shops.length} shown`}
            color="secondary"
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
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            title="Total trials"
            value={stats.total}
            subtitle="Matching current filter"
            gradient="linear-gradient(135deg, #7b1fa2 0%, #512da8 100%)"
            icon={<HourglassTopOutlinedIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            title="Active"
            value={stats.active}
            subtitle="Status: trial"
            gradient="linear-gradient(135deg, #ef6c00 0%, #f9a825 100%)"
            icon={<TimerOutlinedIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            title="Expired"
            value={stats.expired}
            subtitle="Status: trialExpired"
            gradient="linear-gradient(135deg, #c62828 0%, #ad1457 100%)"
            icon={<CheckCircleOutlinedIcon />}
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <Tabs
          value={statusFilter}
          onChange={(_, value: StatusFilter) => setStatusFilter(value)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All" value="all" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab label="Active trial" value="trial" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab label="Expired" value="trialExpired" sx={{ fontWeight: 700, textTransform: 'none' }} />
        </Tabs>
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
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trial ends</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Remaining</TableCell>
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
              ) : shops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No trial shops found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                shops.map((shop) => (
                  <TableRow
                    key={shop.shopId}
                    hover
                    onClick={() => router.push(`/shops/trial/${encodeURIComponent(shop.shopId)}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            fontWeight: 800,
                            bgcolor:
                              shop.status === 'trial'
                                ? 'warning.light'
                                : 'error.light',
                            color: shop.status === 'trial' ? 'warning.dark' : 'error.dark',
                          }}
                        >
                          {shopInitials(shop)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {shop.shopName || shop.shopId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {shop.shopId}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {ownerName(shop)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {shop.ownerMobileNumber || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={shop.status} />
                    </TableCell>
                    <TableCell>{formatDate(shop.trailEndDate)}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: shop.trialSecondsRemaining > 0 ? 'warning.dark' : 'error.main',
                        }}
                      >
                        {formatRemaining(shop.trialSecondsRemaining)}
                      </Typography>
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

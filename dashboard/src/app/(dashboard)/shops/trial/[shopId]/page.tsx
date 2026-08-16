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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import HourglassTopOutlinedIcon from '@mui/icons-material/HourglassTopOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import axios from 'axios';
import DashboardShell from '@/components/layout/DashboardShell';
import { fetchTrialShopDetails, finishTrialShop } from '@/lib/api/shops';
import type { TrialShopDetails } from '@/lib/api/shops.types';

const TRIAL_DURATION_SECONDS = 14 * 24 * 60 * 60;

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAmount(amount?: number | null): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days} days ${hours} hours remaining`;
  if (hours > 0) return `${hours} hours remaining`;
  const minutes = Math.max(1, Math.floor(seconds / 60));
  return `${minutes} minutes remaining`;
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

function ModuleChip({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <Chip
      label={label}
      size="small"
      color={enabled ? 'success' : 'default'}
      variant={enabled ? 'filled' : 'outlined'}
      sx={{ fontWeight: 600 }}
    />
  );
}

export default function ShopTrialDetailsPage() {
  const router = useRouter();
  const params = useParams<{ shopId: string }>();
  const shopId = params.shopId ? decodeURIComponent(params.shopId) : '';

  const [shop, setShop] = useState<TrialShopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!shopId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrialShopDetails(shopId);
      setShop(data.shop);
    } catch (err) {
      setShop(null);
      setError(getApiErrorMessage(err, 'Failed to load trial shop details'));
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const trialProgress = useMemo(() => {
    if (!shop) return 0;
    if (shop.status === 'trialExpired' || shop.isTrailCompleted) return 100;
    const remaining = Math.max(0, shop.trialSecondsRemaining);
    const elapsed = Math.max(0, TRIAL_DURATION_SECONDS - remaining);
    return Math.min(100, Math.round((elapsed / TRIAL_DURATION_SECONDS) * 100));
  }, [shop]);

  const canFinishTrial = shop?.status === 'trial' && shop.isTrailStared && !shop.isTrailCompleted;

  const handleFinishTrial = async () => {
    if (!shopId) return;

    setFinishing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await finishTrialShop(shopId);
      setShop(result.shop);
      setSuccess(
        `${result.message}${result.clearedUserTokens > 0 ? ` (${result.clearedUserTokens} user session(s) cleared)` : ''}`,
      );
      setConfirmOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to finish trial'));
    } finally {
      setFinishing(false);
    }
  };

  return (
    <DashboardShell title="Trial shop details" subtitle={`Shop ${shopId || '—'}`}>
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
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/shops/trial')}>
          Back to trial list
        </Button>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() =>
              router.push(`/shops/trial/${encodeURIComponent(shopId)}/bulk-upload`)
            }
            sx={{
              fontWeight: 800,
              borderRadius: 2.5,
              px: 2.5,
              background: 'linear-gradient(135deg, #6a1b9a 0%, #1565c0 100%)',
              boxShadow: '0 10px 24px rgba(106, 27, 154, 0.28)',
            }}
          >
            Bulk upload
          </Button>

          {canFinishTrial ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<BlockIcon />}
              onClick={() => setConfirmOpen(true)}
              disabled={finishing}
              sx={{ fontWeight: 700, borderRadius: 2.5, px: 2.5 }}
            >
              Finish trial manually
            </Button>
          ) : null}
        </Stack>
      </Box>

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

      {success ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      ) : null}

      {!loading && shop ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
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
                  background:
                    shop.status === 'trial'
                      ? 'linear-gradient(135deg, #ff8f00 0%, #ff6f00 100%)'
                      : 'linear-gradient(135deg, #c62828 0%, #880e4f 100%)',
                  color: '#fff',
                }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
                  <StorefrontOutlinedIcon sx={{ fontSize: 36 }} />
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {shop.shopName || shop.shopId}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {shop.shopId}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto' }}>
                    <Chip
                      label={shop.status === 'trial' ? 'Active trial' : 'Trial expired'}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.18)',
                        color: '#fff',
                        fontWeight: 700,
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    />
                  </Box>
                </Stack>

                <Typography variant="body2" sx={{ mb: 1, opacity: 0.95 }}>
                  {formatRemaining(shop.trialSecondsRemaining)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={trialProgress}
                  sx={{
                    height: 8,
                    borderRadius: 99,
                    bgcolor: 'rgba(255,255,255,0.25)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 99,
                      bgcolor: '#fff',
                    },
                  }}
                />
              </Box>

              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow label="Trial started" value={formatDate(shop.trailStartDate)} />
                    <DetailRow label="Trial ends" value={formatDate(shop.trailEndDate)} />
                    <DetailRow label="Onboard step" value={shop.onboardStep || '—'} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow
                      label="Trial started flag"
                      value={shop.isTrailStared ? 'Yes' : 'No'}
                    />
                    <DetailRow
                      label="Trial completed"
                      value={shop.isTrailCompleted ? 'Yes' : 'No'}
                    />
                    <DetailRow label="Max users" value={String(shop.maxUsers ?? '—')} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Shop & owner
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow label="Address" value={shop.address || '—'} />
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                      <PhoneOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Shop: {shop.shopMobileNumber || '—'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <EmailOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {shop.email || '—'}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow
                      label="Owner"
                      value={`${shop.ownerFirstName || ''} ${shop.ownerLastName || ''}`.trim() || '—'}
                    />
                    <DetailRow label="Owner mobile" value={shop.ownerMobileNumber || '—'} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ mb: 3, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                  <HourglassTopOutlinedIcon color="secondary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    One-time payment
                  </Typography>
                </Stack>
                <DetailRow label="Amount" value={formatAmount(shop.oneTimePaymentAmount)} />
                <DetailRow
                  label="Payment generated"
                  value={shop.isOneTimePaymentGenerated ? 'Yes' : 'No'}
                />
                <DetailRow label="Payment done" value={shop.isOneTimePaymentDone ? 'Yes' : 'No'} />
                <DetailRow label="Receipt no." value={shop.oneTimePaymentReceiptNo || '—'} />
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Modules
                </Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <ModuleChip label="KPI" enabled={shop.kpi} />
                  <ModuleChip label="Analytics" enabled={shop.analyticsModule} />
                  <ModuleChip label="Manual order" enabled={shop.customerManualOrder} />
                  <ModuleChip label="Cost" enabled={shop.costModule} />
                  <ModuleChip label="Marketing" enabled={shop.marketingModule} />
                  <ModuleChip label="Warranty" enabled={shop.warrantyModule} />
                  <ModuleChip label="Quotations" enabled={shop.quotationsModule} />
                </Stack>
                <Divider sx={{ my: 2 }} />
                <DetailRow label="Created" value={formatDate(shop.createdAt)} />
                <DetailRow label="Updated" value={formatDate(shop.updatedAt)} />
              </CardContent>
            </Card>

            {canFinishTrial ? (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 2.5 }}>
                Finishing the trial will mark the shop as expired and sign out all mobile users for
                this shop.
              </Alert>
            ) : null}
          </Grid>
        </Grid>
      ) : null}

      <Dialog open={confirmOpen} onClose={() => !finishing && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Finish trial manually?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will immediately end the trial for <strong>{shop?.shopName || shopId}</strong>,
            set status to <strong>trialExpired</strong>, and clear active mobile sessions for this
            shop.
          </DialogContentText>
          <Alert severity="error" variant="outlined">
            This action cannot be undone from the dashboard.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={finishing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleFinishTrial()}
            disabled={finishing}
            startIcon={finishing ? <CircularProgress size={16} color="inherit" /> : <BlockIcon />}
          >
            {finishing ? 'Finishing…' : 'Confirm finish trial'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardShell>
  );
}

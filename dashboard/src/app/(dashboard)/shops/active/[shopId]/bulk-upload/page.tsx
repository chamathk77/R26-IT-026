'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';
import DashboardShell from '@/components/layout/DashboardShell';
import ShopBulkUploadPanel from '@/components/shops/ShopBulkUploadPanel';
import { fetchActiveShopDetails } from '@/lib/api/shops';

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

export default function ActiveShopBulkUploadPage() {
  const router = useRouter();
  const params = useParams<{ shopId: string }>();
  const shopId = params.shopId ? decodeURIComponent(params.shopId) : '';

  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShop = useCallback(async () => {
    if (!shopId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveShopDetails(shopId);
      setShopName(data.shop.shopName || data.shop.shopId);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load shop details'));
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  return (
    <DashboardShell
      title="Bulk upload"
      subtitle={shopName ? `${shopName} · ${shopId}` : shopId || '—'}
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
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push(`/shops/active/${encodeURIComponent(shopId)}`)}
        >
          Back to active shop
        </Button>
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

      {!loading && !error && shopId ? (
        <ShopBulkUploadPanel shopId={shopId} shopName={shopName} />
      ) : null}
    </DashboardShell>
  );
}

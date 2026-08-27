'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import QRCode from 'qrcode';
import { fetchCustomerMenu } from '@/lib/api/customerOrders';
import type { CustomerMenu } from '@/lib/api/customerOrders.types';
import { getCustomerApiErrorMessage } from '@/lib/customerOrderFormat';

/**
 * Printable table QR for one branch. Shops stick this on tables; scanning it
 * opens the customer menu page for the same shop + branch.
 */
export default function BranchOrderQrPage() {
  const router = useRouter();
  const params = useParams<{ shopId: string; branchId: string }>();
  const shopId = params.shopId ? decodeURIComponent(params.shopId) : '';
  const branchId = params.branchId ? decodeURIComponent(params.branchId) : '';

  const [menu, setMenu] = useState<CustomerMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState('');
  const [copied, setCopied] = useState(false);

  const orderUrl = useMemo(() => {
    if (typeof window === 'undefined' || !shopId || !branchId) return '';
    return `${window.location.origin}/order/${encodeURIComponent(shopId)}/${encodeURIComponent(branchId)}`;
  }, [shopId, branchId]);

  useEffect(() => {
    if (!shopId || !branchId) return;

    fetchCustomerMenu(shopId, branchId)
      .then((data) => {
        setMenu(data);
        setError(null);
      })
      .catch((err) => {
        setMenu(null);
        setError(getCustomerApiErrorMessage(err, 'Could not load branch details'));
      });
  }, [shopId, branchId]);

  useEffect(() => {
    if (!orderUrl) return;

    QRCode.toString(orderUrl, {
      type: 'svg',
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
    })
      .then(setQrSvg)
      .catch(() => setQrSvg(''));
  }, [orderUrl]);

  const handleCopy = useCallback(async () => {
    if (!orderUrl) return;
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [orderUrl]);

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: '#f4f6f8', py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 520, mx: 'auto' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
          className="qr-hide-on-print"
        >
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()}>
            Back
          </Button>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => void handleCopy()}
            >
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<PrintOutlinedIcon />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </Stack>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} className="qr-hide-on-print">
            {error}
          </Alert>
        ) : null}

        <Card sx={{ borderRadius: 4, textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {menu?.shop.shopName || shopId}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {menu?.branch.branchName || branchId}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>
              Scan to order
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Point your phone camera here to see the menu and order from your table.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                '& svg': { width: '100%', maxWidth: 320, height: 'auto' },
              }}
            >
              {qrSvg ? (
                <Box dangerouslySetInnerHTML={{ __html: qrSvg }} />
              ) : (
                <CircularProgress />
              )}
            </Box>

            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 2, wordBreak: 'break-all', color: 'text.secondary' }}
            >
              {orderUrl}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, fontWeight: 700 }}>
              {shopId} · {branchId}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
            .qr-hide-on-print { display: none !important; }
            body { background: #fff !important; }
          }`,
        }}
      />
    </Box>
  );
}

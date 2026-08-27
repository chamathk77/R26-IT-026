'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import CustomerOrderShell from '@/components/customerOrder/CustomerOrderShell';
import { fetchCustomerMenu, fetchCustomerOrders } from '@/lib/api/customerOrders';
import type { CustomerMenu, CustomerOrder } from '@/lib/api/customerOrders.types';
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  formatLkr,
  formatOrderTime,
  getCustomerApiErrorMessage,
  isValidPhone,
  sanitizePhone,
} from '@/lib/customerOrderFormat';

const PHONE_STORAGE_KEY = 'smartcost-customer-order-phone';

function OrderCard({ order }: { order: CustomerOrder }) {
  return (
    <Card sx={{ borderRadius: 3, mb: 1.5 }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800 }}>Order #{order.orderNumber}</Typography>
            <Typography variant="caption" color="text.secondary">
              {order.tableNumber ? `Table ${order.tableNumber} · ` : ''}
              {formatOrderTime(order.placedAt)}
            </Typography>
          </Box>
          <Chip
            size="small"
            color={ORDER_STATUS_COLORS[order.status]}
            label={ORDER_STATUS_LABELS[order.status]}
            sx={{ fontWeight: 700, flexShrink: 0 }}
          />
        </Stack>

        <Divider sx={{ mb: 1 }} />

        <Stack spacing={0.5}>
          {order.items.map((line, index) => (
            <Stack
              key={`${order.orderRef}-${index}`}
              direction="row"
              spacing={1}
              sx={{ justifyContent: 'space-between' }}
            >
              <Typography variant="body2" sx={{ minWidth: 0 }} noWrap>
                {line.quantity} × {line.name}
              </Typography>
              <Typography variant="body2" sx={{ flexShrink: 0 }}>
                {formatLkr(line.lineTotal)}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 1 }} />

        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800 }}>
            {order.paid ? 'Paid total' : 'Items total'}
          </Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatLkr(order.totalAmount)}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function CustomerOrderStatusPage() {
  const router = useRouter();
  const params = useParams<{ shopId: string; branchId: string }>();
  const shopId = params.shopId ? decodeURIComponent(params.shopId) : '';
  const branchId = params.branchId ? decodeURIComponent(params.branchId) : '';

  const [menu, setMenu] = useState<CustomerMenu | null>(null);
  const [phone, setPhone] = useState('');
  const [submittedPhone, setSubmittedPhone] = useState('');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!shopId || !branchId) return;

    fetchCustomerMenu(shopId, branchId)
      .then(setMenu)
      .catch(() => setMenu(null));
  }, [shopId, branchId]);

  const loadOrders = useCallback(
    async (rawPhone: string) => {
      const sanitized = sanitizePhone(rawPhone);
      if (!isValidPhone(sanitized)) {
        setError('Enter the 10-digit mobile number you used for the order');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchCustomerOrders(shopId, branchId, sanitized);
        setOrders(data);
        setSubmittedPhone(sanitized);
        setLoaded(true);
        try {
          localStorage.setItem(PHONE_STORAGE_KEY, sanitized);
        } catch {
          // Prefill is optional.
        }
      } catch (err) {
        setOrders([]);
        setError(getCustomerApiErrorMessage(err, 'Could not load your orders'));
      } finally {
        setLoading(false);
      }
    },
    [shopId, branchId],
  );

  useEffect(() => {
    let saved = '';
    try {
      saved = localStorage.getItem(PHONE_STORAGE_KEY) ?? '';
    } catch {
      saved = '';
    }

    if (saved) {
      setPhone(saved);
      void loadOrders(saved);
    }
  }, [loadOrders]);

  const menuHref = `/order/${encodeURIComponent(shopId)}/${encodeURIComponent(branchId)}`;

  return (
    <CustomerOrderShell
      shopName={menu?.shop.shopName || 'My orders'}
      subtitle={menu ? `${menu.branch.branchName} · Today's orders` : "Today's orders"}
      action={
        <Button
          size="small"
          variant="outlined"
          startIcon={<RestaurantMenuOutlinedIcon />}
          onClick={() => router.push(menuHref)}
          sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', flexShrink: 0 }}
        >
          Menu
        </Button>
      }
    >
      <Card sx={{ borderRadius: 3, mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Find your orders
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              size="small"
              label="Mobile number"
              placeholder="0771234567"
              value={phone}
              onChange={(event) => setPhone(sanitizePhone(event.target.value))}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
            />
            <Button
              variant="contained"
              onClick={() => void loadOrders(phone)}
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />
              }
              sx={{ fontWeight: 800, borderRadius: 2, whiteSpace: 'nowrap' }}
            >
              {loaded ? 'Refresh' : 'Show orders'}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Only today&apos;s orders from this branch are shown.
          </Typography>
        </CardContent>
      </Card>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loaded && orders.length === 0 && !loading ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary" align="center">
              No orders today for {submittedPhone}.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button variant="contained" onClick={() => router.push(menuHref)}>
                Open the menu
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : null}

      {orders.map((order) => (
        <OrderCard key={`${order.orderRef}-${order.status}`} order={order} />
      ))}
    </CustomerOrderShell>
  );
}

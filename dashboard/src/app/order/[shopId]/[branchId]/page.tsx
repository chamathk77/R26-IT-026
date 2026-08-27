'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import SearchIcon from '@mui/icons-material/Search';
import CustomerOrderShell from '@/components/customerOrder/CustomerOrderShell';
import {
  fetchCustomerMenu,
  fetchCustomerRecommendations,
  placeCustomerOrder,
} from '@/lib/api/customerOrders';
import { resolveUploadUrl } from '@/lib/api/publicApi';
import type {
  CustomerMenu,
  CustomerMenuItem,
  CustomerRecommendation,
  RecommendationReasonCode,
} from '@/lib/api/customerOrders.types';
import {
  formatLkr,
  getCustomerApiErrorMessage,
  isValidPhone,
  sanitizePhone,
} from '@/lib/customerOrderFormat';

const PHONE_STORAGE_KEY = 'smartcost-customer-order-phone';
const ALL_CATEGORIES = '__all__';
const RECOMMENDATION_LIMIT = 10;

const REASON_LABELS: Record<RecommendationReasonCode, string> = {
  frequently_bought_together: 'Often ordered together',
  similar_taste: 'Goes well with your order',
  popular_in_category: 'Most loved',
  popular_overall: 'Popular right now',
  personal_favourite: 'Your usual',
};

function reasonLabel(recommendation: CustomerRecommendation): string {
  // The API writes the customer-facing phrasing, so it wins; the map below only keeps
  // the chip meaningful if a response ever arrives without one.
  const fromApi = recommendation.reason?.trim();
  if (fromApi) return fromApi;

  if (recommendation.reasonCode === 'popular_in_category' && recommendation.categoryName) {
    // The category is the whole signal here — "Most loved Desserts" beats a generic label.
    return `Most loved ${recommendation.categoryName}`;
  }
  return REASON_LABELS[recommendation.reasonCode] ?? 'Recommended for you';
}

function readSavedPhone(): string {
  try {
    return localStorage.getItem(PHONE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function savePhone(phone: string): void {
  try {
    localStorage.setItem(PHONE_STORAGE_KEY, phone);
  } catch {
    // Private browsing / blocked storage — prefill is optional.
  }
}

function ItemRow({
  item,
  quantity,
  onChange,
}: {
  item: CustomerMenuItem;
  quantity: number;
  onChange: (next: number) => void;
}) {
  const imageUrl = resolveUploadUrl(item.image);
  const maxQuantity = item.isInventoryAvailable ? Math.max(0, item.qty ?? 0) : 99;
  const disabled = !item.available;

  return (
    <Box sx={{ px: 2, py: 1.5, opacity: disabled ? 0.55 : 1 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Avatar
          src={imageUrl || undefined}
          variant="rounded"
          sx={{ width: 48, height: 48, bgcolor: 'primary.light', fontWeight: 700 }}
        >
          {item.productName.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {item.productName}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.25 }}>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>
              {formatLkr(item.amount)}
            </Typography>
            {item.isInventoryAvailable ? (
              <Chip
                size="small"
                variant="outlined"
                color={item.available ? 'default' : 'error'}
                label={item.available ? `${item.qty} left` : 'Out of stock'}
                sx={{ height: 20, fontSize: 11 }}
              />
            ) : null}
          </Stack>
        </Box>

        {quantity > 0 ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => onChange(quantity - 1)}
              aria-label={`Remove one ${item.productName}`}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ minWidth: 22, textAlign: 'center', fontWeight: 800 }}>
              {quantity}
            </Typography>
            <IconButton
              size="small"
              color="primary"
              disabled={quantity >= maxQuantity}
              onClick={() => onChange(quantity + 1)}
              aria-label={`Add one ${item.productName}`}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
        ) : (
          <Button
            size="small"
            variant="outlined"
            disabled={disabled}
            onClick={() => onChange(1)}
            sx={{ borderRadius: 2, minWidth: 64 }}
          >
            Add
          </Button>
        )}
      </Stack>
    </Box>
  );
}

function RecommendationRow({
  recommendation,
  quantity,
  onChange,
}: {
  recommendation: CustomerRecommendation;
  quantity: number;
  onChange: (next: number) => void;
}) {
  const imageUrl = resolveUploadUrl(recommendation.image);
  // qty is null for products that are not inventory tracked, so there is no ceiling.
  const maxQuantity = recommendation.qty == null ? 99 : Math.max(0, recommendation.qty);
  const disabled = !recommendation.available;

  return (
    <Box sx={{ py: 1.5, opacity: disabled ? 0.55 : 1 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Avatar
          src={imageUrl || undefined}
          variant="rounded"
          sx={{ width: 48, height: 48, bgcolor: 'primary.light', fontWeight: 700 }}
        >
          {recommendation.productName.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {recommendation.productName}
          </Typography>
          <Typography variant="body2" color="primary" sx={{ fontWeight: 700, mt: 0.25 }}>
            {formatLkr(recommendation.amount)}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            color="primary"
            label={reasonLabel(recommendation)}
            sx={{ height: 22, fontSize: 11, mt: 0.5, maxWidth: '100%' }}
          />
        </Box>

        {quantity > 0 ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => onChange(quantity - 1)}
              aria-label={`Remove one ${recommendation.productName}`}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ minWidth: 22, textAlign: 'center', fontWeight: 800 }}>
              {quantity}
            </Typography>
            <IconButton
              size="small"
              color="primary"
              disabled={quantity >= maxQuantity}
              onClick={() => onChange(quantity + 1)}
              aria-label={`Add one ${recommendation.productName}`}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
        ) : (
          <Button
            size="small"
            variant="outlined"
            disabled={disabled}
            onClick={() => onChange(1)}
            sx={{ borderRadius: 2, minWidth: 64 }}
          >
            Add
          </Button>
        )}
      </Stack>
    </Box>
  );
}

export default function CustomerOrderMenuPage() {
  const router = useRouter();
  const params = useParams<{ shopId: string; branchId: string }>();
  const shopId = params.shopId ? decodeURIComponent(params.shopId) : '';
  const branchId = params.branchId ? decodeURIComponent(params.branchId) : '';

  const [menu, setMenu] = useState<CustomerMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  const [recommendOpen, setRecommendOpen] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<CustomerRecommendation[]>([]);
  const [acceptedRecommendations, setAcceptedRecommendations] = useState<string[]>([]);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [placedOrderNumber, setPlacedOrderNumber] = useState<number | null>(null);

  const loadMenu = useCallback(async () => {
    if (!shopId || !branchId) return;

    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCustomerMenu(shopId, branchId);
      setMenu(data);
    } catch (error) {
      setMenu(null);
      setLoadError(getCustomerApiErrorMessage(error, 'Could not load the menu'));
    } finally {
      setLoading(false);
    }
  }, [shopId, branchId]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const setQuantity = useCallback((productId: string, next: number) => {
    setQuantities((prev) => {
      const updated = { ...prev };
      if (next <= 0) {
        delete updated[productId];
      } else {
        updated[productId] = next;
      }
      return updated;
    });
  }, []);

  const selectedLines = useMemo(() => {
    if (!menu) return [];
    return menu.items
      .filter((item) => (quantities[item._id] ?? 0) > 0)
      .map((item) => ({ item, quantity: quantities[item._id] }));
  }, [menu, quantities]);

  const totalQuantity = selectedLines.reduce((sum, line) => sum + line.quantity, 0);
  const totalAmount = selectedLines.reduce(
    (sum, line) => sum + line.item.amount * line.quantity,
    0,
  );

  const visibleItems = useMemo(() => {
    if (!menu) return [];
    const term = search.trim().toLowerCase();

    return menu.items.filter((item) => {
      if (activeCategory !== ALL_CATEGORIES && item.categoryId !== activeCategory) {
        return false;
      }
      if (!term) return true;
      return (
        item.productName.toLowerCase().includes(term) ||
        (item.productNumber ?? '').toLowerCase().includes(term)
      );
    });
  }, [menu, search, activeCategory]);

  const continueToReview = useCallback(() => {
    setRecommendOpen(false);
    setReviewOpen(true);
  }, []);

  const loadRecommendations = useCallback(async () => {
    if (!menu) return;

    setRecommendLoading(true);
    setRecommendations([]);
    try {
      // A remembered phone is what lets the model fire the "your usual" signal.
      const knownPhone = phone || readSavedPhone();
      const result = await fetchCustomerRecommendations(shopId, branchId, {
        items: selectedLines.map((line) => ({
          productId: line.item._id,
          quantity: line.quantity,
        })),
        phone: isValidPhone(knownPhone) ? sanitizePhone(knownPhone) : undefined,
        limit: RECOMMENDATION_LIMIT,
      });

      // Only products present in this menu can enter `quantities` and reach the order.
      const menuIds = new Set(menu.items.map((item) => item._id));
      const usable = result.recommendations.filter((item) => menuIds.has(item.productId));

      if (usable.length === 0) {
        // Nothing worth suggesting — do not make the customer dismiss an empty dialog.
        continueToReview();
        return;
      }
      setRecommendations(usable);
    } catch {
      // Suggestions are a bonus step, and the customer cannot act on their failure, so
      // move straight on to confirming instead of showing an error that blocks nothing.
      continueToReview();
    } finally {
      setRecommendLoading(false);
    }
  }, [menu, phone, selectedLines, shopId, branchId, continueToReview]);

  const addRecommendation = useCallback(
    (productId: string, next: number) => {
      setQuantity(productId, next);
      setAcceptedRecommendations((prev) => {
        // Taking the line back to zero withdraws the acceptance we report.
        if (next <= 0) return prev.filter((id) => id !== productId);
        return prev.includes(productId) ? prev : [...prev, productId];
      });
    },
    [setQuantity],
  );

  const handleSubmit = useCallback(async () => {
    if (!menu) return;

    const trimmedTable = tableNumber.trim();
    if (!trimmedTable) {
      setSubmitError('Enter your table number');
      return;
    }
    if (!isValidPhone(phone)) {
      setSubmitError('Enter a valid 10-digit mobile number (e.g. 0771234567)');
      return;
    }
    if (selectedLines.length === 0) {
      setSubmitError('Add at least one item');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const sanitizedPhone = sanitizePhone(phone);
      // Only report suggestions that actually survived to the final cart.
      const acceptedIds = acceptedRecommendations.filter((productId) =>
        selectedLines.some((line) => line.item._id === productId),
      );
      const placed = await placeCustomerOrder(shopId, branchId, {
        phone: sanitizedPhone,
        customerName: customerName.trim() || undefined,
        tableNumber: trimmedTable,
        items: selectedLines.map((line) => ({
          productId: line.item._id,
          quantity: line.quantity,
        })),
        acceptedRecommendations: acceptedIds.length > 0 ? acceptedIds : undefined,
      });

      savePhone(sanitizedPhone);
      setPlacedOrderNumber(placed.orderNumber);
      setQuantities({});
      setAcceptedRecommendations([]);
      setReviewOpen(false);
      // Stock counters change once an order is queued.
      void loadMenu();
    } catch (error) {
      setSubmitError(getCustomerApiErrorMessage(error, 'Could not send your order'));
    } finally {
      setSubmitting(false);
    }
  }, [
    menu,
    tableNumber,
    phone,
    customerName,
    selectedLines,
    acceptedRecommendations,
    shopId,
    branchId,
    loadMenu,
  ]);

  const statusHref = `/order/${encodeURIComponent(shopId)}/${encodeURIComponent(branchId)}/status`;

  if (loading) {
    return (
      <CustomerOrderShell shopName="Loading menu…">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </CustomerOrderShell>
    );
  }

  if (loadError || !menu) {
    return (
      <CustomerOrderShell shopName="Menu unavailable">
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError ?? 'Menu unavailable'}
        </Alert>
        <Button variant="contained" onClick={() => void loadMenu()}>
          Try again
        </Button>
      </CustomerOrderShell>
    );
  }

  return (
    <CustomerOrderShell
      shopName={menu.shop.shopName}
      subtitle={`${menu.branch.branchName} · Dine-in order`}
      action={
        <Button
          size="small"
          startIcon={<ReceiptLongOutlinedIcon />}
          onClick={() => router.push(statusHref)}
          sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', flexShrink: 0 }}
          variant="outlined"
        >
          My orders
        </Button>
      }
    >
      {placedOrderNumber != null ? (
        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon />}
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => router.push(statusHref)}>
              View
            </Button>
          }
        >
          Order #{placedOrderNumber} sent to the cashier. They will confirm it shortly.
        </Alert>
      ) : null}

      <TextField
        fullWidth
        size="small"
        placeholder="Search the menu"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ mb: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {menu.categories.length > 0 ? (
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1.5 }}>
          <Chip
            label="All"
            color={activeCategory === ALL_CATEGORIES ? 'primary' : 'default'}
            onClick={() => setActiveCategory(ALL_CATEGORIES)}
            sx={{ fontWeight: 700, flexShrink: 0 }}
          />
          {menu.categories.map((category) => (
            <Chip
              key={category._id}
              label={category.name}
              color={activeCategory === category._id ? 'primary' : 'default'}
              onClick={() => setActiveCategory(category._id)}
              sx={{ fontWeight: 700, flexShrink: 0 }}
            />
          ))}
        </Box>
      ) : null}

      <Card sx={{ borderRadius: 3, mb: totalQuantity > 0 ? 12 : 4 }}>
        {visibleItems.length === 0 ? (
          <CardContent>
            <Typography color="text.secondary" align="center">
              No items match your search.
            </Typography>
          </CardContent>
        ) : (
          visibleItems.map((item, index) => (
            <Box key={item._id}>
              {index > 0 ? <Divider /> : null}
              <ItemRow
                item={item}
                quantity={quantities[item._id] ?? 0}
                onChange={(next) => setQuantity(item._id, next)}
              />
            </Box>
          ))
        )}
      </Card>

      {totalQuantity > 0 ? (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 -6px 20px rgba(15, 23, 42, 0.12)',
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{ maxWidth: 720, mx: 'auto', alignItems: 'center' }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                {totalQuantity} item{totalQuantity === 1 ? '' : 's'}
              </Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatLkr(totalAmount)}</Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                setSubmitError(null);
                // Prefill from the last order placed on this device.
                setPhone((current) => current || readSavedPhone());
                setRecommendOpen(true);
                void loadRecommendations();
              }}
              sx={{ borderRadius: 2.5, px: 3, fontWeight: 800 }}
            >
              Review &amp; send
            </Button>
          </Stack>
        </Box>
      ) : null}

      <Dialog open={recommendOpen} onClose={continueToReview} fullWidth maxWidth="sm">
        <DialogTitle
          sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <AutoAwesomeOutlinedIcon color="primary" />
          Add something else?
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ maxHeight: { xs: '55vh', sm: '60vh' }, overflowY: 'auto', overscrollBehavior: 'contain' }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Picked for your order from what guests here usually order together.
          </Typography>

          {recommendLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : recommendations.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              Nothing extra to suggest — your order is ready to send.
            </Typography>
          ) : (
            recommendations.map((recommendation, index) => (
              <Box key={recommendation.productId}>
                {index > 0 ? <Divider /> : null}
                <RecommendationRow
                  recommendation={recommendation}
                  quantity={quantities[recommendation.productId] ?? 0}
                  onChange={(next) => addRecommendation(recommendation.productId, next)}
                />
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={continueToReview}>Skip</Button>
          <Button
            variant="contained"
            onClick={continueToReview}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={reviewOpen}
        onClose={() => (submitting ? undefined : setReviewOpen(false))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm your order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {selectedLines.map((line) => (
              <Stack
                key={line.item._id}
                direction="row"
                spacing={1}
                sx={{ justifyContent: 'space-between' }}
              >
                <Typography variant="body2" sx={{ minWidth: 0 }} noWrap>
                  {line.quantity} × {line.item.productName}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
                  {formatLkr(line.item.amount * line.quantity)}
                </Typography>
              </Stack>
            ))}
            <Divider />
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 800 }}>Total</Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatLkr(totalAmount)}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Taxes or service charges, if any, are added by the cashier on the final bill.
            </Typography>
          </Stack>

          {menu.tableManagement && menu.tables.length > 0 ? (
            <TextField
              select
              fullWidth
              required
              label="Table number"
              value={tableNumber}
              onChange={(event) => setTableNumber(event.target.value)}
              sx={{ mb: 2 }}
            >
              {menu.tables.map((table) => (
                <MenuItem key={table._id} value={table.tableNumber}>
                  {table.tableNumber}
                  {table.tableName ? ` · ${table.tableName}` : ''}
                  {table.zone ? ` (${table.zone})` : ''}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              fullWidth
              required
              label="Table number"
              placeholder="e.g. 12"
              value={tableNumber}
              onChange={(event) => setTableNumber(event.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          <TextField
            fullWidth
            required
            label="Your mobile number"
            placeholder="0771234567"
            value={phone}
            onChange={(event) => setPhone(sanitizePhone(event.target.value))}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
            helperText="Used to confirm the order and to look it up later."
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Your name (optional)"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />

          {submitError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setReviewOpen(false)} disabled={submitting}>
            Keep editing
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            Send to cashier
          </Button>
        </DialogActions>
      </Dialog>
    </CustomerOrderShell>
  );
}

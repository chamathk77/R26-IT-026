import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { MainBottomTabParamList } from '../../navigation/MainBottomTabParamList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import {
  checkoutCartSession_Service,
  deleteAddedCartSession_Service,
  fetchAddedCartSessions_Service,
  fetchCartItems_Service,
  removeAddedCartItem_Service,
  revertAddedCartToPending_Service,
  updateAddedCartItemQuantity_Service,
} from '../../services/CartService';
import { fetchProducts_Service } from '../../services/ProductService';
import { clearCartTabSelection, setCartTabSelection } from '../../store/reducers/CartReducer';
import { AppDispatch, RootState, store } from '../../store/store';
import { CartOrderItem, CartSessionSummary } from '../../type/cart';
import { Product } from '../../type/product';
import { getCartOrderItemKey } from '../../utils/cartOrder';
import { getCartNumberForSession, filterAddedSessionsForShop } from '../../utils/cartSession';
import { getStockLimitToastMessage, isAtProductStockLimit } from '../../utils/productStock';
import SlideToast from '../../components/SlideToast/SlideToast';
import { cardShadow } from '../settings/shared/settingsDetailStyles';
import { softShadow } from './ManageInventory/inventoryUiStyles';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Cart'>;

type DiscountMode = 'amount' | 'percentage';

function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CartScreen(_props: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const {
    items: addedSessions,
    loading: addedSessionsLoading,
    error: addedSessionsError,
  } = useSelector((state: RootState) => state.CartReducer.addedSessions);
  const { sessionId, cartNumber, order, loading, error } = useSelector(
    (state: RootState) => state.CartReducer.cartTab,
  );
  const { loading: checkoutLoading, error: checkoutError } = useSelector(
    (state: RootState) => state.CartReducer.checkout,
  );
  const { loadingSessionId: manageLoadingSessionId, error: manageAddedError } = useSelector(
    (state: RootState) => state.CartReducer.manageAdded,
  );
  const { loadingProductId: editLoadingProductId, error: editCartError } = useSelector(
    (state: RootState) => state.CartReducer.editCart,
  );
  const { items: products } = useSelector((state: RootState) => state.ProductReducer.list);
  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );
  const [addedModalVisible, setAddedModalVisible] = useState(false);
  const [slideToastMessage, setSlideToastMessage] = useState<string | null>(null);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountMode, setDiscountMode] = useState<DiscountMode>('amount');
  const [discountValue, setDiscountValue] = useState('');
  const previousShopIdRef = useRef(shopId);

  const shopAddedSessions = useMemo(
    () => filterAddedSessionsForShop(addedSessions, shopId),
    [addedSessions, shopId],
  );

  const showSlideToast = useCallback((message: string) => {
    setSlideToastMessage(message);
  }, []);

  const hideSlideToast = useCallback(() => {
    setSlideToastMessage(null);
  }, []);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
      map.set(product._id, product);
    }
    return map;
  }, [products]);

  const items = order?.items ?? [];
  const totalAmount = order?.totalPrice ?? 0;
  const addedCartCount = shopAddedSessions.length;
  const itemCount = items.length;
  const hasShop = Boolean(shopId?.trim());

  const discountPreview = useMemo(() => {
    if (!discountEnabled || totalAmount <= 0) {
      return { discountAmount: 0, checkoutTotal: totalAmount };
    }

    const parsed = Number.parseFloat(discountValue.replace(/,/g, '').trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { discountAmount: 0, checkoutTotal: totalAmount };
    }

    const discountAmount =
      discountMode === 'percentage'
        ? Math.min(totalAmount, (totalAmount * parsed) / 100)
        : Math.min(totalAmount, parsed);

    return {
      discountAmount,
      checkoutTotal: Math.max(0, totalAmount - discountAmount),
    };
  }, [discountEnabled, discountMode, discountValue, totalAmount]);

  useEffect(() => {
    if (itemCount === 0) {
      setDiscountEnabled(false);
      setDiscountValue('');
      setDiscountMode('amount');
    }
  }, [itemCount]);

  useEffect(() => {
    const previousShopId = previousShopIdRef.current;
    if (previousShopId && shopId && previousShopId !== shopId) {
      dispatch(clearCartTabSelection());
    }
    previousShopIdRef.current = shopId;
  }, [dispatch, shopId]);

  const loadAddedSessions = useCallback(async () => {
    if (!hasShop) return;
    await dispatch(fetchAddedCartSessions_Service());
  }, [dispatch, hasShop]);

  const loadSelectedCart = useCallback(async () => {
    if (!hasShop) return;

    const { cartTab, addedSessions: latestAdded } = store.getState().CartReducer;
    const selectedSessionId = cartTab.sessionId;
    if (!selectedSessionId) return;

    const shopSessions = filterAddedSessionsForShop(latestAdded.items, shopId);
    const isValidAddedSession = shopSessions.some(
      (session) => session.sessionId === selectedSessionId,
    );
    if (!isValidAddedSession) {
      dispatch(clearCartTabSelection());
      return;
    }

    await dispatch(
      fetchCartItems_Service({
        sessionId: selectedSessionId,
        status: 'added',
      }),
    );
  }, [dispatch, hasShop, shopId]);

  const reloadCartScreen = useCallback(async () => {
    if (!hasShop) return;
    await loadAddedSessions();
    await loadSelectedCart();
  }, [hasShop, loadAddedSessions, loadSelectedCart]);

  useFocusEffect(
    useCallback(() => {
      void reloadCartScreen();
      if (hasShop) {
        void dispatch(fetchProducts_Service());
      }
    }, [dispatch, hasShop, reloadCartScreen]),
  );

  const openAddedModal = useCallback(() => {
    setAddedModalVisible(true);
    void loadAddedSessions();
  }, [loadAddedSessions]);

  const closeAddedModal = useCallback(() => {
    setAddedModalVisible(false);
  }, []);

  const handleSelectAddedSession = useCallback(
    async (session: CartSessionSummary) => {
      if (!filterAddedSessionsForShop([session], shopId).length) return;

      const resolvedCartNumber = getCartNumberForSession(shopAddedSessions, session.sessionId);
      dispatch(
        setCartTabSelection({
          sessionId: session.sessionId,
          cartNumber: resolvedCartNumber,
        }),
      );
      closeAddedModal();
      await dispatch(
        fetchCartItems_Service({
          sessionId: session.sessionId,
          status: 'added',
        }),
      );
    },
    [closeAddedModal, dispatch, shopAddedSessions, shopId],
  );

  const handleCheckout = useCallback(async () => {
    if (!sessionId || items.length === 0 || checkoutLoading) return;

    try {
      await dispatch(checkoutCartSession_Service(sessionId)).unwrap();
    } catch (err: unknown) {
      console.log('Checkout cart:', err);
    }
  }, [checkoutLoading, dispatch, items.length, sessionId]);

  const handleGoBackToPending = useCallback(
    async (targetSessionId: string) => {
      if (manageLoadingSessionId) return;

      try {
        await dispatch(revertAddedCartToPending_Service(targetSessionId)).unwrap();
      } catch (err: unknown) {
        console.log('Revert added cart:', err);
      }
    },
    [dispatch, manageLoadingSessionId],
  );

  const handleDeleteAddedCart = useCallback(
    async (targetSessionId: string) => {
      if (manageLoadingSessionId) return;

      try {
        await dispatch(deleteAddedCartSession_Service(targetSessionId)).unwrap();
      } catch (err: unknown) {
        console.log('Delete added cart:', err);
      }
    },
    [dispatch, manageLoadingSessionId],
  );

  const handleIncreaseQuantity = useCallback(
    async (item: CartOrderItem) => {
      if (!sessionId || editLoadingProductId) return;

      const product = productById.get(item.productId);
      const stockLimitMessage = product
        ? getStockLimitToastMessage(product, item.quantity)
        : null;
      if (stockLimitMessage) {
        showSlideToast(stockLimitMessage);
        return;
      }

      try {
        await dispatch(
          updateAddedCartItemQuantity_Service({
            sessionId,
            productId: item.productId,
            quantity: item.quantity + 1,
          }),
        ).unwrap();
      } catch (err: unknown) {
        console.log('Increase cart item quantity:', err);
      }
    },
    [dispatch, editLoadingProductId, productById, sessionId, showSlideToast],
  );

  const handleDecreaseQuantity = useCallback(
    async (item: CartOrderItem) => {
      if (!sessionId || editLoadingProductId || item.quantity <= 1) return;

      try {
        await dispatch(
          updateAddedCartItemQuantity_Service({
            sessionId,
            productId: item.productId,
            quantity: item.quantity - 1,
          }),
        ).unwrap();
      } catch (err: unknown) {
        console.log('Decrease cart item quantity:', err);
      }
    },
    [dispatch, editLoadingProductId, sessionId],
  );

  const handleDeleteCartItem = useCallback(
    async (item: CartOrderItem) => {
      if (!sessionId || editLoadingProductId) return;

      try {
        await dispatch(
          removeAddedCartItem_Service({
            sessionId,
            productId: item.productId,
          }),
        ).unwrap();
      } catch (err: unknown) {
        console.log('Delete cart item:', err);
      }
    },
    [dispatch, editLoadingProductId, sessionId],
  );

  const renderCartItem = ({ item }: { item: CartOrderItem }) => {
    const isEditing = editLoadingProductId === item.productId;
    const product = productById.get(item.productId);
    const atStockLimit = product ? isAtProductStockLimit(product, item.quantity) : false;
    const isService = product?.type === 'service';
    const accentColor = isService ? paperTheme.colors.tertiary : paperTheme.colors.primary;
    const unitPrice = product?.amount ?? null;
    const lineTotal = unitPrice != null ? unitPrice * item.quantity : null;

    return (
      <View
        style={[
          styles.itemCard,
          { backgroundColor: paperTheme.colors.surface },
          cardShadow(resolvedTheme),
        ]}
      >
        <View style={[styles.itemAccent, { backgroundColor: accentColor }]} />
        <View style={styles.itemContent}>
          <View style={styles.itemTopRow}>
            <View style={styles.itemBody}>
              <Text style={[styles.itemName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.itemMetaRow}>
                {product ? (
                  <View
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isService
                          ? `${paperTheme.colors.tertiary}22`
                          : `${paperTheme.colors.primary}14`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isService ? 'construct-outline' : 'pricetag-outline'}
                      size={10}
                      color={accentColor}
                    />
                    <Text style={[styles.typeChipText, { color: accentColor }]}>
                      {isService ? 'Service' : 'Product'}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.itemMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {formatAmount(unitPrice)} each
                </Text>
              </View>
            </View>
            <Text style={[styles.lineTotal, { color: paperTheme.colors.primary }]}>
              {lineTotal != null ? formatAmount(lineTotal) : '—'}
            </Text>
          </View>

          <View style={styles.itemActions}>
            {isEditing ? (
              <ActivityIndicator size="small" color={paperTheme.colors.primary} />
            ) : (
              <View
                style={[
                  styles.qtyStepper,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: `${paperTheme.colors.outlineVariant}88`,
                  },
                  softShadow(resolvedTheme),
                ]}
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease quantity for ${item.name}`}
                  onPress={() => {
                    void handleDecreaseQuantity(item);
                  }}
                  disabled={item.quantity <= 1 || Boolean(editLoadingProductId)}
                  style={[styles.qtyBtn, { opacity: item.quantity <= 1 || editLoadingProductId ? 0.35 : 1 }]}
                >
                  <Ionicons name="remove" size={14} color={paperTheme.colors.onSurface} />
                </TouchableOpacity>
                <Text style={[styles.qtyValue, { color: paperTheme.colors.onSurface }]}>{item.quantity}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Increase quantity for ${item.name}`}
                  onPress={() => {
                    void handleIncreaseQuantity(item);
                  }}
                  disabled={Boolean(editLoadingProductId)}
                  style={[
                    styles.qtyBtn,
                    styles.qtyBtnAdd,
                    {
                      backgroundColor: paperTheme.colors.primary,
                      opacity: editLoadingProductId ? 0.7 : atStockLimit ? 0.45 : 1,
                    },
                  ]}
                >
                  <Ionicons name="add" size={14} color={paperTheme.colors.onPrimary} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name} from cart`}
              onPress={() => {
                void handleDeleteCartItem(item);
              }}
              disabled={Boolean(editLoadingProductId)}
              style={[styles.itemDeleteBtn, { backgroundColor: paperTheme.colors.errorContainer }]}
            >
              <Ionicons name="trash-outline" size={17} color={paperTheme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const screenError = error ?? addedSessionsError ?? checkoutError ?? manageAddedError ?? editCartError;

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <SlideToast
          message={slideToastMessage}
          onDismiss={hideSlideToast}
          paperTheme={paperTheme}
          durationMs={2000}
        />

        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>Cart</Text>
            <Text style={[styles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
              {cartNumber
                ? `Order #${cartNumber} is ready for checkout.`
                : 'Select an added order to review and checkout.'}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View added carts"
            onPress={openAddedModal}
            style={[
              styles.addedBadge,
              { backgroundColor: paperTheme.colors.primary },
              softShadow(resolvedTheme),
            ]}
          >
            <Ionicons name="bag-check-outline" size={18} color={paperTheme.colors.onPrimary} />
            {addedSessionsLoading ? (
              <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
            ) : (
              <Text style={[styles.addedBadgeCount, { color: paperTheme.colors.onPrimary }]}>
                {addedCartCount}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {screenError ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{screenError}</Text>
        ) : null}

        {!hasShop ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.onSurfaceVariant }]}>
            No shop linked to this account. Added carts cannot be loaded.
          </Text>
        ) : null}

        {sessionId && itemCount > 0 ? (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: paperTheme.colors.primaryContainer },
              cardShadow(resolvedTheme),
            ]}
          >
            <View style={styles.summaryLeft}>
              <View style={[styles.summaryIconWrap, { backgroundColor: paperTheme.colors.primary }]}>
                <Ionicons name="receipt-outline" size={18} color={paperTheme.colors.onPrimary} />
              </View>
              <View>
                <Text style={[styles.summaryTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
                  {itemCount} item{itemCount === 1 ? '' : 's'}
                </Text>
                <Text style={[styles.summarySub, { color: paperTheme.colors.onPrimaryContainer }]}>
                  {cartNumber ? `Order #${cartNumber}` : 'Ready to checkout'}
                </Text>
              </View>
            </View>
            <Text style={[styles.summaryTotal, { color: paperTheme.colors.primary }]}>
              {formatCurrency(
                discountEnabled && discountPreview.discountAmount > 0
                  ? discountPreview.checkoutTotal
                  : totalAmount,
              )}
            </Text>
          </View>
        ) : null}

        {loading && items.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={[styles.empty, cardShadow(resolvedTheme), { backgroundColor: paperTheme.colors.surface }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: `${paperTheme.colors.primary}14` }]}>
              <Ionicons name="cart-outline" size={40} color={paperTheme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
              Cart is empty
            </Text>
            <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
              Proceed with a pending order from Products, or open the added-cart icon to pick an
              order.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={getCartOrderItemKey}
            renderItem={renderCartItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}

        {items.length > 0 ? (
          <View
            style={[
              styles.discountCard,
              { backgroundColor: paperTheme.colors.surface },
              cardShadow(resolvedTheme),
            ]}
          >
            <View style={styles.discountHeaderRow}>
              <View style={styles.discountTitleBlock}>
                <Ionicons name="pricetag-outline" size={18} color={paperTheme.colors.primary} />
                <Text style={[styles.discountTitle, { color: paperTheme.colors.onSurface }]}>
                  Customer discount
                </Text>
              </View>
              <Switch
                value={discountEnabled}
                onValueChange={setDiscountEnabled}
                trackColor={{
                  false: paperTheme.colors.surfaceVariant,
                  true: `${paperTheme.colors.primary}88`,
                }}
                thumbColor={
                  discountEnabled ? paperTheme.colors.primary : paperTheme.colors.outline
                }
              />
            </View>

            {discountEnabled ? (
              <View style={styles.discountBody}>
                <Text style={[styles.discountLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Discount type
                </Text>
                <View style={styles.discountModeRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Discount by amount"
                    onPress={() => setDiscountMode('amount')}
                    style={[
                      styles.discountModeChip,
                      {
                        backgroundColor:
                          discountMode === 'amount'
                            ? paperTheme.colors.primary
                            : paperTheme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.discountModeChipText,
                        {
                          color:
                            discountMode === 'amount'
                              ? paperTheme.colors.onPrimary
                              : paperTheme.colors.onSurface,
                        },
                      ]}
                    >
                      Amount (Rs.)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Discount by percentage"
                    onPress={() => setDiscountMode('percentage')}
                    style={[
                      styles.discountModeChip,
                      {
                        backgroundColor:
                          discountMode === 'percentage'
                            ? paperTheme.colors.primary
                            : paperTheme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.discountModeChipText,
                        {
                          color:
                            discountMode === 'percentage'
                              ? paperTheme.colors.onPrimary
                              : paperTheme.colors.onSurface,
                        },
                      ]}
                    >
                      Percentage (%)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.discountLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {discountMode === 'amount' ? 'Discount amount' : 'Discount percentage'}
                </Text>
                <View
                  style={[
                    styles.discountInputWrap,
                    { backgroundColor: paperTheme.colors.surfaceVariant },
                  ]}
                >
                  {discountMode === 'amount' ? (
                    <Text style={[styles.discountInputPrefix, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Rs.
                    </Text>
                  ) : null}
                  <TextInput
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    placeholder={discountMode === 'amount' ? '0.00' : '0'}
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    keyboardType="decimal-pad"
                    style={[styles.discountInput, { color: paperTheme.colors.onSurface }]}
                  />
                  {discountMode === 'percentage' ? (
                    <Text style={[styles.discountInputSuffix, { color: paperTheme.colors.onSurfaceVariant }]}>
                      %
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.discountBreakdown,
                    { backgroundColor: paperTheme.colors.surfaceVariant },
                  ]}
                >
                  <View style={styles.discountBreakdownRow}>
                    <Text style={[styles.discountBreakdownLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Subtotal
                    </Text>
                    <Text style={[styles.discountBreakdownValue, { color: paperTheme.colors.onSurface }]}>
                      {formatCurrency(totalAmount)}
                    </Text>
                  </View>
                  <View style={styles.discountBreakdownRow}>
                    <Text style={[styles.discountBreakdownLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                      Discount
                    </Text>
                    <Text style={[styles.discountBreakdownDiscount, { color: paperTheme.colors.error }]}>
                      − {formatCurrency(discountPreview.discountAmount)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.discountBreakdownDivider,
                      { backgroundColor: paperTheme.colors.outlineVariant },
                    ]}
                  />
                  <View style={styles.discountBreakdownRow}>
                    <Text style={[styles.discountBreakdownTotalLabel, { color: paperTheme.colors.onSurface }]}>
                      Checkout total
                    </Text>
                    <Text style={[styles.discountBreakdownTotalValue, { color: paperTheme.colors.primary }]}>
                      {formatCurrency(discountPreview.checkoutTotal)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.checkout,
            {
              backgroundColor:
                items.length > 0 ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant,
              opacity: checkoutLoading ? 0.75 : 1,
            },
            items.length > 0 ? softShadow(resolvedTheme) : null,
          ]}
          disabled={items.length === 0 || checkoutLoading}
          onPress={() => {
            void handleCheckout();
          }}
        >
          {checkoutLoading ? (
            <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
          ) : (
            <>
              <View style={styles.checkoutLeft}>
                <Text
                  style={[
                    styles.checkoutText,
                    {
                      color:
                        items.length > 0
                          ? paperTheme.colors.onPrimary
                          : paperTheme.colors.onSurfaceDisabled,
                    },
                  ]}
                >
                  Checkout
                </Text>
                {items.length > 0 ? (
                  <Text style={[styles.checkoutSub, { color: paperTheme.colors.onPrimary }]}>
                    {formatCurrency(
                      discountEnabled && discountPreview.discountAmount > 0
                        ? discountPreview.checkoutTotal
                        : totalAmount,
                    )}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.checkoutArrow,
                  {
                    backgroundColor:
                      items.length > 0
                        ? `${paperTheme.colors.onPrimary}22`
                        : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={
                    items.length > 0 ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceDisabled
                  }
                />
              </View>
            </>
          )}
        </TouchableOpacity>

        <Modal
          visible={addedModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeAddedModal}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeAddedModal}
          >
            <View
              style={[styles.modalSheet, { backgroundColor: paperTheme.colors.surface }]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>
                Added carts
              </Text>
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {shopAddedSessions.length === 0 ? (
                  <Text style={[styles.modalEmpty, { color: paperTheme.colors.onSurfaceVariant }]}>
                    No added carts yet.
                  </Text>
                ) : (
                  shopAddedSessions.map((session) => {
                    const orderNumber = getCartNumberForSession(shopAddedSessions, session.sessionId);
                    const isSelected = sessionId === session.sessionId;
                    const isManaging = manageLoadingSessionId === session.sessionId;
                    return (
                      <View
                        key={session.sessionId}
                        style={[
                          styles.modalCartCard,
                          {
                            borderColor: paperTheme.colors.outline,
                            backgroundColor: isSelected
                              ? paperTheme.colors.primaryContainer
                              : paperTheme.colors.surfaceVariant,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.modalCartBody}
                          onPress={() => {
                            void handleSelectAddedSession(session);
                          }}
                        >
                          <Text style={[styles.modalCartTitle, { color: paperTheme.colors.onSurface }]}>
                            Order #{orderNumber ?? '—'}
                          </Text>
                          <Text
                            style={[styles.modalCartMeta, { color: paperTheme.colors.onSurfaceVariant }]}
                          >
                            {session.itemCount} item{session.itemCount === 1 ? '' : 's'} · Rs.{' '}
                            {session.totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.modalCartActions}>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Move order back to pending"
                            disabled={Boolean(manageLoadingSessionId)}
                            onPress={() => {
                              void handleGoBackToPending(session.sessionId);
                            }}
                            style={[
                              styles.modalActionBtn,
                              { backgroundColor: paperTheme.colors.secondaryContainer },
                            ]}
                          >
                            {isManaging ? (
                              <ActivityIndicator
                                size="small"
                                color={paperTheme.colors.onSecondaryContainer}
                              />
                            ) : (
                              <>
                                <Ionicons
                                  name="arrow-undo-outline"
                                  size={16}
                                  color={paperTheme.colors.onSecondaryContainer}
                                />
                                <Text
                                  style={[
                                    styles.modalActionText,
                                    { color: paperTheme.colors.onSecondaryContainer },
                                  ]}
                                >
                                  Go back
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Delete order"
                            disabled={Boolean(manageLoadingSessionId)}
                            onPress={() => {
                              void handleDeleteAddedCart(session.sessionId);
                            }}
                            style={[
                              styles.modalDeleteBtn,
                              { backgroundColor: paperTheme.colors.errorContainer },
                            ]}
                          >
                            <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: paperTheme.colors.secondaryContainer }]}
                onPress={closeAddedModal}
              >
                <Text style={[styles.modalCloseText, { color: paperTheme.colors.onSecondaryContainer }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 26,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 2,
  },
  addedBadgeCount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
    minWidth: 16,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginBottom: 8,
  },
  summaryCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  summaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  summarySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    opacity: 0.85,
    marginTop: 1,
  },
  summaryTotal: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginBottom: 16,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
    marginTop: 16,
  },
  emptySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  discountCard: {
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  discountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  discountTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  discountTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  discountBody: {
    gap: 10,
  },
  discountLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  discountModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  discountModeChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountModeChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  discountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 6,
  },
  discountInputPrefix: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  discountInputSuffix: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  discountInput: {
    flex: 1,
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    paddingVertical: 10,
  },
  discountBreakdown: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginTop: 2,
  },
  discountBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  discountBreakdownLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  discountBreakdownValue: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
  },
  discountBreakdownDiscount: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  discountBreakdownDivider: {
    height: StyleSheet.hairlineWidth,
  },
  discountBreakdownTotalLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  discountBreakdownTotalValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  itemCard: {
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
  },
  itemAccent: {
    width: 4,
  },
  itemContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingLeft: 10,
    gap: 12,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemBody: { flex: 1, minWidth: 0, gap: 6 },
  itemName: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15, lineHeight: 20 },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemMeta: { fontFamily: fonts.PoppinsRegular, fontSize: 11 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 9,
  },
  lineTotal: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
    flexShrink: 0,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 2,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnAdd: {},
  qtyValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    minWidth: 22,
    textAlign: 'center',
  },
  itemDeleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginBottom: 8,
  },
  checkoutLeft: { gap: 2 },
  checkoutText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  checkoutSub: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    opacity: 0.9,
  },
  checkoutArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalSheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  modalTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 420,
  },
  modalEmpty: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    paddingVertical: 12,
  },
  modalCartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  modalCartBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  modalCartTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  modalCartMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  modalCartActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 92,
    justifyContent: 'center',
  },
  modalActionText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  modalDeleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
});

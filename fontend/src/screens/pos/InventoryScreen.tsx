import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
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
import { useCommonAlert } from '../../hooks/useCommonAlert';
import { fetchCategories_Service } from '../../services/CategoryService';
import {
  addProductToPendingCart_Service,
  createNewPendingCart_Service,
  deleteAddedCartSession_Service,
  fetchCartItems_Service,
  fetchPendingCartSessions_Service,
  proceedCartSession_Service,
  removePendingCartItem_Service,
  updatePendingCartItemQuantity_Service,
} from '../../services/CartService';
import { fetchProducts_Service } from '../../services/ProductService';
import { setActiveSession } from '../../store/reducers/CartReducer';
import { AppDispatch, RootState } from '../../store/store';
import { CartSessionSummary } from '../../type/cart';
import { Category } from '../../type/category';
import { getProductCategoryId, Product } from '../../type/product';
import { cardShadow } from '../settings/shared/settingsDetailStyles';
import { inventoryUi, softShadow } from './ManageInventory/inventoryUiStyles';
import { handleSessionExpiredApiError } from '../../utils/apiErrorAlert';
import { getCartOrderItemKey } from '../../utils/cartOrder';
import { getCartNumberForSession } from '../../utils/cartSession';
import { devLog } from '../../utils/devLog';
import { getStockLimitToastMessage, isAtProductStockLimit } from '../../utils/productStock';
import { resolveProductImageUri } from '../../utils/productImage';
import CommonAlert from '../../components/CommonAlert/CommonAlert';
import SlideToast from '../../components/SlideToast/SlideToast';
import BarcodeScannerModal from './ManageInventory/BarcodeScannerModal';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Products'>;

function getCategoryColor(categories: Category[], product: Product): string {
  const categoryId = getProductCategoryId(product);
  return categories.find((entry) => entry._id === categoryId)?.colorCode ?? '#64748b';
}

function formatAmount(amount: number | null): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function thunkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function SkeletonBone({
  width,
  height,
  borderRadius = 8,
  style,
  color,
  opacity,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
  color: string;
  opacity: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
}

function InventoryCatalogSkeleton({
  boneColor,
  cardColor,
  accentColor,
  count = 6,
}: {
  boneColor: string;
  cardColor: string;
  accentColor: string;
  count?: number;
}) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.productList}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`inventory-skeleton-${index}`}
          style={[styles.productCard, { backgroundColor: cardColor }, styles.skeletonCardSpacing]}
        >
          <View style={[styles.productAccent, { backgroundColor: accentColor }]} />
          <View style={styles.productRow}>
            <SkeletonBone width={48} height={48} borderRadius={14} color={boneColor} opacity={pulse} />
            <View style={styles.productBody}>
              <View style={styles.productTitleRow}>
                <SkeletonBone width="58%" height={14} borderRadius={7} color={boneColor} opacity={pulse} />
                <SkeletonBone width={72} height={22} borderRadius={11} color={boneColor} opacity={pulse} />
              </View>
              <View style={[styles.metaRow, { marginTop: 8 }]}>
                <SkeletonBone width="42%" height={11} borderRadius={6} color={boneColor} opacity={pulse} />
                <SkeletonBone width={64} height={18} borderRadius={9} color={boneColor} opacity={pulse} />
              </View>
            </View>
            <SkeletonBone width={40} height={40} borderRadius={14} color={boneColor} opacity={pulse} />
          </View>
        </View>
      ))}
    </View>
  );
}

function CategoryFilterSkeleton({
  boneColor,
  fieldLabelColor,
}: {
  boneColor: string;
  fieldLabelColor: string;
}) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.categoryFilterBlock}>
      <Text style={[inventoryUi.fieldLabel, { color: fieldLabelColor }]}>Category</Text>
      <SkeletonBone width="100%" height={46} borderRadius={14} color={boneColor} opacity={pulse} />
    </View>
  );
}

export default function ProductsScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const {
    items: categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useSelector((state: RootState) => state.CategoryReducer.list);
  const {
    items: products,
    loading: productsLoading,
    error: productsError,
  } = useSelector((state: RootState) => state.ProductReducer.list);
  const {
    items: pendingSessions,
    loading: pendingSessionsLoading,
  } = useSelector((state: RootState) => state.CartReducer.pendingSessions);
  const activeSession = useSelector((state: RootState) => state.CartReducer.activeSession);
  const {
    order: reviewOrder,
    loading: reviewItemsLoading,
    sessionId: reviewSessionId,
  } = useSelector((state: RootState) => state.CartReducer.sessionItems);
  const { loading: addToCartLoading } = useSelector((state: RootState) => state.CartReducer.addToCart);
  const { loading: proceedLoading } = useSelector((state: RootState) => state.CartReducer.proceed);
  const { loadingSessionId: manageLoadingSessionId } = useSelector(
    (state: RootState) => state.CartReducer.manageAdded,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [nameSearchQuery, setNameSearchQuery] = useState('');
  const [barcodeSearchQuery, setBarcodeSearchQuery] = useState('');
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [adjustingProductId, setAdjustingProductId] = useState<string | null>(null);
  const [creatingCart, setCreatingCart] = useState(false);
  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [slideToastMessage, setSlideToastMessage] = useState<string | null>(null);
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const pendingCartCount = pendingSessions.length;

  const showSlideToast = useCallback((message: string) => {
    setSlideToastMessage(message);
  }, []);

  const hideSlideToast = useCallback(() => {
    setSlideToastMessage(null);
  }, []);

  const activeCartQuantities = useMemo(() => {
    if (!activeSession.sessionId || reviewSessionId !== activeSession.sessionId) {
      return {} as Record<string, number>;
    }

    const map: Record<string, number> = {};
    for (const item of reviewOrder?.items ?? []) {
      map[item.productId] = item.quantity;
    }
    return map;
  }, [activeSession.sessionId, reviewOrder?.items, reviewSessionId]);

  const refreshActiveCartItems = useCallback(async () => {
    if (!activeSession.sessionId) return;

    try {
      await dispatch(
        fetchCartItems_Service({
          sessionId: activeSession.sessionId,
          status: 'pending',
        }),
      ).unwrap();
    } catch (err: unknown) {
      devLog('Refresh active cart items:', err);
    }
  }, [activeSession.sessionId, dispatch]);

  const filteredProducts = useMemo(() => {
    let list = products;

    if (selectedCategoryId !== null) {
      list = list.filter((product) => getProductCategoryId(product) === selectedCategoryId);
    }

    const nameQuery = nameSearchQuery.trim().toLowerCase();
    if (nameQuery) {
      list = list.filter((product) => {
        const categoryName = (product.categoryName ?? '').toLowerCase();
        return (
          product.productName.toLowerCase().includes(nameQuery) ||
          categoryName.includes(nameQuery)
        );
      });
    }

    const barcodeQuery = barcodeSearchQuery.replace(/\s+/g, '').trim().toLowerCase();
    if (barcodeQuery) {
      list = list.filter((product) => {
        const barcode = (product.barcode ?? '').replace(/\s+/g, '').toLowerCase();
        return barcode.includes(barcodeQuery);
      });
    }

    return list;
  }, [products, selectedCategoryId, nameSearchQuery, barcodeSearchQuery]);

  const openBarcodeScanner = useCallback(() => {
    Keyboard.dismiss();
    setBarcodeScannerVisible(true);
  }, []);

  const handleBarcodeScanned = useCallback((code: string) => {
    setBarcodeSearchQuery(code);
    setBarcodeScannerVisible(false);
  }, []);

  const clearBarcodeSearch = useCallback(() => {
    setBarcodeSearchQuery('');
    Keyboard.dismiss();
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchCategories_Service()).unwrap(),
        dispatch(fetchProducts_Service()).unwrap(),
        dispatch(fetchPendingCartSessions_Service()).unwrap(),
      ]);
      await refreshActiveCartItems();
    } catch (err: unknown) {
      devLog('Products tab load:', err);

      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      show_Alert('error', 'Error', thunkErrorMessage(err, 'Failed to load products'), 1, true, 'OK');
    }
  }, [dispatch, refreshActiveCartItems, show_Alert]);

  const getProductCartQuantity = useCallback(
    (productId: string) => activeCartQuantities[productId] ?? 0,
    [activeCartQuantities],
  );

  const handleAddProductToCart = useCallback(
    async (product: Product, quantity = 1, forceNewCart = false, showToast = true) => {
      if (quantity < 1 || addToCartLoading) return;

      setAddingProductId(product._id);
      try {
        const result = await dispatch(
          addProductToPendingCart_Service({
            productId: product._id,
            quantity,
            forceNewCart,
          }),
        ).unwrap();

        if (showToast) {
          showSlideToast(`Added to Cart #${result.cartNumber}`);
        }
      } catch (err: unknown) {
        devLog('Add to pending cart:', err);

        const handled = await handleSessionExpiredApiError(err, show_Alert);
        if (handled) return;

        show_Alert(
          'error',
          'Error',
          thunkErrorMessage(err, 'Could not add item to cart'),
          1,
          true,
          'OK',
        );
      } finally {
        setAddingProductId(null);
      }
    },
    [addToCartLoading, dispatch, showSlideToast, show_Alert],
  );

  const handleAdjustProductQuantity = useCallback(
    async (product: Product, delta: number) => {
      if (addToCartLoading || adjustingProductId) return;

      const currentQty = getProductCartQuantity(product._id);
      const sessionId = activeSession.sessionId;

      if (delta > 0) {
        if (product.isInventoryAvailable && (product.qty ?? 0) <= 0) {
          showSlideToast(`${product.productName} is out of stock`);
          return;
        }

        const stockLimitMessage = getStockLimitToastMessage(product, currentQty);
        if (stockLimitMessage) {
          showSlideToast(stockLimitMessage);
          return;
        }

        const nextQty = currentQty + 1;
        const forceNewCart = currentQty === 0 && !sessionId;
        await handleAddProductToCart(product, nextQty, forceNewCart, currentQty === 0);
        return;
      }

      if (currentQty <= 0 || !sessionId) return;

      setAdjustingProductId(product._id);
      try {
        if (currentQty <= 1) {
          await dispatch(
            removePendingCartItem_Service({
              sessionId,
              productId: product._id,
            }),
          ).unwrap();
        } else {
          await dispatch(
            updatePendingCartItemQuantity_Service({
              sessionId,
              productId: product._id,
              quantity: currentQty - 1,
            }),
          ).unwrap();
        }
      } catch (err: unknown) {
        devLog('Adjust cart quantity:', err);

        const handled = await handleSessionExpiredApiError(err, show_Alert);
        if (handled) return;

        show_Alert(
          'error',
          'Error',
          thunkErrorMessage(err, 'Could not update cart item'),
          1,
          true,
          'OK',
        );
      } finally {
        setAdjustingProductId(null);
      }
    },
    [
      activeSession.sessionId,
      addToCartLoading,
      adjustingProductId,
      dispatch,
      getProductCartQuantity,
      handleAddProductToCart,
      showSlideToast,
      show_Alert,
    ],
  );

  const handleCreateNewCart = useCallback(async () => {
    if (creatingCart || addToCartLoading) return;

    setCreatingCart(true);
    try {
      const session = await dispatch(createNewPendingCart_Service()).unwrap();
      showSlideToast(`Cart #${session.cartNumber} is ready`);
    } catch (err: unknown) {
      devLog('Create new cart:', err);

      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Error',
        thunkErrorMessage(err, 'Could not create a new cart'),
        1,
        true,
        'OK',
      );
    } finally {
      setCreatingCart(false);
    }
  }, [addToCartLoading, creatingCart, dispatch, showSlideToast, show_Alert]);

  const closeCategoryDropdown = useCallback(() => {
    setCategoryDropdownVisible(false);
  }, []);

  const handleSelectCategory = useCallback(
    (categoryId: string | null) => {
      setSelectedCategoryId(categoryId);
      closeCategoryDropdown();
    },
    [closeCategoryDropdown],
  );

  const openPendingModal = useCallback(async () => {
    setPendingModalVisible(true);
    try {
      await dispatch(fetchPendingCartSessions_Service()).unwrap();
    } catch (err: unknown) {
      devLog('Load pending carts:', err);

      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Error',
        thunkErrorMessage(err, 'Could not load pending carts'),
        1,
        true,
        'OK',
      );
    }
  }, [dispatch, show_Alert]);

  const closePendingModal = useCallback(() => {
    setPendingModalVisible(false);
  }, []);

  const handleReviewPendingSession = useCallback(
    (session: CartSessionSummary) => {
      void dispatch(
        fetchCartItems_Service({
          sessionId: session.sessionId,
          status: 'pending',
        }),
      );
    },
    [dispatch],
  );

  const handleResumePendingSession = useCallback(
    (session: CartSessionSummary) => {
      const cartNumber =
        session.cartNumber ?? getCartNumberForSession(pendingSessions, session.sessionId);
      dispatch(
        setActiveSession({
          sessionId: session.sessionId,
          cartNumber,
        }),
      );
      void dispatch(
        fetchCartItems_Service({
          sessionId: session.sessionId,
          status: 'pending',
        }),
      );
      closePendingModal();
    },
    [closePendingModal, dispatch, pendingSessions],
  );

  const handleProceedPendingSession = useCallback(
    async (session: CartSessionSummary) => {
      try {
        await dispatch(proceedCartSession_Service(session.sessionId)).unwrap();
        closePendingModal();
        navigation.navigate('Cart');
      } catch (err: unknown) {
        devLog('Proceed pending cart:', err);
        show_Alert(
          'error',
          'Error',
          thunkErrorMessage(err, 'Could not proceed with this order'),
          1,
          true,
          'OK',
        );
      }
    },
    [closePendingModal, dispatch, navigation, show_Alert],
  );

  const handleDeletePendingSession = useCallback(
    async (targetSessionId: string) => {
      if (manageLoadingSessionId) return;

      const cartNumber = getCartNumberForSession(pendingSessions, targetSessionId);

      try {
        await dispatch(deleteAddedCartSession_Service(targetSessionId)).unwrap();
        showSlideToast(
          cartNumber != null ? `Cart #${cartNumber} deleted` : 'Cart deleted',
        );
      } catch (err: unknown) {
        devLog('Delete pending cart:', err);

        const handled = await handleSessionExpiredApiError(err, show_Alert);
        if (handled) return;

        show_Alert(
          'error',
          'Error',
          thunkErrorMessage(err, 'Could not delete this cart'),
          1,
          true,
          'OK',
        );
      }
    },
    [dispatch, manageLoadingSessionId, pendingSessions, showSlideToast, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCatalog();
    }, [loadCatalog]),
  );

  useEffect(() => {
    void refreshActiveCartItems();
  }, [activeSession.sessionId, refreshActiveCartItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCatalog();
    } finally {
      setRefreshing(false);
    }
  }, [loadCatalog]);

  const isAllSelected = selectedCategoryId === null;
  const selectedCategory = useMemo(
    () => categories.find((entry) => entry._id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );
  const isInitialLoading =
    (categoriesLoading || productsLoading) && !refreshing && products.length === 0;

  const renderProductRow = ({ item }: { item: Product }) => {
    const imageUri = resolveProductImageUri(item.image);
    const cartQuantity = getProductCartQuantity(item._id);
    const isAdjusting = adjustingProductId === item._id || addingProductId === item._id;
    const atStockLimit = isAtProductStockLimit(item, cartQuantity);
    const categoryColor = getCategoryColor(categories, item);
    const isService = item.type === 'service';
    const isOutOfStock = item.isInventoryAvailable === true && (item.qty ?? 0) <= 0;
    const categoryLabel =
      item.categoryName ||
      categories.find((entry) => entry._id === getProductCategoryId(item))?.name ||
      'Uncategorized';

    return (
      <View
        style={[
          styles.productCard,
          {
            backgroundColor: isOutOfStock
              ? resolvedTheme === 'dark'
                ? '#3f1d1d'
                : '#fef2f2'
              : paperTheme.colors.surface,
            borderWidth: isOutOfStock ? 1 : 0,
            borderColor: isOutOfStock ? `${paperTheme.colors.error}55` : 'transparent',
            opacity: isOutOfStock ? 0.72 : 1,
          },
          cardShadow(resolvedTheme),
        ]}
        pointerEvents={isOutOfStock ? 'none' : 'auto'}
      >
        <View
          style={[
            styles.productAccent,
            {
              backgroundColor: isOutOfStock ? paperTheme.colors.error : categoryColor,
            },
          ]}
        />
        <View style={styles.productRow}>
          <View style={styles.thumbWrap}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={[styles.thumb, isOutOfStock ? styles.thumbDimmed : null]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.thumbPlaceholder,
                  {
                    backgroundColor: isOutOfStock
                      ? `${paperTheme.colors.error}14`
                      : `${categoryColor}18`,
                  },
                ]}
              >
                <Ionicons
                  name={isOutOfStock ? 'alert-circle-outline' : 'cube-outline'}
                  size={18}
                  color={isOutOfStock ? paperTheme.colors.error : categoryColor}
                />
              </View>
            )}
            {item.isInventoryAvailable ? (
              <View
                style={[
                  styles.stockBadge,
                  {
                    backgroundColor:
                      (item.qty ?? 0) <= 0 ? paperTheme.colors.error : '#15803d',
                    borderColor: paperTheme.colors.surface,
                  },
                ]}
              >
                <Text style={styles.stockBadgeText}>{item.qty ?? 0}</Text>
              </View>
            ) : null}
            {cartQuantity > 0 && !isOutOfStock ? (
              <View style={[styles.cartBadge, { backgroundColor: paperTheme.colors.primary, borderColor: paperTheme.colors.surface }]}>
                <Text style={[styles.cartBadgeText, { color: paperTheme.colors.onPrimary }]}>{cartQuantity}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.productBody}>
            <View style={styles.productTitleRow}>
              <Text
                style={[
                  styles.productName,
                  {
                    color: isOutOfStock
                      ? paperTheme.colors.onSurfaceVariant
                      : paperTheme.colors.onSurface,
                  },
                ]}
                numberOfLines={1}
              >
                {item.productName}
              </Text>
              <View
                style={[
                  styles.pricePill,
                  {
                    backgroundColor: isOutOfStock
                      ? `${paperTheme.colors.error}14`
                      : paperTheme.colors.primaryContainer,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priceText,
                    {
                      color: isOutOfStock
                        ? paperTheme.colors.error
                        : paperTheme.colors.primary,
                    },
                  ]}
                >
                  {formatAmount(item.amount)}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.categoryRow}>
                <View
                  style={[
                    styles.categoryDot,
                    {
                      backgroundColor: isOutOfStock
                        ? paperTheme.colors.error
                        : categoryColor,
                    },
                  ]}
                />
                <Text style={[styles.categoryLabel, { color: paperTheme.colors.onSurfaceVariant }]} numberOfLines={1}>
                  {categoryLabel}
                </Text>
              </View>
              {isOutOfStock ? (
                <View
                  style={[
                    styles.metaChip,
                    styles.outOfStockChip,
                    { backgroundColor: `${paperTheme.colors.error}18` },
                  ]}
                >
                  <Ionicons name="ban-outline" size={10} color={paperTheme.colors.error} />
                  <Text style={[styles.metaChipText, { color: paperTheme.colors.error }]}>
                    Out of stock
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.metaChip,
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
                    color={isService ? paperTheme.colors.tertiary : paperTheme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.metaChipText,
                      {
                        color: isService ? paperTheme.colors.tertiary : paperTheme.colors.primary,
                      },
                    ]}
                  >
                    {isService ? 'Service' : 'Product'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.productActions}>
            {isOutOfStock ? (
              <View
                style={[
                  styles.disabledAddBtn,
                  {
                    backgroundColor: `${paperTheme.colors.error}14`,
                    borderColor: `${paperTheme.colors.error}33`,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={paperTheme.colors.error} />
              </View>
            ) : isAdjusting ? (
              <ActivityIndicator size="small" color={paperTheme.colors.primary} />
            ) : cartQuantity === 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.productName} to cart`}
                onPress={() => {
                  void handleAdjustProductQuantity(item, 1);
                }}
                disabled={addToCartLoading}
                style={[
                  styles.quickAddBtn,
                  { backgroundColor: paperTheme.colors.primary },
                  softShadow(resolvedTheme),
                ]}
              >
                <Ionicons name="add" size={20} color={paperTheme.colors.onPrimary} />
              </TouchableOpacity>
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
                  accessibilityLabel={`Decrease ${item.productName} quantity`}
                  onPress={() => {
                    void handleAdjustProductQuantity(item, -1);
                  }}
                  disabled={cartQuantity <= 0 || addToCartLoading}
                  style={[
                    styles.qtyBtn,
                    { opacity: cartQuantity <= 0 ? 0.35 : 1 },
                  ]}
                >
                  <Ionicons name="remove" size={13} color={paperTheme.colors.onSurface} />
                </TouchableOpacity>
                <Text style={[styles.qtyValue, { color: paperTheme.colors.onSurface }]}>{cartQuantity}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Increase ${item.productName} quantity`}
                  onPress={() => {
                    void handleAdjustProductQuantity(item, 1);
                  }}
                  disabled={addToCartLoading || atStockLimit}
                  style={[
                    styles.qtyBtn,
                    styles.qtyBtnAdd,
                    {
                      backgroundColor: paperTheme.colors.primary,
                      opacity: atStockLimit ? 0.65 : 1,
                    },
                  ]}
                >
                  <Ionicons name="add" size={13} color={paperTheme.colors.onPrimary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

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
          durationMs={700}
        />

        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>Products</Text>
              <Text style={[styles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
                Tap + to add items to your active cart
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="View pending carts"
              onPress={() => {
                void openPendingModal();
              }}
              style={[
                styles.cartFab,
                { backgroundColor: paperTheme.colors.primary },
                softShadow(resolvedTheme),
              ]}
            >
              <Ionicons name="cart-outline" size={20} color={paperTheme.colors.onPrimary} />
              {pendingSessionsLoading ? (
                <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
              ) : pendingCartCount > 0 ? (
                <View style={[styles.cartFabBadge, { backgroundColor: paperTheme.colors.error }]}>
                  <Text style={styles.cartFabBadgeText}>{pendingCartCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <Pressable onPress={Keyboard.dismiss}>
            <View
              style={[
                styles.summaryStrip,
                { backgroundColor: paperTheme.colors.surface },
                cardShadow(resolvedTheme),
              ]}
            >
              <View style={styles.summaryItem}>
                <View style={[inventoryUi.statIconWrap, { backgroundColor: `${paperTheme.colors.primary}16` }]}>
                  <Ionicons name="options-outline" size={14} color={paperTheme.colors.primary} />
                </View>
                <Text style={[styles.summaryValue, { color: paperTheme.colors.onSurface }]}>
                  {filteredProducts.length}
                </Text>
                <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Showing</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: paperTheme.colors.outlineVariant }]} />
              <View style={styles.summaryItem}>
                <View style={[inventoryUi.statIconWrap, { backgroundColor: `${paperTheme.colors.secondary}22` }]}>
                  <Ionicons name="layers-outline" size={14} color={paperTheme.colors.secondary} />
                </View>
                <Text style={[styles.summaryValue, { color: paperTheme.colors.onSurface }]}>{products.length}</Text>
                <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Total</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: paperTheme.colors.outlineVariant }]} />
              <View style={styles.summaryItem}>
                <View style={[inventoryUi.statIconWrap, { backgroundColor: `${paperTheme.colors.tertiary}22` }]}>
                  <Ionicons name="cart-outline" size={14} color={paperTheme.colors.tertiary} />
                </View>
                <Text style={[styles.summaryValue, { color: paperTheme.colors.onSurface }]}>{pendingCartCount}</Text>
                <Text style={[styles.summaryLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Pending</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {categoriesError ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{categoriesError}</Text>
        ) : null}
        {productsError ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{productsError}</Text>
        ) : null}

        <View
          style={[
            styles.filtersCard,
            { backgroundColor: paperTheme.colors.surface },
            cardShadow(resolvedTheme),
          ]}
        >
          <View style={styles.searchTopRow}>
            <View
              style={[
                styles.searchWrap,
                styles.searchWrapFlex,
                { backgroundColor: paperTheme.colors.surfaceVariant },
              ]}
            >
              <Ionicons name="search-outline" size={18} color={paperTheme.colors.onSurfaceVariant} />
              <TextInput
                value={nameSearchQuery}
                onChangeText={setNameSearchQuery}
                placeholder="Search name or category…"
                placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                style={[styles.searchInput, { color: paperTheme.colors.onSurface }]}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {nameSearchQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setNameSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color={paperTheme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[
                styles.scanBtn,
                { backgroundColor: paperTheme.colors.primary },
                softShadow(resolvedTheme),
              ]}
              onPress={openBarcodeScanner}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Scan barcode"
            >
              <Ionicons name="scan" size={20} color={paperTheme.colors.onPrimary} />
            </TouchableOpacity>
          </View>

          {barcodeSearchQuery.length > 0 ? (
            <View
              style={[
                styles.barcodeChip,
                {
                  backgroundColor: paperTheme.colors.primaryContainer,
                  borderColor: `${paperTheme.colors.primary}33`,
                },
              ]}
            >
              <Ionicons name="barcode-outline" size={15} color={paperTheme.colors.primary} />
              <Text
                style={[styles.barcodeChipText, { color: paperTheme.colors.onPrimaryContainer }]}
                numberOfLines={1}
              >
                {barcodeSearchQuery}
              </Text>
              <TouchableOpacity
                onPress={clearBarcodeSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear scanned barcode"
              >
                <Ionicons name="close-circle" size={18} color={paperTheme.colors.onPrimaryContainer} />
              </TouchableOpacity>
            </View>
          ) : null}

          {categoriesLoading && !refreshing && categories.length === 0 ? (
            <CategoryFilterSkeleton
              boneColor={paperTheme.colors.surfaceVariant}
              fieldLabelColor={paperTheme.colors.onSurfaceVariant}
            />
          ) : (
            <View style={styles.categoryFilterBlock}>
              <Text style={[inventoryUi.fieldLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Category
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Filter by category"
                onPress={() => setCategoryDropdownVisible(true)}
                activeOpacity={0.85}
                style={[
                  styles.categoryDropdown,
                  { backgroundColor: paperTheme.colors.surfaceVariant },
                ]}
              >
                {selectedCategory ? (
                  <View style={styles.categoryDropdownInner}>
                    <View style={[styles.categoryDot, { backgroundColor: selectedCategory.colorCode }]} />
                    <Text
                      style={[styles.categoryDropdownText, { color: paperTheme.colors.onSurface }]}
                      numberOfLines={1}
                    >
                      {selectedCategory.name}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.categoryDropdownInner}>
                    <Ionicons name="grid-outline" size={16} color={paperTheme.colors.primary} />
                    <Text
                      style={[styles.categoryDropdownText, { color: paperTheme.colors.onSurface }]}
                      numberOfLines={1}
                    >
                      All categories
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-down" size={18} color={paperTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
              {categories.length === 0 && !categoriesLoading ? (
                <Text style={[styles.emptyCategories, { color: paperTheme.colors.onSurfaceVariant }]}>
                  No categories yet.
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {activeSession.sessionId && activeSession.cartNumber ? (
          <View
            style={[
              styles.activeCartBanner,
              { backgroundColor: paperTheme.colors.primaryContainer },
              cardShadow(resolvedTheme),
            ]}
          >
            <View style={[styles.activeCartIconWrap, { backgroundColor: paperTheme.colors.primary }]}>
              <Ionicons name="cart" size={16} color={paperTheme.colors.onPrimary} />
            </View>
            <View style={styles.activeCartTextBlock}>
              <Text style={[styles.activeCartTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
                Cart #{activeSession.cartNumber} selected
              </Text>
              <Text style={[styles.activeCartText, { color: paperTheme.colors.onPrimaryContainer }]}>
                Use + / − on products to adjust quantities
              </Text>
            </View>
          </View>
        ) : null}

        <Text
          style={[
            inventoryUi.sectionEyebrow,
            styles.listHeader,
            { color: paperTheme.colors.onSurfaceVariant },
          ]}
        >
          Catalog
        </Text>

        {isInitialLoading ? (
          <InventoryCatalogSkeleton
            boneColor={paperTheme.colors.surfaceVariant}
            cardColor={paperTheme.colors.surface}
            accentColor={`${paperTheme.colors.primary}55`}
          />
        ) : (
          <FlatList
            style={styles.productList}
            data={filteredProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProductRow}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={paperTheme.colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Ionicons name="cube-outline" size={40} color={paperTheme.colors.outline} />
                <Text style={[styles.emptyListTitle, { color: paperTheme.colors.onSurface }]}>
                  No products match
                </Text>
                <Text style={[styles.emptyListBody, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {products.length === 0
                    ? 'Add products from Manage Inventory to see them here.'
                    : 'Try another category, name search, or scan a different barcode.'}
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        <Modal
          visible={categoryDropdownVisible}
          animationType="slide"
          transparent
          onRequestClose={closeCategoryDropdown}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeCategoryDropdown}
          >
            <View
              style={[styles.modalSheet, { backgroundColor: paperTheme.colors.surface }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={[styles.modalHandle, { backgroundColor: paperTheme.colors.outlineVariant }]} />
              <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>Filter by category</Text>
              <ScrollView style={styles.categoryModalList} keyboardShouldPersistTaps="handled">
                <TouchableOpacity
                  style={[
                    styles.categoryOptionRow,
                    { borderBottomColor: paperTheme.colors.outlineVariant },
                    isAllSelected && { backgroundColor: paperTheme.colors.primaryContainer },
                  ]}
                  onPress={() => handleSelectCategory(null)}
                >
                  <Ionicons name="grid-outline" size={18} color={paperTheme.colors.primary} />
                  <Text style={[styles.categoryOptionText, { color: paperTheme.colors.onSurface }]}>
                    All categories
                  </Text>
                  {isAllSelected ? (
                    <Ionicons name="checkmark" size={20} color={paperTheme.colors.primary} />
                  ) : null}
                </TouchableOpacity>

                {categories.map((item) => {
                  const selected = selectedCategoryId === item._id;
                  return (
                    <TouchableOpacity
                      key={item._id}
                      style={[
                        styles.categoryOptionRow,
                        { borderBottomColor: paperTheme.colors.outlineVariant },
                        selected && { backgroundColor: paperTheme.colors.primaryContainer },
                      ]}
                      onPress={() => handleSelectCategory(item._id)}
                    >
                      <View style={[styles.categoryDot, { backgroundColor: item.colorCode }]} />
                      <Text
                        style={[styles.categoryOptionText, { color: paperTheme.colors.onSurface }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={20} color={paperTheme.colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: paperTheme.colors.secondaryContainer }]}
                onPress={closeCategoryDropdown}
              >
                <Text style={[styles.modalCloseText, { color: paperTheme.colors.onSecondaryContainer }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={pendingModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closePendingModal}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closePendingModal}
          >
            <View
              style={[styles.modalSheet, { backgroundColor: paperTheme.colors.surface }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={[styles.modalHandle, { backgroundColor: paperTheme.colors.outlineVariant }]} />
              <View style={styles.modalTitleRow}>
                <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>
                  Pending carts
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Create new cart"
                  disabled={creatingCart || addToCartLoading}
                  onPress={() => {
                    void handleCreateNewCart();
                  }}
                  style={[
                    styles.modalNewCartBtn,
                    {
                      backgroundColor: paperTheme.colors.primary,
                      opacity: creatingCart || addToCartLoading ? 0.7 : 1,
                    },
                  ]}
                >
                  {creatingCart ? (
                    <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
                  ) : (
                    <Ionicons name="add" size={20} color={paperTheme.colors.onPrimary} />
                  )}
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {pendingSessions.length === 0 ? (
                  <Text style={[styles.modalEmpty, { color: paperTheme.colors.onSurfaceVariant }]}>
                    No pending carts yet. Tap + to create one.
                  </Text>
                ) : (
                  pendingSessions.map((session) => {
                    const cartNumber =
                      session.cartNumber ?? getCartNumberForSession(pendingSessions, session.sessionId);
                    const isActive = activeSession.sessionId === session.sessionId;
                    const isReviewing = reviewSessionId === session.sessionId;
                    const isManaging = manageLoadingSessionId === session.sessionId;
                    return (
                      <View
                        key={session.sessionId}
                        style={[
                          styles.modalCartCard,
                          {
                            borderColor: isActive ? paperTheme.colors.primary : paperTheme.colors.outline,
                            backgroundColor: isReviewing
                              ? paperTheme.colors.primaryContainer
                              : isActive
                                ? `${paperTheme.colors.primary}12`
                                : paperTheme.colors.surfaceVariant,
                          },
                        ]}
                      >
                        <View style={styles.modalCartHeaderRow}>
                          <TouchableOpacity
                            style={styles.modalCartBody}
                            onPress={() => handleReviewPendingSession(session)}
                          >
                            <View style={styles.modalCartTitleRow}>
                              <Text style={[styles.modalCartTitle, { color: paperTheme.colors.onSurface }]}>
                                Cart #{cartNumber ?? '—'}
                              </Text>
                              {isActive ? (
                                <View
                                  style={[
                                    styles.activeCartPill,
                                    { backgroundColor: paperTheme.colors.primary },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.activeCartPillText,
                                      { color: paperTheme.colors.onPrimary },
                                    ]}
                                  >
                                    Selected
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <Text
                              style={[styles.modalCartMeta, { color: paperTheme.colors.onSurfaceVariant }]}
                            >
                              {session.itemCount} item{session.itemCount === 1 ? '' : 's'} · Rs.{' '}
                              {session.totalAmount.toFixed(2)}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Delete pending cart"
                            disabled={Boolean(manageLoadingSessionId)}
                            onPress={() => {
                              void handleDeletePendingSession(session.sessionId);
                            }}
                            style={[
                              styles.modalDeleteBtn,
                              { backgroundColor: paperTheme.colors.errorContainer },
                            ]}
                          >
                            {isManaging ? (
                              <ActivityIndicator size="small" color={paperTheme.colors.error} />
                            ) : (
                              <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
                            )}
                          </TouchableOpacity>
                        </View>

                        {isReviewing ? (
                          <View style={styles.reviewBlock}>
                            {reviewItemsLoading ? (
                              <ActivityIndicator size="small" color={paperTheme.colors.primary} />
                            ) : (
                              (reviewOrder?.items ?? []).map((item) => (
                                <Text
                                  key={getCartOrderItemKey(item)}
                                  style={[styles.reviewLine, { color: paperTheme.colors.onSurface }]}
                                >
                                  {item.name} × {item.quantity}
                                </Text>
                              ))
                            )}
                          </View>
                        ) : null}

                        <View style={styles.modalActions}>
                          <TouchableOpacity
                            style={[styles.modalActionBtn, { backgroundColor: paperTheme.colors.secondaryContainer }]}
                            onPress={() => handleResumePendingSession(session)}
                          >
                            <Text
                              style={[
                                styles.modalActionText,
                                { color: paperTheme.colors.onSecondaryContainer },
                              ]}
                            >
                              Resume
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.modalActionBtn, { backgroundColor: paperTheme.colors.primary }]}
                            disabled={proceedLoading}
                            onPress={() => {
                              void handleProceedPendingSession(session);
                            }}
                          >
                            {proceedLoading ? (
                              <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
                            ) : (
                              <Text style={[styles.modalActionText, { color: paperTheme.colors.onPrimary }]}>
                                Proceed
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: paperTheme.colors.secondaryContainer }]}
                onPress={closePendingModal}
              >
                <Text style={[styles.modalCloseText, { color: paperTheme.colors.onSecondaryContainer }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {alertConfig && (
          <CommonAlert
            visible={visible}
            type={alertConfig.type}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            positiveButtonText={alertConfig.positiveButtonText}
            negativeButtonText={alertConfig.negativeButtonText}
            onPositivePress={alertConfig.onPositivePress}
            onNegativePress={alertConfig.onNegativePress}
            onClose={hideAlert}
          />
        )}

        <BarcodeScannerModal
          visible={barcodeScannerVisible}
          onClose={() => setBarcodeScannerVisible(false)}
          onScanned={handleBarcodeScanned}
          paperTheme={paperTheme}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
  headerBlock: {
    paddingTop: 4,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
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
  cartFab: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cartFabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartFabBadgeText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 10,
    color: '#fff',
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  summaryValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  summaryLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 44,
    opacity: 0.8,
  },
  filtersCard: {
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  searchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchWrapFlex: { flex: 1 },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    paddingVertical: 0,
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  barcodeChipText: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  activeCartBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  activeCartIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCartTextBlock: { flex: 1, gap: 1 },
  activeCartTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  activeCartText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.9,
  },
  listHeader: {
    marginBottom: 8,
  },
  categoriesLoading: {
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  categoryFilterBlock: {
    gap: 6,
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  categoryDropdownInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  categoryDropdownText: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  categoryModalList: {
    maxHeight: 360,
  },
  categoryOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryOptionText: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 15,
  },
  emptyCategories: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    paddingTop: 2,
  },
  productsLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  productList: { flex: 1 },
  skeletonCardSpacing: { marginBottom: 8 },
  listContent: { paddingBottom: 28, flexGrow: 1 },
  productCard: {
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
  },
  productAccent: {
    width: 4,
  },
  productRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingLeft: 10,
  },
  thumbWrap: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  thumbDimmed: {
    opacity: 0.45,
  },
  thumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(185, 28, 28, 0.25)',
  },
  disabledAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cartBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  stockBadge: {
    position: 'absolute',
    top: -3,
    left: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  stockBadgeText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 9,
    color: '#fff',
  },
  cartBadgeText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 9,
  },
  productBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    lineHeight: 16,
    flex: 1,
  },
  pricePill: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priceText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  metaChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 9,
    flexShrink: 1,
  },
  productActions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 2,
  },
  quickAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnAdd: {},
  qtyValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    minWidth: 18,
    textAlign: 'center',
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyListTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    marginTop: 12,
  },
  emptyListBody: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  errorText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  modalNewCartBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: { maxHeight: 420 },
  modalEmpty: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    paddingVertical: 16,
    textAlign: 'center',
  },
  modalCartCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  modalCartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  modalCartBody: { flex: 1, minWidth: 0 },
  modalDeleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCartTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  modalCartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  activeCartPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeCartPillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
  },
  modalCartMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 3,
  },
  reviewBlock: { gap: 6, marginTop: 4 },
  reviewLine: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalActionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  modalClose: {
    marginTop: 6,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
});

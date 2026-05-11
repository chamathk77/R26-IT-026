import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
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
  deleteAddedCartSession_Service,
  fetchCartItems_Service,
  fetchPendingCartSessions_Service,
  proceedCartSession_Service,
} from '../../services/CartService';
import { fetchProducts_Service } from '../../services/ProductService';
import { setActiveSession } from '../../store/reducers/CartReducer';
import { AppDispatch, RootState } from '../../store/store';
import { CartSessionSummary } from '../../type/cart';
import { Product } from '../../type/product';
import { getCartOrderItemKey } from '../../utils/cartOrder';
import { getCartNumberForSession } from '../../utils/cartSession';
import { devLog } from '../../utils/devLog';
import { resolveProductImageUri } from '../../utils/productImage';
import CommonAlert from '../../components/CommonAlert/CommonAlert';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Products'>;

function thunkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const pendingCartCount = pendingSessions.length;

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategoryId !== null) {
      list = list.filter((product) => product.category === selectedCategoryId);
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((product) => {
        const category = categories.find((item) => item._id === product.category);
        const categoryName = category?.name.toLowerCase() ?? '';
        return (
          product.name.toLowerCase().includes(query) ||
          categoryName.includes(query)
        );
      });
    }
    return list;
  }, [products, selectedCategoryId, searchQuery, categories]);

  const loadCatalog = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchCategories_Service()).unwrap(),
        dispatch(fetchProducts_Service()).unwrap(),
        dispatch(fetchPendingCartSessions_Service()).unwrap(),
      ]);
    } catch (err: unknown) {
      devLog('Products tab load:', err);
      show_Alert('error', 'Error', thunkErrorMessage(err, 'Failed to load products'), 1, true, 'OK');
    }
  }, [dispatch, show_Alert]);

  const getProductQuantity = useCallback(
    (productId: string) => productQuantities[productId] ?? 0,
    [productQuantities],
  );

  const changeProductQuantity = useCallback((productId: string, delta: number) => {
    setProductQuantities((current) => {
      const next = Math.max(0, (current[productId] ?? 0) + delta);
      return { ...current, [productId]: next };
    });
  }, []);

  const resetProductQuantity = useCallback((productId: string) => {
    setProductQuantities((current) => {
      if ((current[productId] ?? 0) === 0) return current;
      return { ...current, [productId]: 0 };
    });
  }, []);

  const handleAddToPendingCart = useCallback(
    async (product: Product) => {
      const quantity = getProductQuantity(product._id);
      if (quantity < 1 || addToCartLoading) return;

      setAddingProductId(product._id);
      try {
        const result = await dispatch(
          addProductToPendingCart_Service({
            productId: product._id,
            quantity,
          }),
        ).unwrap();
        resetProductQuantity(product._id);
        show_Alert(
          'success',
          'Added',
          `Added to Cart #${result.cartNumber}. You can keep adding items to this order.`,
          1,
          true,
          'OK',
        );
      } catch (err: unknown) {
        devLog('Add to pending cart:', err);
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
    [addToCartLoading, dispatch, getProductQuantity, resetProductQuantity, show_Alert],
  );

  const openPendingModal = useCallback(() => {
    setPendingModalVisible(true);
    void dispatch(fetchPendingCartSessions_Service());
  }, [dispatch]);

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
      const cartNumber = getCartNumberForSession(pendingSessions, session.sessionId);
      dispatch(
        setActiveSession({
          sessionId: session.sessionId,
          cartNumber,
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

      try {
        await dispatch(deleteAddedCartSession_Service(targetSessionId)).unwrap();
      } catch (err: unknown) {
        devLog('Delete pending cart:', err);
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
    [dispatch, manageLoadingSessionId, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCatalog();
    }, [loadCatalog]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCatalog();
    } finally {
      setRefreshing(false);
    }
  }, [loadCatalog]);

  const isAllSelected = selectedCategoryId === null;
  const isInitialLoading =
    (categoriesLoading || productsLoading) && !refreshing && products.length === 0;

  const renderProductRow = ({ item }: { item: Product }) => {
    const category = categories.find((entry) => entry._id === item.category);
    const imageUri = resolveProductImageUri(item.image);
    const quantity = getProductQuantity(item._id);
    const isSelected = selectedProductId === item._id;
    const isAdding = addingProductId === item._id;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => setSelectedProductId(item._id)}
        style={[
          styles.productCard,
          {
            backgroundColor: paperTheme.colors.surfaceVariant,
            borderColor: isSelected ? paperTheme.colors.primary : paperTheme.colors.outline,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.productImagePlaceholder,
              { backgroundColor: paperTheme.colors.surfaceVariant },
            ]}
          >
            <Ionicons name="image-outline" size={28} color={paperTheme.colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.productBody}>
          <Text style={[styles.productName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.productCategory, { color: paperTheme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {category?.name ?? 'Uncategorized'}
          </Text>
          <Text style={[styles.productPrice, { color: paperTheme.colors.primary }]}>
            ${item.price.toFixed(2)}
          </Text>
        </View>
        <View style={styles.productActions}>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Decrease quantity for ${item.name}`}
              onPress={() => changeProductQuantity(item._id, -1)}
              disabled={quantity < 1}
              style={[
                styles.qtyButton,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outline,
                  opacity: quantity < 1 ? 0.45 : 1,
                },
              ]}
            >
              <Ionicons name="remove" size={18} color={paperTheme.colors.onSurface} />
            </TouchableOpacity>
            <Text style={[styles.qtyValue, { color: paperTheme.colors.onSurface }]}>{quantity}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Increase quantity for ${item.name}`}
              onPress={() => changeProductQuantity(item._id, 1)}
              style={[
                styles.qtyButton,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outline,
                },
              ]}
            >
              <Ionicons name="add" size={18} color={paperTheme.colors.onSurface} />
            </TouchableOpacity>
          </View>
          {quantity > 0 ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Add ${item.name} to pending cart`}
              onPress={() => {
                void handleAddToPendingCart(item);
              }}
              disabled={isAdding}
              style={[
                styles.addButton,
                {
                  backgroundColor: paperTheme.colors.primary,
                  opacity: isAdding ? 0.7 : 1,
                },
              ]}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
              ) : (
                <Text style={[styles.addButtonText, { color: paperTheme.colors.onPrimary }]}>Add</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
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
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>Products</Text>
            <Text style={[styles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
              Browse your catalog by category or search.
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View pending carts"
            onPress={openPendingModal}
            style={[
              styles.pendingBadge,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outline,
              },
            ]}
          >
            <Ionicons name="cart-outline" size={18} color={paperTheme.colors.primary} />
            {pendingSessionsLoading ? (
              <ActivityIndicator size="small" color={paperTheme.colors.primary} />
            ) : (
              <Text style={[styles.pendingBadgeCount, { color: paperTheme.colors.onSurface }]}>
                {pendingCartCount}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {activeSession.sessionId && activeSession.cartNumber ? (
          <Text style={[styles.activeCart, { color: paperTheme.colors.primary }]}>
            Adding to Cart #{activeSession.cartNumber}
          </Text>
        ) : null}

        {selectedProductId ? (
          <Text style={[styles.selectedId, { color: paperTheme.colors.onSurfaceVariant }]}>
            Selected card id: {selectedProductId}
          </Text>
        ) : null}

        {categoriesError ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{categoriesError}</Text>
        ) : null}
        {productsError ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{productsError}</Text>
        ) : null}

        <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Categories</Text>

        {categoriesLoading && !refreshing && categories.length === 0 ? (
          <View style={styles.categoriesLoading}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <View style={styles.chipsOuter}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              bounces={false}
            >
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(null)}
                style={[
                  styles.chip,
                  styles.chipTouchable,
                  {
                    backgroundColor: isAllSelected ? paperTheme.colors.primary : paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outline,
                  },
                ]}
              >
                <Ionicons
                  name="grid-outline"
                  size={16}
                  color={isAllSelected ? paperTheme.colors.onPrimary : paperTheme.colors.primary}
                />
                <Text
                  style={[
                    styles.chipName,
                    { color: isAllSelected ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface },
                  ]}
                  numberOfLines={1}
                >
                  All products
                </Text>
              </TouchableOpacity>

              {categories.length === 0 && !categoriesLoading ? (
                <Text style={[styles.emptyCategories, { color: paperTheme.colors.onSurfaceVariant }]}>
                  No categories yet.
                </Text>
              ) : (
                categories.map((item) => {
                  const selected = selectedCategoryId === item._id;
                  return (
                    <TouchableOpacity
                      key={item._id}
                      onPress={() => setSelectedCategoryId(item._id)}
                      style={[
                        styles.chip,
                        styles.chipTouchable,
                        {
                          backgroundColor: selected ? paperTheme.colors.primary : paperTheme.colors.surface,
                          borderColor: paperTheme.colors.outline,
                        },
                      ]}
                    >
                      <View style={[styles.chipDot, { backgroundColor: item.colorCode }]} />
                      <Text
                        style={[
                          styles.chipName,
                          {
                            color: selected ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        <View
          style={[
            styles.searchWrap,
            { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outline },
          ]}
        >
          <Ionicons name="search-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search product or category…"
            placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            style={[styles.searchInput, { color: paperTheme.colors.onSurface }]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={22} color={paperTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.listHeader, { color: paperTheme.colors.onSurfaceVariant }]}>
          {isAllSelected && !searchQuery.trim()
            ? `All products · ${filteredProducts.length} shown`
            : `${filteredProducts.length} shown`}
        </Text>

        {isInitialLoading ? (
          <View style={styles.productsLoading}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <FlatList
            style={styles.productList}
            data={filteredProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProductRow}
            contentContainerStyle={styles.listContent}
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
                    : 'Try another category or clear the search.'}
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}

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
              <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>
                Pending carts
              </Text>
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {pendingSessions.length === 0 ? (
                  <Text style={[styles.modalEmpty, { color: paperTheme.colors.onSurfaceVariant }]}>
                    No pending carts yet.
                  </Text>
                ) : (
                  pendingSessions.map((session) => {
                    const cartNumber = getCartNumberForSession(pendingSessions, session.sessionId);
                    const isReviewing = reviewSessionId === session.sessionId;
                    const isManaging = manageLoadingSessionId === session.sessionId;
                    return (
                      <View
                        key={session.sessionId}
                        style={[
                          styles.modalCartCard,
                          {
                            borderColor: paperTheme.colors.outline,
                            backgroundColor: isReviewing
                              ? paperTheme.colors.primaryContainer
                              : paperTheme.colors.surfaceVariant,
                          },
                        ]}
                      >
                        <View style={styles.modalCartHeaderRow}>
                          <TouchableOpacity
                            style={styles.modalCartBody}
                            onPress={() => handleReviewPendingSession(session)}
                          >
                            <Text style={[styles.modalCartTitle, { color: paperTheme.colors.onSurface }]}>
                              Cart #{cartNumber ?? '—'}
                            </Text>
                            <Text
                              style={[styles.modalCartMeta, { color: paperTheme.colors.onSurfaceVariant }]}
                            >
                              {session.itemCount} item{session.itemCount === 1 ? '' : 's'} · $
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
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
    marginBottom: 8,
  },
  sub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginBottom: 8,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  pendingBadgeCount: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    minWidth: 16,
    textAlign: 'center',
  },
  activeCart: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 6,
  },
  selectedId: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginBottom: 12,
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
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  modalCartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  modalCartBody: {
    flex: 1,
    minWidth: 0,
  },
  modalDeleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCartTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  modalCartMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 4,
  },
  reviewBlock: {
    gap: 6,
    marginTop: 4,
  },
  reviewLine: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalActionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
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
  errorText: { fontFamily: fonts.PoppinsRegular, fontSize: 13, marginBottom: 8 },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesLoading: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-start', marginBottom: 6 },
  chipsOuter: { maxHeight: 52, marginBottom: 8 },
  chipsRow: { gap: 10, paddingBottom: 0, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    maxWidth: 220,
    borderWidth: 1,
  },
  chipTouchable: { alignSelf: 'flex-start' },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipName: { fontFamily: fonts.PoppinsSemiBold, fontSize: 14, flexShrink: 1 },
  emptyCategories: { fontFamily: fonts.PoppinsRegular, fontSize: 14, paddingVertical: 8, alignSelf: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    paddingVertical: 0,
  },
  listHeader: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginBottom: 8,
  },
  productsLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  productList: { flex: 1 },
  listContent: { paddingBottom: 24, flexGrow: 1 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  productImage: {
    width: 84,
    height: 84,
    borderRadius: 14,
  },
  productImagePlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBody: { flex: 1, minWidth: 0, gap: 4 },
  productActions: { alignItems: 'center', justifyContent: 'center', gap: 10, minWidth: 88 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontFamily: fonts.PoppinsSemiBold, fontSize: 13 },
  productName: { fontFamily: fonts.PoppinsSemiBold, fontSize: 17 },
  productCategory: { fontFamily: fonts.PoppinsRegular, fontSize: 13 },
  productPrice: { fontFamily: fonts.PoppinsBold, fontSize: 18, marginTop: 4 },
  emptyList: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyListTitle: { fontFamily: fonts.PoppinsSemiBold, fontSize: 16, marginTop: 12 },
  emptyListBody: { fontFamily: fonts.PoppinsRegular, fontSize: 14, textAlign: 'center', marginTop: 6 },
});

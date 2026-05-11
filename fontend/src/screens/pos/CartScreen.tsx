import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
import { setCartTabSelection } from '../../store/reducers/CartReducer';
import { AppDispatch, RootState } from '../../store/store';
import { CartOrderItem, CartSessionSummary } from '../../type/cart';
import { getCartOrderItemKey } from '../../utils/cartOrder';
import { getCartNumberForSession } from '../../utils/cartSession';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Cart'>;

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
  const [addedModalVisible, setAddedModalVisible] = useState(false);

  const items = order?.items ?? [];
  const totalAmount = order?.totalPrice ?? 0;
  const addedCartCount = addedSessions.length;
  const itemCount = items.length;

  const loadAddedSessions = useCallback(async () => {
    await dispatch(fetchAddedCartSessions_Service());
  }, [dispatch]);

  const loadSelectedCart = useCallback(async () => {
    if (!sessionId) return;
    await dispatch(
      fetchCartItems_Service({
        sessionId,
        status: 'added',
      }),
    );
  }, [dispatch, sessionId]);

  useFocusEffect(
    useCallback(() => {
      void loadAddedSessions();
      void loadSelectedCart();
    }, [loadAddedSessions, loadSelectedCart]),
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
      const resolvedCartNumber = getCartNumberForSession(addedSessions, session.sessionId);
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
    [addedSessions, closeAddedModal, dispatch],
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
    [dispatch, editLoadingProductId, sessionId],
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

    return (
      <View
        style={[
          styles.itemCard,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: paperTheme.colors.outline,
          },
        ]}
      >
        <View style={styles.itemBody}>
          <Text style={[styles.itemName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.itemMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
            Qty {item.quantity}
          </Text>
        </View>

        <View style={styles.itemActions}>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Decrease quantity for ${item.name}`}
              onPress={() => {
                void handleDecreaseQuantity(item);
              }}
              disabled={item.quantity <= 1 || Boolean(editLoadingProductId)}
              style={[
                styles.qtyButton,
                {
                  backgroundColor: paperTheme.colors.surfaceVariant,
                  borderColor: paperTheme.colors.outline,
                  opacity: item.quantity <= 1 || editLoadingProductId ? 0.45 : 1,
                },
              ]}
            >
              <Ionicons name="remove" size={18} color={paperTheme.colors.onSurface} />
            </TouchableOpacity>
            <Text style={[styles.qtyValue, { color: paperTheme.colors.onSurface }]}>
              {item.quantity}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Increase quantity for ${item.name}`}
              onPress={() => {
                void handleIncreaseQuantity(item);
              }}
              disabled={Boolean(editLoadingProductId)}
              style={[
                styles.qtyButton,
                {
                  backgroundColor: paperTheme.colors.surfaceVariant,
                  borderColor: paperTheme.colors.outline,
                  opacity: editLoadingProductId ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="add" size={18} color={paperTheme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name} from cart`}
            onPress={() => {
              void handleDeleteCartItem(item);
            }}
            disabled={Boolean(editLoadingProductId)}
            style={[
              styles.itemDeleteBtn,
              { backgroundColor: paperTheme.colors.errorContainer },
            ]}
          >
            {isEditing ? (
              <ActivityIndicator size="small" color={paperTheme.colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
            )}
          </TouchableOpacity>
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
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outline,
              },
            ]}
          >
            <Ionicons name="bag-check-outline" size={18} color={paperTheme.colors.primary} />
            {addedSessionsLoading ? (
              <ActivityIndicator size="small" color={paperTheme.colors.primary} />
            ) : (
              <Text style={[styles.addedBadgeCount, { color: paperTheme.colors.onSurface }]}>
                {addedCartCount}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {screenError ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{screenError}</Text>
        ) : null}

        {sessionId && itemCount > 0 ? (
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: paperTheme.colors.surfaceVariant,
                borderColor: paperTheme.colors.outline,
              },
            ]}
          >
            <Text style={[styles.summaryTitle, { color: paperTheme.colors.onSurface }]}>
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </Text>
            <Text style={[styles.summaryTotal, { color: paperTheme.colors.primary }]}>
              Total ${totalAmount.toFixed(2)}
            </Text>
          </View>
        ) : null}

        {loading && items.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: paperTheme.colors.surface }]}>
            <Ionicons name="cart-outline" size={56} color={paperTheme.colors.outline} />
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
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.checkout,
            {
              backgroundColor:
                items.length > 0 ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant,
              opacity: checkoutLoading ? 0.75 : 1,
            },
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
                Checkout — ${totalAmount.toFixed(2)}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={
                  items.length > 0 ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceDisabled
                }
              />
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
                {addedSessions.length === 0 ? (
                  <Text style={[styles.modalEmpty, { color: paperTheme.colors.onSurfaceVariant }]}>
                    No added carts yet.
                  </Text>
                ) : (
                  addedSessions.map((session) => {
                    const orderNumber = getCartNumberForSession(addedSessions, session.sessionId);
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
                            {session.itemCount} item{session.itemCount === 1 ? '' : 's'} · $
                            {session.totalAmount.toFixed(2)}
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
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  addedBadgeCount: {
    fontFamily: fonts.PoppinsSemiBold,
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
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  summaryTotal: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginBottom: 16,
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
  },
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  itemBody: { flex: 1, minWidth: 0, gap: 4 },
  itemName: { fontFamily: fonts.PoppinsSemiBold, fontSize: 16 },
  itemMeta: { fontFamily: fonts.PoppinsRegular, fontSize: 13 },
  itemActions: { alignItems: 'center', justifyContent: 'center', gap: 10 },
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
  itemDeleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 8,
  },
  checkoutText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
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

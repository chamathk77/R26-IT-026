import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../store/store';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import {
  acceptManualOrder_Service,
  fetchManualOrders_Service,
  rejectManualOrder_Service,
} from '../../../services/ManualOrderService';
import { fetchCartItems_Service } from '../../../services/CartService';
import { setActiveSession } from '../../../store/reducers/CartReducer';
import { mapToActiveSession } from '../../../utils/cartSession';
import { ManualOrder } from '../../../type/manualOrder';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'ManualOrders'>;

function formatCurrency(value: number): string {
  return `Rs. ${Number(value ?? 0).toLocaleString('en-LK')}`;
}

function formatPlacedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function ManualOrderCard({
  order,
  busy,
  paperTheme,
  onAccept,
  onReject,
}: {
  order: ManualOrder;
  busy: boolean;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cartBadge, { backgroundColor: `${paperTheme.colors.primary}18` }]}>
          <Text style={[styles.cartBadgeText, { color: paperTheme.colors.primary }]}>
            #{order.cartNumber}
          </Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]} numberOfLines={1}>
            {order.tableNumber ? `Table ${order.tableNumber}` : 'Table not given'}
          </Text>
          <Text
            style={[styles.cardMeta, { color: paperTheme.colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {order.customerName ? `${order.customerName} · ` : ''}
            {order.customerPhone || 'No number'}
            {order.createdAt ? ` · ${formatPlacedAt(order.createdAt)}` : ''}
          </Text>
        </View>
        <Text style={[styles.cardTotal, { color: paperTheme.colors.onSurface }]}>
          {formatCurrency(order.totalAmount)}
        </Text>
      </View>

      <View style={[styles.itemsBlock, { borderColor: paperTheme.colors.outlineVariant }]}>
        {order.items.map((item) => (
          <View key={item.productId} style={styles.itemRow}>
            <Text
              style={[styles.itemQty, { color: paperTheme.colors.primary }]}
            >{`${item.quantity}×`}</Text>
            <Text
              style={[styles.itemName, { color: paperTheme.colors.onSurface }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={[styles.itemAmount, { color: paperTheme.colors.onSurfaceVariant }]}>
              {formatCurrency(item.lineTotal)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.rejectBtn,
            { borderColor: paperTheme.colors.error, opacity: busy ? 0.6 : 1 },
          ]}
          disabled={busy}
          onPress={onReject}
        >
          <Ionicons name="close-circle-outline" size={18} color={paperTheme.colors.error} />
          <Text style={[styles.rejectBtnText, { color: paperTheme.colors.error }]}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.acceptBtn,
            { backgroundColor: paperTheme.colors.primary, opacity: busy ? 0.6 : 1 },
          ]}
          disabled={busy}
          onPress={onAccept}
        >
          {busy ? (
            <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={18} color={paperTheme.colors.onPrimary} />
          )}
          <Text style={[styles.acceptBtnText, { color: paperTheme.colors.onPrimary }]}>
            Accept &amp; open
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ManualOrdersScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const { items, loading, error } = useSelector(
    (state: RootState) => state.ManualOrderReducer.list,
  );
  const { loadingSessionId } = useSelector(
    (state: RootState) => state.ManualOrderReducer.review,
  );

  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        await dispatch(fetchManualOrders_Service()).unwrap();
      } catch (apiError: unknown) {
        const handled = await handleSessionExpiredApiError(apiError, show_Alert);
        if (handled || options?.silent) return;

        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(apiError, 'Could not load manual orders.'),
          1,
          false,
          'OK',
        );
      }
    },
    [dispatch, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOrders({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadOrders]);

  const handleAccept = useCallback(
    async (order: ManualOrder) => {
      try {
        const result = await dispatch(acceptManualOrder_Service(order.sessionId)).unwrap();
        const session = result.session;

        // Continue in the normal POS flow: this cart becomes the active cart.
        dispatch(setActiveSession(mapToActiveSession(session)));
        void dispatch(
          fetchCartItems_Service({ sessionId: session.sessionId, status: 'pending' }),
        );

        const openProducts = () => {
          navigation.navigate('PosMain', { screen: 'Products' });
        };

        if (result.tableWarning) {
          show_Alert(
            'pending',
            `Cart #${session.cartNumber} ready`,
            result.tableWarning,
            1,
            false,
            'Open cart',
            openProducts,
          );
          return;
        }

        show_Alert(
          'success',
          `Cart #${session.cartNumber} ready`,
          'The order is now in your pending carts. Review it and proceed as usual.',
          1,
          false,
          'Open cart',
          openProducts,
        );
      } catch (apiError: unknown) {
        const handled = await handleSessionExpiredApiError(apiError, show_Alert);
        if (handled) return;

        show_Alert(
          'error',
          'Could not accept',
          getApiErrorMessage(apiError, 'Could not accept this manual order.'),
          1,
          false,
          'OK',
        );
      }
    },
    [dispatch, navigation, show_Alert],
  );

  const handleReject = useCallback(
    (order: ManualOrder) => {
      show_Alert(
        'error',
        'Reject order?',
        `Cart #${order.cartNumber} from ${order.customerPhone || 'this customer'} will be removed. This cannot be undone.`,
        2,
        false,
        'Reject',
        () => {
          void (async () => {
            try {
              await dispatch(rejectManualOrder_Service(order.sessionId)).unwrap();
            } catch (apiError: unknown) {
              const handled = await handleSessionExpiredApiError(apiError, show_Alert);
              if (handled) return;

              show_Alert(
                'error',
                'Could not reject',
                getApiErrorMessage(apiError, 'Could not reject this manual order.'),
                1,
                false,
                'OK',
              );
            }
          })();
        },
        'Keep',
        () => {},
      );
    },
    [dispatch, show_Alert],
  );

  const subtitle = useMemo(() => {
    if (loading && items.length === 0) return 'Loading customer orders…';
    if (items.length === 0) return 'No customer orders waiting';
    return `${items.length} order${items.length === 1 ? '' : 's'} waiting for review`;
  }, [loading, items.length]);

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
        <CommonHeader
          title="Manual orders"
          onPressLeftBtn={() => navigation.goBack()}
          rightIcon="qrcode"
          onPressRightBtn={() => navigation.navigate('BranchOrderQr')}
        />

        <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>

        {error ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{error}</Text>
        ) : null}

        {loading && items.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.sessionId}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={paperTheme.colors.primary}
                colors={[paperTheme.colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Ionicons
                  name="qr-code-outline"
                  size={44}
                  color={paperTheme.colors.onSurfaceVariant}
                />
                <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                  Nothing waiting
                </Text>
                <Text style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Orders customers place by scanning the table QR code show up here for you to
                  check before they go into a cart.
                </Text>
                <TouchableOpacity
                  style={[styles.qrLinkBtn, { borderColor: paperTheme.colors.primary }]}
                  onPress={() => navigation.navigate('BranchOrderQr')}
                >
                  <Ionicons name="qr-code-outline" size={18} color={paperTheme.colors.primary} />
                  <Text style={[styles.qrLinkBtnText, { color: paperTheme.colors.primary }]}>
                    Show branch QR
                  </Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <ManualOrderCard
                order={item}
                busy={loadingSessionId === item.sessionId}
                paperTheme={paperTheme}
                onAccept={() => void handleAccept(item)}
                onReject={() => handleReject(item)}
              />
            )}
          />
        )}
      </SafeAreaView>

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
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  subtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
    flexGrow: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartBadge: {
    minWidth: 44,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  cardMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  cardTotal: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
  },
  itemsBlock: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 8,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemQty: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    minWidth: 34,
  },
  itemName: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  itemAmount: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  acceptBtn: {
    flex: 1.4,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  emptyBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    marginTop: 6,
  },
  emptyText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  qrLinkBtn: {
    marginTop: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrLinkBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
});

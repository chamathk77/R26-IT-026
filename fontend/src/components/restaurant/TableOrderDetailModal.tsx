import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { fetchCartSessionDetail_Service, changeCartSessionTable_Service } from '../../services/CartService';
import { CartLineItem, CartSessionSummary } from '../../type/cart';
import { TablePickerItem } from '../../type/table';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../utils/apiErrorAlert';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import CommonAlert from '../CommonAlert/CommonAlert';
import CartOrderTypeBadge from './CartOrderTypeBadge';
import TablePickerModal from './TablePickerModal';

type TableChangedPayload = {
  newTable: TablePickerItem;
  previousTableNumber: string;
  newTableNumber: string;
};

type Props = {
  visible: boolean;
  table: TablePickerItem | null;
  showTableManagement?: boolean;
  onClose: () => void;
  onOpenOrder?: (session: CartSessionSummary) => void;
  onTableChanged?: (payload: TableChangedPayload) => void;
};

function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatOrderStatus(status?: string): string {
  if (status === 'added') return 'Ready for checkout';
  if (status === 'pending') return 'In progress';
  return status ?? '';
}

function formatStartedAt(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-LK', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });
}

export default function TableOrderDetailModal({
  visible,
  table,
  showTableManagement = true,
  onClose,
  onOpenOrder,
  onTableChanged,
}: Props) {
  const { paperTheme } = useTheme();
  const { alertConfig, visible: alertVisible, hideAlert, show_Alert } = useCommonAlert();
  const [loading, setLoading] = useState(false);
  const [changingTable, setChangingTable] = useState(false);
  const [tablePickerVisible, setTablePickerVisible] = useState(false);
  const [session, setSession] = useState<CartSessionSummary | null>(null);
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isOccupied = table?.status === 'occupied';
  const sessionId = table?.occupiedSessionId ?? null;

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.totalPrice, 0),
    [items],
  );

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const loadOrderDetail = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setItems([]);
      setLoadError(null);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const detail = await fetchCartSessionDetail_Service(sessionId);
      setSession(detail.session);
      setItems(detail.items);
    } catch (error: unknown) {
      setSession(null);
      setItems([]);

      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setLoadError(getApiErrorMessage(error, 'Could not load table order.'));
    } finally {
      setLoading(false);
    }
  }, [sessionId, show_Alert]);

  useEffect(() => {
    if (visible) {
      void loadOrderDetail();
    } else {
      setSession(null);
      setItems([]);
      setLoadError(null);
      setLoading(false);
    }
  }, [visible, loadOrderDetail]);

  const startedAtLabel = formatStartedAt(session?.createdAt);
  const canOpenOrder = Boolean(session && onOpenOrder && (session.status === 'pending' || session.status === 'added'));
  const canChangeTable = Boolean(
    showTableManagement &&
      isOccupied &&
      session?.orderType === 'dine_in' &&
      sessionId &&
      !changingTable,
  );

  const handleSelectNewTable = useCallback(
    async (newTable: TablePickerItem) => {
      if (!sessionId || !session) return;

      if (String(session.tableId ?? '') === String(newTable._id)) {
        setTablePickerVisible(false);
        return;
      }

      setChangingTable(true);
      try {
        const result = await changeCartSessionTable_Service(sessionId, newTable._id);
        setSession(result.session);
        setTablePickerVisible(false);

        onTableChanged?.({
          newTable: {
            ...newTable,
            status: 'occupied',
            occupiedSessionId: sessionId,
            occupiedCartNumber: result.session.cartNumber ?? table?.occupiedCartNumber ?? null,
          },
          previousTableNumber: result.previousTableNumber,
          newTableNumber: result.newTableNumber,
        });

        setTimeout(() => {
          show_Alert(
            'success',
            'Table changed',
            `Order moved from ${result.previousTableNumber} to ${result.newTableNumber}.`,
            1,
            false,
            'OK',
          );
        }, 150);
      } catch (error: unknown) {
        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) return;

        setTimeout(() => {
          show_Alert(
            'error',
            'Could not change table',
            getApiErrorMessage(error, 'Please try again.'),
            1,
            true,
            'OK',
          );
        }, 150);
      } finally {
        setChangingTable(false);
      }
    },
    [onTableChanged, session, sessionId, show_Alert, table?.occupiedCartNumber],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: paperTheme.colors.surface }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: paperTheme.colors.outlineVariant }]} />

          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { color: paperTheme.colors.onSurface }]}>
                Table {table?.tableNumber ?? '—'}
              </Text>
              <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
                {isOccupied ? 'Current order on this table' : 'This table is free'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: paperTheme.colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={20} color={paperTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: isOccupied ? '#fef2f2' : '#ecfdf5',
                borderColor: isOccupied ? '#dc262655' : '#15803d55',
              },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: isOccupied ? '#dc2626' : '#15803d' }]} />
            <Text style={[styles.statusText, { color: isOccupied ? '#991b1b' : '#166534' }]}>
              {isOccupied ? 'Occupied' : 'Free'}
            </Text>
          </View>

          {!isOccupied ? (
            <View style={styles.freeWrap}>
              <Ionicons name="checkmark-circle-outline" size={42} color="#15803d" />
              <Text style={[styles.freeTitle, { color: paperTheme.colors.onSurface }]}>
                No active order
              </Text>
              <Text style={[styles.freeSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                Start a dine-in order from the Products tab to assign this table.
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={paperTheme.colors.primary} />
              <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
                Loading order…
              </Text>
            </View>
          ) : loadError ? (
            <View style={styles.errorWrap}>
              <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{loadError}</Text>
              <TouchableOpacity
                onPress={() => {
                  void loadOrderDetail();
                }}
                style={[styles.retryBtn, { backgroundColor: paperTheme.colors.primaryContainer }]}
              >
                <Text style={[styles.retryText, { color: paperTheme.colors.primary }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: paperTheme.colors.primaryContainer },
                ]}
              >
                <View style={styles.summaryTopRow}>
                  <View style={styles.summaryTitleWrap}>
                    <Text style={[styles.summaryTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
                      Order #{session?.cartNumber ?? table?.occupiedCartNumber ?? '—'}
                    </Text>
                    <CartOrderTypeBadge
                      orderType={session?.orderType ?? 'dine_in'}
                      orderLabel={session?.orderLabel ?? table?.tableNumber}
                      showTableManagement={showTableManagement}
                      compact
                    />
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          session?.status === 'added'
                            ? paperTheme.colors.primary
                            : paperTheme.colors.secondaryContainer,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            session?.status === 'added'
                              ? paperTheme.colors.onPrimary
                              : paperTheme.colors.onSecondaryContainer,
                        },
                      ]}
                    >
                      {formatOrderStatus(session?.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryMetaRow}>
                  <Text style={[styles.summaryMeta, { color: paperTheme.colors.onPrimaryContainer }]}>
                    {itemCount} item{itemCount === 1 ? '' : 's'}
                  </Text>
                  <Text style={[styles.summaryTotal, { color: paperTheme.colors.primary }]}>
                    {formatCurrency(session?.totalAmount ?? totalAmount)}
                  </Text>
                </View>

                {startedAtLabel ? (
                  <Text style={[styles.startedAt, { color: paperTheme.colors.onPrimaryContainer }]}>
                    Started {startedAtLabel}
                  </Text>
                ) : null}
              </View>

              <Text style={[styles.itemsTitle, { color: paperTheme.colors.onSurface }]}>Order items</Text>

              <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
                {items.length === 0 ? (
                  <Text style={[styles.emptyItems, { color: paperTheme.colors.onSurfaceVariant }]}>
                    No items in this order yet.
                  </Text>
                ) : (
                  items.map((item) => (
                    <View
                      key={item._id}
                      style={[
                        styles.itemRow,
                        {
                          backgroundColor: paperTheme.colors.surfaceVariant,
                          borderColor: paperTheme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <View style={styles.itemMain}>
                        {item.productNumber ? (
                          <View
                            style={[
                              styles.itemNumberBadge,
                              { backgroundColor: `${paperTheme.colors.tertiary}18` },
                            ]}
                          >
                            <Text
                              style={[styles.itemNumberText, { color: paperTheme.colors.tertiary }]}
                              numberOfLines={1}
                            >
                              {item.productNumber}
                            </Text>
                          </View>
                        ) : null}
                        <Text
                          style={[styles.itemName, { color: paperTheme.colors.onSurface }]}
                          numberOfLines={2}
                        >
                          {item.productName}
                        </Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={[styles.itemQty, { color: paperTheme.colors.onSurfaceVariant }]}>
                          x{item.quantity}
                        </Text>
                        <Text style={[styles.itemPrice, { color: paperTheme.colors.onSurface }]}>
                          {formatCurrency(item.totalPrice)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.actionsRow}>
                {canChangeTable ? (
                  <TouchableOpacity
                    style={[
                      styles.secondaryBtn,
                      !canOpenOrder ? styles.openBtnFull : null,
                      { backgroundColor: paperTheme.colors.secondaryContainer },
                    ]}
                    onPress={() => setTablePickerVisible(true)}
                    activeOpacity={0.9}
                    disabled={changingTable}
                  >
                    {changingTable ? (
                      <ActivityIndicator size="small" color={paperTheme.colors.onSecondaryContainer} />
                    ) : (
                      <>
                        <Ionicons
                          name="swap-horizontal-outline"
                          size={18}
                          color={paperTheme.colors.onSecondaryContainer}
                        />
                        <Text
                          style={[
                            styles.secondaryBtnText,
                            { color: paperTheme.colors.onSecondaryContainer },
                          ]}
                        >
                          Change table
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}

                {canOpenOrder ? (
                  <TouchableOpacity
                    style={[
                      styles.openBtn,
                      canChangeTable ? styles.openBtnHalf : styles.openBtnFull,
                      { backgroundColor: paperTheme.colors.primary },
                    ]}
                    onPress={() => {
                      if (session) {
                        onOpenOrder?.(session);
                      }
                    }}
                    activeOpacity={0.9}
                    disabled={changingTable}
                  >
                    <Ionicons
                      name={session?.status === 'added' ? 'bag-check-outline' : 'cart-outline'}
                      size={18}
                      color={paperTheme.colors.onPrimary}
                    />
                    <Text style={[styles.openBtnText, { color: paperTheme.colors.onPrimary }]}>
                      {session?.status === 'added' ? 'Open in Cart' : 'Open in Products'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )}
        </Pressable>
      </Pressable>

      <TablePickerModal
        visible={tablePickerVisible}
        onClose={() => setTablePickerVisible(false)}
        onSelectTable={(newTable) => {
          void handleSelectNewTable(newTable);
        }}
        freeTablesOnly
        title="Change table"
        subtitle="Select a free table for this order"
      />

      {alertConfig && (
        <CommonAlert
          visible={alertVisible}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '82%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
  },
  subtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  freeWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  freeTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  freeSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  errorText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryTitleWrap: {
    flex: 1,
    gap: 8,
  },
  summaryTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  summaryTotal: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
  },
  startedAt: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    opacity: 0.85,
  },
  itemsTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    marginBottom: 10,
  },
  itemsList: {
    maxHeight: 260,
    marginBottom: 14,
  },
  emptyItems: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  itemNumberBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    maxWidth: 56,
  },
  itemNumberText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
  },
  itemName: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemQty: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  itemPrice: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  secondaryBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  openBtnHalf: {
    flex: 1,
  },
  openBtnFull: {
    flex: 1,
  },
  openBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
});

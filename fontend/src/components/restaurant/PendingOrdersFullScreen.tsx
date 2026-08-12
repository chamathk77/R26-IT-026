import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { CartOrderItem, CartOrderType, CartSessionSummary } from '../../type/cart';
import { getCartNumberForSession, sortCartSessionsByNumber } from '../../utils/cartSession';
import CartOrderTypeBadge from './CartOrderTypeBadge';

type OrderTypeFilter = 'all' | CartOrderType;

type Props = {
  visible: boolean;
  onClose: () => void;
  sessions: CartSessionSummary[];
  loading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  isRestaurant: boolean;
  showTableManagement: boolean;
  activeSessionId: string | null;
  reviewSessionId: string | null;
  reviewItems: CartOrderItem[];
  reviewItemsLoading: boolean;
  manageLoadingSessionId: string | null;
  proceedLoading: boolean;
  showKitchenOrders?: boolean;
  sendingKitchenSessionId?: string | null;
  creatingCart: boolean;
  addToCartLoading: boolean;
  focusSessionId?: string | null;
  onCreateNewCart: () => void;
  onReviewSession: (session: CartSessionSummary) => void;
  onResumeSession: (session: CartSessionSummary) => void;
  onSendToKitchen?: (session: CartSessionSummary) => void;
  onProceedSession: (session: CartSessionSummary) => void;
  onDeleteSession: (sessionId: string) => void;
  alertOverlay?: React.ReactNode;
};

function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function matchesOrderSearch(
  session: CartSessionSummary,
  query: string,
  options?: { isRestaurant?: boolean; showTableManagement?: boolean },
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const cartNumber = session.cartNumber != null ? String(session.cartNumber) : '';
  if (cartNumber.includes(normalized)) return true;

  if (!options?.isRestaurant) {
    return false;
  }

  const orderLabel = (session.orderLabel ?? '').toLowerCase();
  const orderType = (session.orderType ?? '').toLowerCase();

  if (options.showTableManagement && orderLabel.includes(normalized)) {
    return true;
  }

  return (
    orderType.includes(normalized) ||
    (orderType === 'dine_in' && 'dine'.includes(normalized)) ||
    (orderType === 'takeaway' && 'take'.includes(normalized))
  );
}

function FilterChip({
  label,
  active,
  onPress,
  icon,
  paperTheme,
  accentColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  paperTheme: MD3Theme;
  accentColor?: string;
}) {
  const accent = accentColor ?? paperTheme.colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? `${accent}18` : paperTheme.colors.surfaceVariant,
          borderColor: active ? `${accent}55` : 'transparent',
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? accent : paperTheme.colors.onSurfaceVariant}
        />
      ) : null}
      <Text
        style={[
          styles.filterChipText,
          { color: active ? accent : paperTheme.colors.onSurfaceVariant },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function OrderCartItemRow({
  item,
  paperTheme,
}: {
  item: CartOrderItem;
  paperTheme: MD3Theme;
}) {
  return (
    <View style={[styles.itemRow, { backgroundColor: paperTheme.colors.background }]}>
      {item.productNumber ? (
        <View style={[styles.itemNumberBadge, { backgroundColor: `${paperTheme.colors.tertiary}18` }]}>
          <Text style={[styles.itemNumberText, { color: paperTheme.colors.tertiary }]} numberOfLines={1}>
            {item.productNumber}
          </Text>
        </View>
      ) : null}
      <Text style={[styles.itemName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
        {item.name}
      </Text>
      <View style={[styles.itemQtyBadge, { backgroundColor: paperTheme.colors.primaryContainer }]}>
        <Text style={[styles.itemQtyText, { color: paperTheme.colors.primary }]}>x{item.quantity}</Text>
      </View>
    </View>
  );
}

export default function PendingOrdersFullScreen({
  visible,
  onClose,
  sessions,
  loading,
  refreshing = false,
  onRefresh,
  isRestaurant,
  showTableManagement,
  activeSessionId,
  reviewSessionId,
  reviewItems,
  reviewItemsLoading,
  manageLoadingSessionId,
  proceedLoading,
  showKitchenOrders = false,
  sendingKitchenSessionId = null,
  creatingCart,
  addToCartLoading,
  focusSessionId = null,
  onCreateNewCart,
  onReviewSession,
  onResumeSession,
  onSendToKitchen,
  onProceedSession,
  onDeleteSession,
  alertOverlay,
}: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilter>('all');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const sortedSessions = useMemo(() => sortCartSessionsByNumber(sessions), [sessions]);

  const filteredSessions = useMemo(() => {
    return sortedSessions.filter((session) => {
      if (isRestaurant && orderTypeFilter !== 'all' && session.orderType !== orderTypeFilter) {
        return false;
      }
      return matchesOrderSearch(session, searchQuery, { isRestaurant, showTableManagement });
    });
  }, [isRestaurant, orderTypeFilter, searchQuery, showTableManagement, sortedSessions]);

  const filterCounts = useMemo(() => {
    const base = sortedSessions.filter((session) =>
      matchesOrderSearch(session, searchQuery, { isRestaurant, showTableManagement }),
    );
    return {
      all: base.length,
      takeaway: base.filter((session) => session.orderType === 'takeaway').length,
      dine_in: base.filter((session) => session.orderType === 'dine_in').length,
    };
  }, [isRestaurant, searchQuery, showTableManagement, sortedSessions]);

  const searchPlaceholder = useMemo(() => {
    if (!isRestaurant) return 'Search by cart #…';
    if (showTableManagement) return 'Search table, cart #, or order type…';
    return 'Search cart # or order type…';
  }, [isRestaurant, showTableManagement]);

  const emptyFilterHint = useMemo(() => {
    if (!isRestaurant) return 'Try another cart number or clear your search.';
    if (showTableManagement) return 'Try clearing filters or search with another table number.';
    return 'Try clearing filters or search with another cart number.';
  }, [isRestaurant, showTableManagement]);

  const hasActiveFilters = Boolean(searchQuery || (isRestaurant && orderTypeFilter !== 'all'));

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setOrderTypeFilter('all');
      setExpandedSessionId(null);
      return;
    }

    if (focusSessionId) {
      setExpandedSessionId(focusSessionId);
      const session = sessions.find((entry) => entry.sessionId === focusSessionId);
      if (session) {
        onReviewSession(session);
      }
    }
  }, [focusSessionId, onReviewSession, sessions, visible]);

  const handleToggleExpand = useCallback(
    (session: CartSessionSummary) => {
      setExpandedSessionId((current) => {
        const next = current === session.sessionId ? null : session.sessionId;
        if (next) {
          onReviewSession(session);
        }
        return next;
      });
    },
    [onReviewSession],
  );

  const renderSessionCard = useCallback(
    ({ item: session }: { item: CartSessionSummary }) => {
      const cartNumber = session.cartNumber ?? getCartNumberForSession(sortedSessions, session.sessionId);
      const isActive = activeSessionId === session.sessionId;
      const isExpanded = expandedSessionId === session.sessionId;
      const isManaging = manageLoadingSessionId === session.sessionId;
      const isSendingKitchen = sendingKitchenSessionId === session.sessionId;
      const isDineIn = isRestaurant && session.orderType === 'dine_in';
      const showSendToKitchen = showKitchenOrders && isDineIn && Boolean(onSendToKitchen);
      const accentColor = isDineIn ? paperTheme.colors.tertiary : paperTheme.colors.primary;
      const tableLabel =
        isDineIn && showTableManagement && session.orderLabel?.trim()
          ? session.orderLabel.trim()
          : null;

      return (
        <View
          style={[
            styles.orderCard,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: isActive ? accentColor : paperTheme.colors.outlineVariant,
            },
          ]}
        >
          <View style={[styles.orderAccent, { backgroundColor: accentColor }]} />

          <TouchableOpacity
            style={styles.orderCardBody}
            activeOpacity={0.9}
            onPress={() => handleToggleExpand(session)}
          >
            <View style={styles.orderTopRow}>
              <View style={styles.orderTitleBlock}>
                <Text style={[styles.orderCartNumber, { color: paperTheme.colors.onSurface }]}>
                  Order #{cartNumber ?? '—'}
                </Text>
                {tableLabel ? (
                  <View style={styles.tableHighlightRow}>
                    <Ionicons name="restaurant-outline" size={14} color={accentColor} />
                    <Text style={[styles.tableHighlightText, { color: accentColor }]}>
                      Table {tableLabel}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.orderTopRight}>
                {isActive ? (
                  <View style={[styles.livePill, { backgroundColor: `${accentColor}18` }]}>
                    <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
                    <Text style={[styles.livePillText, { color: accentColor }]}>Active</Text>
                  </View>
                ) : null}
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={paperTheme.colors.onSurfaceVariant}
                />
              </View>
            </View>

            <View style={styles.orderMetaRow}>
              {isRestaurant && session.orderType ? (
                <CartOrderTypeBadge
                  orderType={session.orderType}
                  orderLabel={session.orderLabel}
                  showTableManagement={showTableManagement}
                  compact
                />
              ) : null}
              <Text style={[styles.orderMetaText, { color: paperTheme.colors.onSurfaceVariant }]}>
                {session.itemCount} item{session.itemCount === 1 ? '' : 's'} · {formatCurrency(session.totalAmount)}
              </Text>
            </View>
          </TouchableOpacity>

          {isExpanded ? (
            <View style={[styles.itemsBlock, { borderTopColor: paperTheme.colors.outlineVariant }]}>
              {reviewSessionId === session.sessionId && reviewItemsLoading ? (
                <ActivityIndicator size="small" color={paperTheme.colors.primary} style={styles.itemsLoading} />
              ) : reviewSessionId === session.sessionId && reviewItems.length > 0 ? (
                reviewItems.map((item) => (
                  <OrderCartItemRow
                    key={`${session.sessionId}-${item.productId}-${item.productNumber ?? ''}`}
                    item={item}
                    paperTheme={paperTheme}
                  />
                ))
              ) : reviewSessionId === session.sessionId ? (
                <Text style={[styles.emptyItemsText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  No items in this order yet
                </Text>
              ) : (
                <ActivityIndicator size="small" color={paperTheme.colors.primary} style={styles.itemsLoading} />
              )}
            </View>
          ) : null}

          <View style={styles.orderActionsRow}>
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: paperTheme.colors.errorContainer }]}
              disabled={Boolean(manageLoadingSessionId)}
              onPress={() => onDeleteSession(session.sessionId)}
            >
              {isManaging ? (
                <ActivityIndicator size="small" color={paperTheme.colors.error} />
              ) : (
                <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: paperTheme.colors.secondaryContainer }]}
              onPress={() => onResumeSession(session)}
            >
              <Ionicons name="play-outline" size={16} color={paperTheme.colors.onSecondaryContainer} />
              <Text style={[styles.actionBtnText, { color: paperTheme.colors.onSecondaryContainer }]}>
                Resume
              </Text>
            </TouchableOpacity>

            {showSendToKitchen ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: paperTheme.colors.tertiaryContainer }]}
                disabled={Boolean(sendingKitchenSessionId) || proceedLoading}
                onPress={() => onSendToKitchen?.(session)}
              >
                {isSendingKitchen ? (
                  <ActivityIndicator size="small" color={paperTheme.colors.onTertiaryContainer} />
                ) : (
                  <>
                    <Ionicons name="flame-outline" size={16} color={paperTheme.colors.onTertiaryContainer} />
                    <Text style={[styles.actionBtnText, { color: paperTheme.colors.onTertiaryContainer }]}>
                      Kitchen
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.actionBtn, styles.proceedBtn, { backgroundColor: paperTheme.colors.primary }]}
              disabled={proceedLoading || Boolean(sendingKitchenSessionId)}
              onPress={() => onProceedSession(session)}
            >
              {proceedLoading ? (
                <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="arrow-forward-circle-outline" size={16} color={paperTheme.colors.onPrimary} />
                  <Text style={[styles.actionBtnText, { color: paperTheme.colors.onPrimary }]}>Proceed</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      activeSessionId,
      expandedSessionId,
      handleToggleExpand,
      isRestaurant,
      manageLoadingSessionId,
      onDeleteSession,
      onProceedSession,
      onResumeSession,
      onSendToKitchen,
      paperTheme,
      proceedLoading,
      reviewItems,
      reviewItemsLoading,
      reviewSessionId,
      sendingKitchenSessionId,
      showKitchenOrders,
      showTableManagement,
      sortedSessions,
    ],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.header, { borderBottomColor: paperTheme.colors.outlineVariant }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.headerBtn, { backgroundColor: paperTheme.colors.surfaceVariant }]}
            accessibilityRole="button"
            accessibilityLabel="Close orders"
          >
            <Ionicons name="chevron-down" size={22} color={paperTheme.colors.onSurfaceVariant} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: paperTheme.colors.onBackground }]}>Orders</Text>
            <Text style={[styles.headerSub, { color: paperTheme.colors.onSurfaceVariant }]}>
              {filteredSessions.length} of {sortedSessions.length} pending
            </Text>
          </View>

          <TouchableOpacity
            onPress={onCreateNewCart}
            disabled={creatingCart || addToCartLoading}
            style={[
              styles.headerBtn,
              {
                backgroundColor: paperTheme.colors.primary,
                opacity: creatingCart || addToCartLoading ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create new order"
          >
            {creatingCart ? (
              <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
            ) : (
              <Ionicons name="add" size={22} color={paperTheme.colors.onPrimary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.filtersSection}>
          <View style={[styles.searchBar, { backgroundColor: paperTheme.colors.surface }]}>
            <Ionicons name="search-outline" size={18} color={paperTheme.colors.onSurfaceVariant} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={paperTheme.colors.onSurfaceVariant}
              style={[styles.searchInput, { color: paperTheme.colors.onSurface }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={paperTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ) : null}
          </View>

          {isRestaurant ? (
            <View style={styles.filterRow}>
              <FilterChip
                label={`All (${filterCounts.all})`}
                active={orderTypeFilter === 'all'}
                onPress={() => setOrderTypeFilter('all')}
                paperTheme={paperTheme}
              />
              <FilterChip
                label={`Takeaway (${filterCounts.takeaway})`}
                active={orderTypeFilter === 'takeaway'}
                onPress={() => setOrderTypeFilter('takeaway')}
                icon="bag-handle-outline"
                paperTheme={paperTheme}
                accentColor={paperTheme.colors.primary}
              />
              <FilterChip
                label={`Dine-in (${filterCounts.dine_in})`}
                active={orderTypeFilter === 'dine_in'}
                onPress={() => setOrderTypeFilter('dine_in')}
                icon="restaurant-outline"
                paperTheme={paperTheme}
                accentColor={paperTheme.colors.tertiary}
              />
            </View>
          ) : null}
        </View>

        {loading && sessions.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
            <Text style={[styles.centerStateText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading orders…
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredSessions}
            keyExtractor={(item) => item.sessionId}
            renderItem={renderSessionCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={paperTheme.colors.primary}
                  colors={[paperTheme.colors.primary]}
                />
              ) : undefined
            }
            ListEmptyComponent={
              <View style={styles.centerState}>
                <View style={[styles.emptyIconWrap, { backgroundColor: `${paperTheme.colors.primary}12` }]}>
                  <Ionicons name="receipt-outline" size={34} color={paperTheme.colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                  No orders match
                </Text>
                <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {hasActiveFilters ? emptyFilterHint : 'Tap + to start a new order.'}
                </Text>
                {hasActiveFilters ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setOrderTypeFilter('all');
                    }}
                    style={[styles.clearFiltersBtn, { backgroundColor: paperTheme.colors.primaryContainer }]}
                  >
                    <Text style={[styles.clearFiltersText, { color: paperTheme.colors.primary }]}>
                      {isRestaurant ? 'Clear filters' : 'Clear search'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            }
          />
        )}
      </SafeAreaView>
      {alertOverlay}
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
  },
  headerSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  filtersSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  orderCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  orderAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  orderCardBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    paddingLeft: 18,
    gap: 10,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderTitleBlock: {
    flex: 1,
    gap: 4,
  },
  orderCartNumber: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  tableHighlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableHighlightText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  orderTopRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  livePillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  orderMetaText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  itemsBlock: {
    paddingHorizontal: 16,
    paddingLeft: 18,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  itemsLoading: {
    paddingVertical: 8,
  },
  emptyItemsText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  itemNumberBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    maxWidth: 52,
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
  itemQtyBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemQtyText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  orderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingLeft: 18,
    paddingBottom: 14,
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
  },
  proceedBtn: {
    flex: 1.2,
  },
  actionBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  centerStateText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 17,
  },
  emptySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  clearFiltersBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  clearFiltersText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
});

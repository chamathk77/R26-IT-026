import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
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
import { useSelector, useDispatch } from 'react-redux';
import { MainBottomTabParamList } from '../../navigation/MainBottomTabParamList';
import { AppDispatch, RootState, store } from '../../store/store';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { navigationRef } from '../../navigation/RootNavigation';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import CommonAlert from '../../components/CommonAlert';
import TablePickerGrid from '../../components/restaurant/TablePickerGrid';
import TableOrderDetailModal from '../../components/restaurant/TableOrderDetailModal';
import { useShopIndustry } from '../../hooks/useShopIndustry';
import { hasTableManagement } from '../../utils/industryHelper';
import { ShopTable, TablePickerItem, toTablePickerItems } from '../../type/table';
import { fetchTables_Service } from '../../services/TableService';
import {
  fetchCartItems_Service,
} from '../../services/CartService';
import { setActiveSession, setCartTabSelection } from '../../store/reducers/CartReducer';
import { CartSessionSummary } from '../../type/cart';
import { mapToActiveSession } from '../../utils/cartSession';
import {
  fetchAllSalesSummaryDashboard_Service,
  fetchBranchLoggedUserDashboard_Service,
} from '../../services/HomeStatsService';
import { AllSalesSummaryDashboard, TodaySalesStats } from '../../type/dashboard';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../utils/apiErrorAlert';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Home'>;

const EMPTY_USER_STATS: TodaySalesStats = { totalSales: 0, orderCount: 0 };
const EMPTY_ALL_SUMMARY: AllSalesSummaryDashboard = {
  totalSales: 0,
  orderCount: 0,
  branches: [],
};

function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString('en-LK')}`;
}

function isOwnerOrAdmin(role?: string): boolean {
  return role === 'owner' || role === 'admin';
}

function isOwner(role?: string): boolean {
  return role === 'owner';
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

function DashboardStatsSkeleton({
  showOwnerSummary,
  boneColor,
  cardColor,
}: {
  showOwnerSummary: boolean;
  boneColor: string;
  cardColor: string;
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

  const renderCard = (key: string) => (
    <View key={key} style={[styles.statCard, { backgroundColor: cardColor }]}>
      <SkeletonBone width={22} height={22} borderRadius={11} color={boneColor} opacity={pulse} />
      <SkeletonBone
        width="62%"
        height={12}
        borderRadius={6}
        color={boneColor}
        opacity={pulse}
        style={{ marginTop: 4 }}
      />
      <SkeletonBone
        width="78%"
        height={22}
        borderRadius={8}
        color={boneColor}
        opacity={pulse}
        style={{ marginTop: 4 }}
      />
    </View>
  );

  return (
    <View style={styles.statsBlock}>
      <View style={styles.statsRow}>
        {renderCard('user-sales')}
        {renderCard('user-orders')}
      </View>
      {showOwnerSummary ? (
        <View style={styles.statsRow}>
          {renderCard('all-sales')}
          {renderCard('all-orders')}
        </View>
      ) : null}
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const { shop } = useShopIndustry();
  const userRole = useSelector((state: RootState) => state.AuthReducer.Login.userData?.role);
  const showManageButtons = isOwnerOrAdmin(userRole);
  const showManageEmployees = isOwnerOrAdmin(userRole);
  const showTablePicker = hasTableManagement(shop);
  const showOwnerSummary = isOwner(userRole);

  const [tableItems, setTableItems] = useState<TablePickerItem[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesExpanded, setTablesExpanded] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TablePickerItem | null>(null);
  const [tableOrderModalVisible, setTableOrderModalVisible] = useState(false);

  const [userStats, setUserStats] = useState<TodaySalesStats>(EMPTY_USER_STATS);
  const [allSummary, setAllSummary] = useState<AllSalesSummaryDashboard>(EMPTY_ALL_SUMMARY);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const surface = paperTheme.colors.surface;
  const primary = paperTheme.colors.primary;

  const loadDashboardStats = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = Boolean(options?.silent);
      if (!silent) {
        setStatsLoading(true);
      }
      setStatsError(null);

      try {
        const branchUserStats = await fetchBranchLoggedUserDashboard_Service();
        setUserStats({
          totalSales: branchUserStats.totalSales,
          orderCount: branchUserStats.orderCount,
        });

        if (showOwnerSummary) {
          const summary = await fetchAllSalesSummaryDashboard_Service();
          setAllSummary(summary);
        } else {
          setAllSummary(EMPTY_ALL_SUMMARY);
        }
      } catch (error: unknown) {
        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) return;

        setUserStats(EMPTY_USER_STATS);
        setAllSummary(EMPTY_ALL_SUMMARY);
        const message = getApiErrorMessage(error, 'Could not load today sales stats');
        setStatsError(message);

        setTimeout(() => {
          show_Alert(
            'error',
            'Load failed',
            message,
            2,
            false,
            'Retry',
            () => {
              void loadDashboardStats();
            },
            'Cancel',
            () => {},
          );
        }, 150);
      } finally {
        if (!silent) {
          setStatsLoading(false);
        }
      }
    },
    [showOwnerSummary, show_Alert],
  );

  const loadTables = useCallback(async () => {
    if (!showTablePicker) {
      setTableItems([]);
      return;
    }

    setTablesLoading(true);
    try {
      const response = await dispatch(fetchTables_Service()).unwrap();
      const tables = Array.isArray(response.data) ? response.data : [];
      setTableItems(toTablePickerItems(tables as ShopTable[]));
    } catch (error: unknown) {
      setTableItems([]);

      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(error, 'Could not load table status.'),
        1,
        true,
        'OK',
      );
    } finally {
      setTablesLoading(false);
    }
  }, [dispatch, showTablePicker, show_Alert]);

  const handleTablePress = useCallback((table: TablePickerItem) => {
    setSelectedTable(table);
    setTableOrderModalVisible(true);
  }, []);

  const closeTableOrderModal = useCallback(() => {
    setTableOrderModalVisible(false);
    setSelectedTable(null);
  }, []);

  const handleOpenTableOrder = useCallback(
    (session: CartSessionSummary) => {
      closeTableOrderModal();

      if (session.status === 'pending') {
        dispatch(
          setActiveSession(
            mapToActiveSession({
              sessionId: session.sessionId,
              cartNumber: session.cartNumber,
              orderType: session.orderType,
              tableId: session.tableId,
              orderLabel: session.orderLabel,
            }),
          ),
        );
        void dispatch(
          fetchCartItems_Service({
            sessionId: session.sessionId,
            status: 'pending',
          }),
        );
        navigation.navigate('Products');
        return;
      }

      if (session.status === 'added') {
        dispatch(
          setCartTabSelection({
            sessionId: session.sessionId,
            cartNumber: session.cartNumber ?? null,
            orderType: session.orderType ?? null,
            orderLabel: session.orderLabel ?? '',
          }),
        );
        void dispatch(
          fetchCartItems_Service({
            sessionId: session.sessionId,
            status: 'added',
          }),
        );
        navigation.navigate('Cart');
      }
    },
    [closeTableOrderModal, dispatch, navigation],
  );

  const handleTableChanged = useCallback(
    (payload: {
      newTable: TablePickerItem;
      previousTableNumber: string;
      newTableNumber: string;
    }) => {
      setSelectedTable(payload.newTable);
      void loadTables();

      const { activeSession, cartTab } = store.getState().CartReducer;
      const sessionId = payload.newTable.occupiedSessionId;

      if (sessionId && activeSession.sessionId === sessionId) {
        dispatch(
          setActiveSession({
            ...activeSession,
            tableId: payload.newTable._id,
            orderLabel: payload.newTableNumber,
          }),
        );
      }

      if (sessionId && cartTab.sessionId === sessionId) {
        dispatch(
          setCartTabSelection({
            sessionId: cartTab.sessionId,
            cartNumber: cartTab.cartNumber,
            orderType: cartTab.orderType ?? null,
            orderLabel: payload.newTableNumber,
          }),
        );
      }
    },
    [dispatch, loadTables],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadDashboardStats({ silent: true }), loadTables()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboardStats, loadTables]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboardStats();
      void loadTables();
    }, [loadDashboardStats, loadTables]),
  );

  const confirmLogout = () => {
    show_Alert('error', 'Error', 'Are you sure you want to log out?', 2, true, 'OK', () => {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'OnboardingScreen' }],
        });
      }
    });
  };

  const showNotificationsComingSoon = () => {
    show_Alert(
      'pending',
      'Coming soon',
      'Notifications will be available in a future release.',
      1,
      false,
      'OK',
      () => {},
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={primary}
              colors={[primary]}
            />
          }
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: paperTheme.colors.onSurfaceVariant }]}>
                Welcome back
              </Text>
              <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>
                Smart POS
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Log out"
                style={[styles.iconBtn, { backgroundColor: surface }]}
                onPress={confirmLogout}
              >
                <Ionicons name="chevron-back" size={24} color={primary} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                style={[styles.iconBtn, { backgroundColor: surface }]}
                onPress={showNotificationsComingSoon}
              >
                <Ionicons name="notifications-outline" size={22} color={primary} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={[styles.iconBtn, { backgroundColor: surface }]}
                onPress={() => {
                  if (navigationRef.isReady()) {
                    navigationRef.navigate('Settings');
                  }
                }}
              >
                <Ionicons name="settings-outline" size={22} color={primary} />
              </TouchableOpacity>
            </View>
          </View>

          {statsLoading && !refreshing ? (
            <DashboardStatsSkeleton
              showOwnerSummary={showOwnerSummary}
              boneColor={paperTheme.colors.surfaceVariant}
              cardColor={surface}
            />
          ) : (
            <View style={styles.statsBlock}>
              {statsError ? (
                <Text style={[styles.statsError, { color: paperTheme.colors.error }]}>
                  {statsError}
                </Text>
              ) : null}
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: primary }]}>
                  <Ionicons name="wallet-outline" size={22} color={paperTheme.colors.onPrimary} />
                  <Text style={[styles.statLabel, { color: paperTheme.colors.onPrimary }]}>
                    Your sales today
                  </Text>
                  <Text style={[styles.statValue, { color: paperTheme.colors.onPrimary }]}>
                    {formatCurrency(userStats.totalSales)}
                  </Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: surface }]}>
                  <Ionicons name="receipt-outline" size={22} color={primary} />
                  <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Your orders today
                  </Text>
                  <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
                    {userStats.orderCount}
                  </Text>
                </View>
              </View>

              {showOwnerSummary ? (
                <View style={styles.statsRow}>
                  <View
                    style={[
                      styles.statCard,
                      { backgroundColor: paperTheme.colors.tertiaryContainer },
                    ]}
                  >
                    <Ionicons
                      name="trending-up-outline"
                      size={22}
                      color={paperTheme.colors.tertiary}
                    />
                    <Text
                      style={[styles.statLabel, { color: paperTheme.colors.onTertiaryContainer }]}
                    >
                      All branches sales
                    </Text>
                    <Text
                      style={[styles.statValue, { color: paperTheme.colors.onTertiaryContainer }]}
                    >
                      {formatCurrency(allSummary.totalSales)}
                    </Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: surface }]}>
                    <Ionicons name="layers-outline" size={22} color={primary} />
                    <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                      All branches orders
                    </Text>
                    <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
                      {allSummary.orderCount}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {showTablePicker ? (
            <View
              style={[
                styles.tableStatusBlock,
                { backgroundColor: surface, borderColor: `${primary}33` },
              ]}
            >
              <TouchableOpacity
                style={styles.tableStatusHeader}
                onPress={() => setTablesExpanded((prev) => !prev)}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityState={{ expanded: tablesExpanded }}
                accessibilityLabel={tablesExpanded ? 'Collapse table status' : 'Expand table status'}
              >
                <View style={[styles.tablePickerIconWrap, { backgroundColor: `${paperTheme.colors.tertiary}18` }]}>
                  <Ionicons name="restaurant-outline" size={20} color={paperTheme.colors.tertiary} />
                </View>
                <View style={styles.tablePickerTextWrap}>
                  <Text style={[styles.tablePickerTitle, { color: paperTheme.colors.onSurface }]}>
                    Table status
                  </Text>
                  <Text style={[styles.tablePickerSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                    {tablesExpanded
                      ? 'Green = free · Red = occupied · Tap a table for details'
                      : tablesLoading
                        ? 'Loading tables…'
                        : `${tableItems.length} table${tableItems.length === 1 ? '' : 's'} · Tap to expand`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.tableExpandBtn,
                    { backgroundColor: paperTheme.colors.surfaceVariant },
                  ]}
                >
                  <Ionicons
                    name={tablesExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={paperTheme.colors.onSurfaceVariant}
                  />
                </View>
              </TouchableOpacity>

              {tablesExpanded ? (
                <>
                  <View style={styles.tableLegendRow}>
                    <View style={styles.tableLegendItem}>
                      <View style={[styles.tableLegendDot, { backgroundColor: '#15803d' }]} />
                      <Text style={[styles.tableLegendText, { color: paperTheme.colors.onSurfaceVariant }]}>Free</Text>
                    </View>
                    <View style={styles.tableLegendItem}>
                      <View style={[styles.tableLegendDot, { backgroundColor: '#dc2626' }]} />
                      <Text style={[styles.tableLegendText, { color: paperTheme.colors.onSurfaceVariant }]}>Occupied</Text>
                    </View>
                  </View>

                  <TablePickerGrid
                    items={tableItems}
                    loading={tablesLoading}
                    scrollEnabled={false}
                    onSelectTable={handleTablePress}
                    emptyMessage="No tables yet. Add them in Settings → Manage tables."
                  />
                </>
              ) : null}
            </View>
          ) : null}

          {showManageButtons ? (
            <>
              <TouchableOpacity
                style={[styles.manageCategoryBtn, { backgroundColor: paperTheme.colors.primary }]}
                onPress={() => {
                  if (navigationRef.isReady()) {
                    navigationRef.navigate('ManageCatogory');
                  }
                }}
              >
                <Ionicons name="pricetags-outline" size={18} color={paperTheme.colors.onPrimary} />
                <Text style={[styles.manageCategoryBtnText, { color: paperTheme.colors.onPrimary }]}>
                  Manage Catogory
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.manageInventoryBtn, { backgroundColor: surface, borderColor: primary }]}
                onPress={() => {
                  if (navigationRef.isReady()) {
                    navigationRef.navigate('ManageInventory');
                  }
                }}
              >
                <Ionicons name="cube-outline" size={18} color={primary} />
                <Text style={[styles.manageInventoryBtnText, { color: primary }]}>
                  Manage Inventory
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {showManageEmployees ? (
            <TouchableOpacity
              style={[styles.manageEmployeesBtn, { backgroundColor: paperTheme.colors.secondaryContainer }]}
              onPress={() => {
                if (navigationRef.isReady()) {
                  navigationRef.navigate('ManageEmployees');
                }
              }}
            >
              <Ionicons name="people-outline" size={18} color={paperTheme.colors.onSecondaryContainer} />
              <Text
                style={[
                  styles.manageEmployeesBtnText,
                  { color: paperTheme.colors.onSecondaryContainer },
                ]}
              >
                Manage Employees
              </Text>
            </TouchableOpacity>
          ) : null}

          <View style={{ height: 24 }} />
        </ScrollView>
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

      <TableOrderDetailModal
        visible={tableOrderModalVisible}
        table={selectedTable}
        showTableManagement={showTablePicker}
        onClose={closeTableOrderModal}
        onOpenOrder={handleOpenTableOrder}
        onTableChanged={handleTableChanged}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
  },
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 26,
    marginTop: 2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statsBlock: {
    marginBottom: 8,
    gap: 12,
  },
  statsError: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  statLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    opacity: 0.95,
  },
  statValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    minHeight: 28,
  },
  tableStatusBlock: {
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  tableStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tableExpandBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableLegendRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tableLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tableLegendText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  tablePickerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tablePickerTextWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  tablePickerTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  tablePickerSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  manageCategoryBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  manageCategoryBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  manageInventoryBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 2,
  },
  manageInventoryBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  manageEmployeesBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  manageEmployeesBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
});

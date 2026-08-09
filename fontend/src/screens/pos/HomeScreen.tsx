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
import { useSelector } from 'react-redux';
import { MainBottomTabParamList } from '../../navigation/MainBottomTabParamList';
import { RootState } from '../../store/store';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { navigationRef } from '../../navigation/RootNavigation';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import CommonAlert from '../../components/CommonAlert';
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

export default function HomeScreen(_props: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const userRole = useSelector((state: RootState) => state.AuthReducer.Login.userData?.role);
  const showManageButtons = isOwnerOrAdmin(userRole);
  const showManageEmployees = isOwnerOrAdmin(userRole);
  const showOwnerSummary = isOwner(userRole);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboardStats({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboardStats]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboardStats();
    }, [loadDashboardStats]),
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

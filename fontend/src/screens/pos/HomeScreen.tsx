import React, { useCallback, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { MainBottomTabParamList } from '../../navigation/MainBottomTabParamList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { navigationRef } from '../../navigation/RootNavigation';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import CommonAlert from '../../components/CommonAlert';
import { fetchTodayHomeStats_Service } from '../../services/HomeStatsService';
import { TodayHomeStats } from '../../type/dashboard';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Home'>;

const EMPTY_TODAY_STATS: TodayHomeStats = {
  mine: { totalSales: 0, orderCount: 0 },
  all: { totalSales: 0, orderCount: 0 },
};

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function HomeScreen(_props: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const [todayStats, setTodayStats] = useState<TodayHomeStats>(EMPTY_TODAY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const surface = paperTheme.colors.surface;
  const primary = paperTheme.colors.primary;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadTodayStats = async () => {
        setStatsLoading(true);
        setStatsError(null);

        try {
          const stats = await fetchTodayHomeStats_Service();
          if (!active) return;
          setTodayStats(stats);
        } catch (error: unknown) {
          if (!active) return;
          setTodayStats(EMPTY_TODAY_STATS);
          setStatsError(error instanceof Error ? error.message : 'Could not load today sales stats');
        } finally {
          if (active) {
            setStatsLoading(false);
          }
        }
      };

      void loadTodayStats();

      return () => {
        active = false;
      };
    }, []),
  );

  const confirmLogout = () => {
   show_Alert
   ('error', 'Error', 'Are you sure you want to log out?', 2, true, 'OK', () => {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });
    }
   });
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
                onPress={() => {}}
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

          <View style={styles.statsBlock}>
            {statsError ? (
              <Text style={[styles.statsError, { color: paperTheme.colors.error }]}>{statsError}</Text>
            ) : null}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: primary }]}>
                <Ionicons name="wallet-outline" size={22} color={paperTheme.colors.onPrimary} />
                <Text style={[styles.statLabel, { color: paperTheme.colors.onPrimary }]}>
                  Your sales today
                </Text>
                <Text style={[styles.statValue, { color: paperTheme.colors.onPrimary }]}>
                  {statsLoading ? '—' : formatCurrency(todayStats.mine.totalSales)}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: surface }]}>
                <Ionicons name="receipt-outline" size={22} color={primary} />
                <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Your orders today
                </Text>
                <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
                  {statsLoading ? '—' : todayStats.mine.orderCount}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: paperTheme.colors.tertiaryContainer },
                ]}
              >
                <Ionicons name="trending-up-outline" size={22} color={paperTheme.colors.tertiary} />
                <Text style={[styles.statLabel, { color: paperTheme.colors.onTertiaryContainer }]}>
                  Total sales today
                </Text>
                <Text style={[styles.statValue, { color: paperTheme.colors.onTertiaryContainer }]}>
                  {statsLoading ? '—' : formatCurrency(todayStats.all.totalSales)}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: surface }]}>
                <Ionicons name="layers-outline" size={22} color={primary} />
                <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Total orders today
                </Text>
                <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
                  {statsLoading ? '—' : todayStats.all.orderCount}
                </Text>
              </View>
            </View>
          </View>

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
            <Text style={[styles.manageInventoryBtnText, { color: primary }]}>Manage Inventory</Text>
          </TouchableOpacity>

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
});

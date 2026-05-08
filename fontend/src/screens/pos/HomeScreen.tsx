import React from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainBottomTabParamList } from '../../navigation/MainBottomTabParamList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { navigationRef } from '../../navigation/RootNavigation';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Home'>;

export default function HomeScreen(_props: Props) {
  const { paperTheme, resolvedTheme } = useTheme();

  const surface = paperTheme.colors.surface;
  const primary = paperTheme.colors.primary;

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          if (navigationRef.isReady()) {
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'LoginScreen' }],
            });
          }
        },
      },
    ]);
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
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: primary }]}>
                <Ionicons name="wallet-outline" size={22} color={paperTheme.colors.onPrimary} />
                <Text style={[styles.statLabel, { color: paperTheme.colors.onPrimary }]}>
                  Your sales
                </Text>
                <Text style={[styles.statValue, { color: paperTheme.colors.onPrimary }]}>
                  $1,248.50
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: surface }]}>
                <Ionicons name="receipt-outline" size={22} color={primary} />
                <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Your total orders
                </Text>
                <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
                  42
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
                  Total sales
                </Text>
                <Text style={[styles.statValue, { color: paperTheme.colors.onTertiaryContainer }]}>
                  $48,920.00
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: surface }]}>
                <Ionicons name="layers-outline" size={22} color={primary} />
                <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Total orders
                </Text>
                <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
                  328
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
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
  },
});

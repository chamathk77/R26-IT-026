import React from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { useDummySession } from '../../context/DummySessionContext';
import CommonHeader from '../../components/CommonHeader/CommonHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const { currentUser, logoutSession } = useDummySession();

  const surface = paperTheme.colors.surface;
  const primary = paperTheme.colors.primary;

  const showManage =
    currentUser.role === 'owner' || currentUser.role === 'admin';

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => logoutSession(),
      },
    ]);
  };

  const goToModuleHub = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ModuleHub' }],
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
        <CommonHeader
          title="Settings"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.profileBanner, { backgroundColor: surface }]}>
            <View
              style={[styles.avatar, { backgroundColor: paperTheme.colors.primaryContainer }]}
            >
              <Text style={[styles.avatarText, { color: primary }]}>
                {currentUser.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileText}>
              <Text style={[styles.displayName, { color: paperTheme.colors.onSurface }]}>
                {currentUser.name}
              </Text>
              <Text style={[styles.roleHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: surface }]}
            onPress={() => navigation.navigate('ProfileDetails')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: paperTheme.colors.secondaryContainer }]}>
              <Ionicons name="person-outline" size={22} color={paperTheme.colors.secondary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                Profile details
              </Text>
              <Text style={[styles.cardDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                Name, phone, email & role
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={paperTheme.colors.outline} />
          </TouchableOpacity>

          {showManage ? (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: surface }]}
              onPress={() => navigation.navigate('ManageAccount')}
              activeOpacity={0.85}
            >
              <View style={[styles.iconCircle, { backgroundColor: paperTheme.colors.tertiaryContainer }]}>
                <Ionicons name="people-outline" size={22} color={paperTheme.colors.tertiary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                  Manage account
                </Text>
                <Text style={[styles.cardDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {currentUser.role === 'owner'
                    ? 'Admins & staff'
                    : 'Staff accounts'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={paperTheme.colors.outline} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.card, { backgroundColor: surface }]}
            onPress={() => navigation.navigate('ThemePreference')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: paperTheme.colors.primaryContainer }]}>
              <Ionicons name="color-palette-outline" size={22} color={primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                Change theme
              </Text>
              <Text style={[styles.cardDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                Light, dark, or match system
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={paperTheme.colors.outline} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: surface }]}
            onPress={goToModuleHub}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <Ionicons name="grid-outline" size={22} color={paperTheme.colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                Change module
              </Text>
              <Text style={[styles.cardDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                Back to hub — POS or Cost Management
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={paperTheme.colors.outline} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: surface }]}
            onPress={confirmLogout}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="log-out-outline" size={22} color="#b91c1c" />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                Log out
              </Text>
              <Text style={[styles.cardDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                End this session
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={paperTheme.colors.outline} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
  },
  profileText: {
    marginLeft: 14,
    flex: 1,
  },
  displayName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 20,
  },
  roleHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginTop: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  cardDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
});

import React from 'react';
import { ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../context/ThemeContext';
import { RootState } from '../../../../store/store';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import { settingsDetailStyles as styles } from '../../shared/settingsDetailStyles';
import {
  SettingsBadge,
  SettingsDetailRow,
  SettingsEmptyState,
  SettingsHeroCard,
  SettingsSection,
} from '../../shared/SettingsDetailComponents';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileDetails'>;

function formatValue(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value);
}

function capitalizeRole(role: string): string {
  if (!role) return '—';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileDetailsScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const user = useSelector((state: RootState) => state.AuthReducer.Login.userData);

  if (!user) {
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
            title="Profile"
            titleColor={paperTheme.colors.onBackground}
            iconColor={paperTheme.colors.onBackground}
            onPressLeftBtn={() => navigation.goBack()}
          />
          <SettingsEmptyState
            icon="person-outline"
            title="No profile data"
            description="Your profile loads when you sign in. Please log in again if this screen is empty."
            paperTheme={paperTheme}
          />
        </SafeAreaView>
      </>
    );
  }

  const roleLabel = capitalizeRole(user.role);

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
          title="Profile"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <SettingsHeroCard
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
            avatarText={initials(user.name)}
            title={user.name}
            subtitle={formatValue(user.email)}
            badges={
              <>
                <SettingsBadge label={roleLabel} tone="primary" paperTheme={paperTheme} />
                {user.shopId ? (
                  <SettingsBadge
                    label={String(user.shopId)}
                    tone="neutral"
                    paperTheme={paperTheme}
                  />
                ) : null}
              </>
            }
          />

          <SettingsSection
            title="Account information"
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          >
            <SettingsDetailRow
              icon="person-outline"
              label="Full name"
              value={formatValue(user.name)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="call-outline"
              label="Phone"
              value={formatValue(user.phone)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="mail-outline"
              label="Email"
              value={formatValue(user.email)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="shield-checkmark-outline"
              label="Role"
              value={roleLabel}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="storefront-outline"
              label="Shop ID"
              value={formatValue(user.shopId)}
              paperTheme={paperTheme}
              isLast
            />
          </SettingsSection>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

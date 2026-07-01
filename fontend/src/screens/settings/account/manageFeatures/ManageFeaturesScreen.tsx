import React from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../context/ThemeContext';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import {
  cardShadow,
  settingsDetailStyles as sharedStyles,
  settingsMenuStyles as menuStyles,
} from '../../shared/settingsDetailStyles';
import { manageFeaturesStyles as styles } from './manageFeaturesStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageFeatures'>;

type HubItem = {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
};

function HubMenuGroup({
  items,
  paperTheme,
  resolvedTheme,
}: {
  items: HubItem[];
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  return (
    <View
      style={[
        menuStyles.menuGroup,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          <TouchableOpacity style={menuStyles.menuItem} onPress={item.onPress} activeOpacity={0.75}>
            <View style={[menuStyles.iconCircle, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={20} color={item.iconColor} />
            </View>
            <View style={menuStyles.cardBody}>
              <Text style={[menuStyles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                {item.title}
              </Text>
              <Text style={[menuStyles.cardDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                {item.description}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={paperTheme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
          {index < items.length - 1 ? (
            <View
              style={[
                menuStyles.menuDivider,
                { backgroundColor: paperTheme.colors.outlineVariant },
              ]}
            />
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function ManageFeaturesScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const primary = paperTheme.colors.primary;

  const hubItems: HubItem[] = [
    {
      key: 'general-features',
      title: 'Manage general features',
      description: 'POS modules — KPI, analytics, cost, marketing & manual orders',
      icon: 'grid-outline',
      iconBg: '#fef3c7',
      iconColor: '#b45309',
      onPress: () => navigation.navigate('ManageGeneralFeatures'),
    },
    {
      key: 'sms-activation',
      title: 'SMS activation',
      description: 'Receipt SMS packages, usage & renewal settings',
      icon: 'chatbubble-ellipses-outline',
      iconBg: '#dbeafe',
      iconColor: '#1d4ed8',
      onPress: () => {},
    },
    {
      key: 'add-users',
      title: 'Add users',
      description: 'Increase staff capacity beyond your included user limit',
      icon: 'people-outline',
      iconBg: '#e0e7ff',
      iconColor: '#4338ca',
      onPress: () => navigation.navigate('ManageAddUsers'),
    },
  ];

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[sharedStyles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Manage features"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={sharedStyles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              cardShadow(resolvedTheme),
            ]}
          >
            <View style={[styles.heroAccent, { backgroundColor: primary }]} />
            <View style={styles.heroRow}>
              <View
                style={[styles.heroIcon, { backgroundColor: paperTheme.colors.primaryContainer }]}
              >
                <Ionicons name="options-outline" size={26} color={primary} />
              </View>
              <View style={styles.heroBody}>
                <Text style={[styles.heroTitle, { color: paperTheme.colors.onSurface }]}>
                  Feature settings
                </Text>
                <Text
                  style={[styles.heroSubtitle, { color: paperTheme.colors.onSurfaceVariant }]}
                >
                  Choose what you want to manage — general modules, SMS, or additional users.
                </Text>
              </View>
            </View>
          </View>

          <Text
            style={[menuStyles.menuSectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}
          >
            Options
          </Text>

          <HubMenuGroup
            items={hubItems}
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

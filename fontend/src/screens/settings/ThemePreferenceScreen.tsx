import React from 'react';
import {
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
import { useDispatch } from 'react-redux';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import { setTheme } from '../../store/reducers/SystemIntitializationReducer';
import { ThemeMode } from '../../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ThemePreference'>;

const OPTIONS: { mode: ThemeMode; label: string; icon: 'sunny-outline' | 'moon-outline' | 'phone-portrait-outline' }[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function ThemePreferenceScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const { paperTheme, resolvedTheme, currentThemeMode } = useTheme();

  const surface = paperTheme.colors.surface;

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
          title="Theme"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
            Choose how Smart POS looks. System follows your device setting.
          </Text>

          {OPTIONS.map(({ mode, label, icon }) => {
            const active = currentThemeMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.row,
                  { backgroundColor: surface, borderColor: paperTheme.colors.outline },
                  active && { borderColor: paperTheme.colors.primary, borderWidth: 2 },
                ]}
                onPress={() => dispatch(setTheme(mode))}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={icon}
                  size={24}
                  color={active ? paperTheme.colors.primary : paperTheme.colors.onSurfaceVariant}
                />
                <Text style={[styles.rowLabel, { color: paperTheme.colors.onSurface }]}>
                  {label}
                </Text>
                {active ? (
                  <Ionicons name="checkmark-circle" size={22} color={paperTheme.colors.primary} />
                ) : (
                  <View style={{ width: 22 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  sub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginBottom: 18,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    gap: 14,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
});

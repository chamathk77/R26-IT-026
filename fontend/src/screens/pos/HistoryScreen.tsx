import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainBottomTabParamList } from '../../navigation/MainBottomTabParamList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'History'>;

const MOCK_TX = [
  { id: '1', label: 'Sale #1042', amount: '$42.80', time: 'Today · 10:24 AM' },
  { id: '2', label: 'Sale #1041', amount: '$18.50', time: 'Today · 9:02 AM' },
  { id: '3', label: 'Refund #017', amount: '-$6.00', time: 'Yesterday · 4:15 PM' },
];

export default function HistoryScreen(_props: Props) {
  const { paperTheme, resolvedTheme } = useTheme();

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
        <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>History</Text>
        <Text style={[styles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
          Recent sales and refunds.
        </Text>
        <View style={styles.list}>
          {MOCK_TX.map((row) => (
            <View
              key={row.id}
              style={[styles.row, { backgroundColor: paperTheme.colors.surface }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                <Ionicons name="receipt" size={22} color={paperTheme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: paperTheme.colors.onSurface }]}>
                  {row.label}
                </Text>
                <Text style={[styles.rowTime, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {row.time}
                </Text>
              </View>
              <Text
                style={[
                  styles.rowAmount,
                  {
                    color:
                      row.amount.startsWith('-')
                        ? paperTheme.colors.error
                        : paperTheme.colors.primary,
                  },
                ]}
              >
                {row.amount}
              </Text>
            </View>
          ))}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16 },
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
    marginBottom: 8,
  },
  sub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginBottom: 20,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  rowTime: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  rowAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
});

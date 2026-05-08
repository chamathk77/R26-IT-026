import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import CommonHeader from '../../components/CommonHeader/CommonHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'CostAnalysis'>;

export default function CostAnalysisScreen({ navigation }: Props) {
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
        <CommonHeader
          title="Analysis"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />
        <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>
          Analysis
        </Text>
        <Text style={[styles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
          Trends, variance, and reporting will appear here.
        </Text>
        <View style={[styles.placeholder, { backgroundColor: paperTheme.colors.surface }]}>
          <Ionicons name="bar-chart-outline" size={52} color={paperTheme.colors.primary} />
          <Text style={[styles.placeholderText, { color: paperTheme.colors.onSurfaceVariant }]}>
            Connect cost data to visualize trends and margins.
          </Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16 },
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    marginBottom: 8,
    marginTop: 8,
  },
  sub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginBottom: 22,
  },
  placeholder: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    minHeight: 200,
  },
  placeholderText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 300,
  },
});

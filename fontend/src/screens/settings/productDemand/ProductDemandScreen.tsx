import React from 'react';
import { ScrollView, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { SettingsHeroCard } from '../shared/SettingsDetailComponents';
import ProductDemandSection from './novelty03ProductDemand/ProductDemandSection';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },
});

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDemand'>;

export default function ProductDemandScreen({ navigation }: Props) {
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
          title="Product demand"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SettingsHeroCard
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
            icon="cube-outline"
            title="Product demand forecast"
            subtitle="Predicted unit demand for your best-selling products, learned from daily and weekly sales patterns — so you know how much to stock or produce."
          />

          <ProductDemandSection />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

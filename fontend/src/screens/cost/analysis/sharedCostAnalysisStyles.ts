import { StyleSheet } from 'react-native';
import { fonts } from '../../../constants/fonts';

/** Shared layout for Cost Analysis bottom-tab placeholder screens (Demand, Behavior). */
export const sharedCostAnalysisStyles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    marginBottom: 8,
    marginTop: 8,
  },
  body: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  cardHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 300,
  },
});

import { StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export const onboardingStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  heading: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 26,
    marginBottom: 6,
  },
  subheading: {
    fontFamily: fonts.InterRegular,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  label: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  inputWrapper: {
    minHeight: 58,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontFamily: fonts.InterRegular,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  inputContent: {
    fontFamily: fonts.InterRegular,
    fontSize: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#6E3A29',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryButtonText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});

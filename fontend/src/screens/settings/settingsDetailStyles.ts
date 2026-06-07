import { Platform, StyleSheet } from 'react-native';
import { fonts } from '../../constants/fonts';

export function cardShadow(resolvedTheme: 'light' | 'dark') {
  if (Platform.OS === 'android') {
    return { elevation: resolvedTheme === 'dark' ? 0 : 2 };
  }
  return {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: resolvedTheme === 'dark' ? 0.18 : 0.08,
    shadowRadius: 14,
  };
}

export const settingsDetailStyles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -40,
    right: -30,
    opacity: 0.35,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  heroAvatarText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flex: 1,
    marginLeft: 16,
  },
  heroTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    lineHeight: 28,
  },
  heroSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailContent: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    lineHeight: 21,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
  },
  moduleTile: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    minHeight: 88,
    justifyContent: 'space-between',
  },
  moduleTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleTileLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginTop: 10,
  },
  moduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
    marginTop: 20,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export const settingsMenuStyles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 4,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    marginTop: 8,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -50,
    right: -40,
    opacity: 0.3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
  },
  profileText: {
    marginLeft: 16,
    flex: 1,
  },
  displayName: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    lineHeight: 28,
  },
  roleHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  roleBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  menuSectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  menuGroup: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 22,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  cardDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
});

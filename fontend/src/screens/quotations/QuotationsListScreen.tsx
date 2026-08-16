import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { AppDispatch } from '../../store/store';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import { fetchQuotations_Service } from '../../services/QuotationService';
import { QuotationRecord, QuotationStatus } from '../../type/quotation';
import { formatCheckoutAmount } from '../../type/checkoutPayment';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../utils/apiErrorAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../settings/shared/settingsDetailStyles';
import { SettingsEmptyState } from '../settings/shared/SettingsDetailComponents';

type Props = NativeStackScreenProps<RootStackParamList, 'QuotationsList'>;

const STATUS_STYLE: Record<QuotationStatus, { bg: string; text: string }> = {
  draft: { bg: '#f1f5f9', text: '#475569' },
  sent: { bg: '#dbeafe', text: '#1d4ed8' },
  accepted: { bg: '#dcfce7', text: '#15803d' },
  expired: { bg: '#ffedd5', text: '#c2410c' },
  cancelled: { bg: '#fee2e2', text: '#b91c1c' },
};

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusStyle(status: QuotationStatus) {
  return STATUS_STYLE[status] ?? STATUS_STYLE.draft;
}

export default function QuotationsListScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const summary = useMemo(() => {
    const totalValue = quotations.reduce((sum, item) => sum + (item.totalAmount ?? 0), 0);
    return { count: quotations.length, totalValue };
  }, [quotations]);

  const loadQuotations = useCallback(async () => {
    try {
      const response = await dispatch(fetchQuotations_Service()).unwrap();
      setQuotations(response.data ?? []);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;
      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(error, 'Could not load quotations.'),
        1,
        false,
        'OK',
        () => {},
      );
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void (async () => {
        await loadQuotations();
        if (!cancelled) setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [loadQuotations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadQuotations();
    setRefreshing(false);
  }, [loadQuotations]);

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[sharedStyles.safe, { backgroundColor: paperTheme.colors.background }]} edges={['top']}>
        <CommonHeader
          title="Quotations"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
          rightIcon="plus"
          onPressRightBtn={() => navigation.navigate('QuotationForm')}
        />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={quotations}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
            ListHeaderComponent={
              quotations.length > 0 ? (
                <View style={[styles.hero, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                  <View style={styles.heroStat}>
                    <Text style={[styles.heroStatValue, { color: paperTheme.colors.primary }]}>
                      {summary.count}
                    </Text>
                    <Text style={[styles.heroStatLabel, { color: paperTheme.colors.onPrimaryContainer }]}>
                      Quotes
                    </Text>
                  </View>
                  <View style={[styles.heroDivider, { backgroundColor: `${paperTheme.colors.primary}33` }]} />
                  <View style={styles.heroStat}>
                    <Text style={[styles.heroStatValue, { color: paperTheme.colors.primary }]}>
                      {formatCheckoutAmount(summary.totalValue)}
                    </Text>
                    <Text style={[styles.heroStatLabel, { color: paperTheme.colors.onPrimaryContainer }]}>
                      Combined value
                    </Text>
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <SettingsEmptyState
                paperTheme={paperTheme}
                title="No quotations yet"
                description="Create a price quote for a customer. You can include shop taxes on the total when needed."
                icon="clipboard-outline"
              />
            }
            renderItem={({ item }) => {
              const statusStyle = getStatusStyle(item.status);
              return (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outlineVariant },
                    cardShadow(resolvedTheme),
                  ]}
                >
                  <View style={[styles.cardAccent, { backgroundColor: paperTheme.colors.primary }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <View style={[styles.iconWrap, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                        <Ionicons name="document-text-outline" size={18} color={paperTheme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.number, { color: paperTheme.colors.onSurface }]}>
                          {item.quotationNumber}
                        </Text>
                        <Text style={[styles.customer, { color: paperTheme.colors.onSurfaceVariant }]} numberOfLines={1}>
                          {item.customerName.trim() || 'Walk-in customer'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color={paperTheme.colors.onSurfaceVariant} />
                        <Text style={[styles.meta, { color: paperTheme.colors.onSurfaceVariant }]}>
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                      <Text style={[styles.total, { color: paperTheme.colors.primary }]}>
                        {formatCheckoutAmount(item.totalAmount)}
                      </Text>
                    </View>

                    {item.includeTaxes && item.taxAmount > 0 ? (
                      <Text style={[styles.taxHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                        Includes taxes · {formatCheckoutAmount(item.taxAmount)}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => navigation.navigate('QuotationDetail', { quotationId: item._id })}
                      style={[styles.viewBtn, { backgroundColor: paperTheme.colors.primary }]}
                    >
                      <Ionicons name="eye-outline" size={18} color={paperTheme.colors.onPrimary} />
                      <Text style={[styles.viewBtnText, { color: paperTheme.colors.onPrimary }]}>View quotation</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}

        {alertConfig ? (
          <CommonAlert
            visible={visible}
            type={alertConfig.type}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            positiveButtonText={alertConfig.positiveButtonText}
            negativeButtonText={alertConfig.negativeButtonText}
            onPositivePress={alertConfig.onPositivePress}
            onNegativePress={alertConfig.onNegativePress}
            onClose={hideAlert}
            closeOnBackdropPress={alertConfig.closeOnBackdropPress}
            MoreDetails={alertConfig.MoreDetails}
            OtherDescirption={alertConfig.OtherDescirption}
            OtherButtonPress={alertConfig.OtherButtonPress}
            OtherButtonText={alertConfig.OtherButtonText}
          />
        ) : null}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  hero: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
  heroStatValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 22,
    marginBottom: 2,
  },
  heroStatLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardAccent: {
    height: 4,
  },
  cardBody: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  customer: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  total: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  taxHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 8,
  },
  viewBtn: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
});

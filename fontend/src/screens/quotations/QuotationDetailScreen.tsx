import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { useShopIndustry } from '../../hooks/useShopIndustry';
import { AppDispatch } from '../../store/store';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import {
  deleteQuotation_Service,
  fetchQuotationById_Service,
} from '../../services/QuotationService';
import { QuotationRecord } from '../../type/quotation';
import { formatCheckoutAmount } from '../../type/checkoutPayment';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../utils/apiErrorAlert';
import { shareQuotationPdf } from '../../utils/quotationPdf';
import { settingsDetailStyles as sharedStyles } from '../settings/shared/settingsDetailStyles';
import QuotationReceiptView from './components/QuotationReceiptView';

type Props = NativeStackScreenProps<RootStackParamList, 'QuotationDetail'>;

export default function QuotationDetailScreen({ navigation, route }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { shop } = useShopIndustry();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const { quotationId, justCreated } = route.params;
  const insets = useSafeAreaInsets();

  const [record, setRecord] = useState<QuotationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const loadQuotation = useCallback(async () => {
    try {
      const response = await dispatch(fetchQuotationById_Service(quotationId)).unwrap();
      setRecord(response.data);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;
      show_Alert(
        'error',
        'Load failed',
        getApiErrorMessage(error, 'Could not load this quotation.'),
        1,
        false,
        'OK',
        () => navigation.goBack(),
      );
    }
  }, [dispatch, navigation, quotationId, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void (async () => {
        await loadQuotation();
        if (!cancelled) setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [loadQuotation]),
  );

  const handleShare = useCallback(async () => {
    if (!record || sharing) return;

    setSharing(true);
    try {
      await shareQuotationPdf({ record, shop });
    } catch {
      show_Alert('error', 'Share failed', 'Could not generate or share the quotation PDF.', 1, false, 'OK', () => {});
    } finally {
      setSharing(false);
    }
  }, [record, sharing, shop, show_Alert]);

  const confirmDelete = useCallback(() => {
    show_Alert(
      'error',
      'Delete quotation',
      'This quotation will be permanently removed.',
      2,
      false,
      'Delete',
      () => {
        void (async () => {
          setDeleting(true);
          try {
            await dispatch(deleteQuotation_Service(quotationId)).unwrap();
            navigation.goBack();
          } catch (error: unknown) {
            const handled = await handleSessionExpiredApiError(error, show_Alert);
            if (handled) return;
            show_Alert(
              'error',
              'Delete failed',
              getApiErrorMessage(error, 'Could not delete this quotation.'),
              1,
              false,
              'OK',
              () => {},
            );
          } finally {
            setDeleting(false);
          }
        })();
      },
      'Cancel',
      () => {},
    );
  }, [dispatch, navigation, quotationId, show_Alert]);

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[sharedStyles.safe, { backgroundColor: paperTheme.colors.background }]} edges={['top']}>
        <CommonHeader
          title={record?.quotationNumber ?? 'Quotation'}
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
          rightIcon={record ? 'pencil' : undefined}
          onPressRightBtn={
            record
              ? () => navigation.navigate('QuotationForm', { quotation: record })
              : undefined
          }
        />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          </View>
        ) : record ? (
          <View style={styles.body}>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {justCreated ? (
                <View style={[styles.createdBanner, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                  <Ionicons name="checkmark-circle" size={20} color={paperTheme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.createdTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
                      Quotation created
                    </Text>
                    <Text style={[styles.createdText, { color: paperTheme.colors.onPrimaryContainer }]}>
                      Review the quote below and share it with your customer.
                    </Text>
                  </View>
                </View>
              ) : null}

              <QuotationReceiptView record={record} shop={shop} />

              <TouchableOpacity
                disabled={deleting}
                onPress={confirmDelete}
                style={[
                  styles.deleteBtn,
                  { backgroundColor: paperTheme.colors.errorContainer, opacity: deleting ? 0.7 : 1 },
                ]}
              >
                {deleting ? (
                  <ActivityIndicator color={paperTheme.colors.error} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
                    <Text style={[styles.deleteText, { color: paperTheme.colors.error }]}>Delete quotation</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>

            <SafeAreaView
              edges={['bottom']}
              style={[
                styles.footer,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderTopColor: paperTheme.colors.outlineVariant,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              <View style={styles.footerTotalWrap}>
                <Text style={[styles.footerLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Total</Text>
                <Text style={[styles.footerTotal, { color: paperTheme.colors.primary }]}>
                  {formatCheckoutAmount(record.totalAmount)}
                </Text>
              </View>
              <TouchableOpacity
                disabled={sharing}
                onPress={() => void handleShare()}
                style={[styles.shareBtn, { backgroundColor: paperTheme.colors.primary, opacity: sharing ? 0.7 : 1 }]}
              >
                {sharing ? (
                  <ActivityIndicator color={paperTheme.colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="share-social-outline" size={18} color={paperTheme.colors.onPrimary} />
                    <Text style={[styles.shareBtnText, { color: paperTheme.colors.onPrimary }]}>Share PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        ) : null}

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
  body: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  createdBanner: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  createdTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    marginBottom: 2,
  },
  createdText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  deleteBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerTotalWrap: {
    flex: 1,
  },
  footerLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  footerTotal: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 20,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    minWidth: 120,
  },
  shareBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
});

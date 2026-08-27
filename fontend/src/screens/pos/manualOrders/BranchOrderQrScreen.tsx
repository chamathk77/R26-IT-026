import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../store/store';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { fetchBranchOrderQr_Service } from '../../../services/ManualOrderService';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'BranchOrderQr'>;

const QR_SIZE = 240;

export default function BranchOrderQrScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const { data, loading, error } = useSelector(
    (state: RootState) => state.ManualOrderReducer.branchQr,
  );
  const [reloading, setReloading] = useState(false);

  const loadQr = useCallback(async () => {
    try {
      await dispatch(fetchBranchOrderQr_Service()).unwrap();
    } catch (apiError: unknown) {
      const handled = await handleSessionExpiredApiError(apiError, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'QR unavailable',
        getApiErrorMessage(apiError, 'Could not load the branch QR code.'),
        1,
        false,
        'OK',
      );
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadQr();
    }, [loadQr]),
  );

  const handleReload = useCallback(async () => {
    setReloading(true);
    try {
      await loadQr();
    } finally {
      setReloading(false);
    }
  }, [loadQr]);

  const handleShare = useCallback(async () => {
    if (!data?.orderUrl) return;
    try {
      await Share.share({
        message: `Order from ${data.shopName} (${data.branchName}): ${data.orderUrl}`,
        url: data.orderUrl,
      });
    } catch {
      // User cancelled the share sheet.
    }
  }, [data]);

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
          title="Branch order QR"
          onPressLeftBtn={() => navigation.goBack()}
          rightIcon="refresh"
          onPressRightBtn={() => void handleReload()}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading && !data ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            </View>
          ) : error && !data ? (
            <View
              style={[
                styles.card,
                { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.error },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={40} color={paperTheme.colors.error} />
              <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                QR unavailable
              </Text>
              <Text style={[styles.cardText, { color: paperTheme.colors.onSurfaceVariant }]}>
                {error}
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: paperTheme.colors.primary }]}
                onPress={() => void handleReload()}
                disabled={reloading}
              >
                <Text style={[styles.primaryBtnText, { color: paperTheme.colors.onPrimary }]}>
                  {reloading ? 'Retrying…' : 'Try again'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : data ? (
            <>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              >
                <Text style={[styles.shopName, { color: paperTheme.colors.onSurface }]}>
                  {data.shopName}
                </Text>
                <Text style={[styles.branchName, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {data.branchName} · {data.branchId}
                </Text>

                <View style={styles.qrWrap}>
                  <QRCode value={data.orderUrl} size={QR_SIZE} backgroundColor="#ffffff" color="#000000" />
                </View>

                <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]}>
                  Scan to order
                </Text>
                <Text style={[styles.cardText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Customers scan this at the table to open the menu. Their order lands in Manual
                  orders for you to check.
                </Text>
                <Text style={[styles.urlText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {data.orderUrl}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: paperTheme.colors.primary }]}
                onPress={() => void handleShare()}
              >
                <Ionicons name="share-outline" size={18} color={paperTheme.colors.onPrimary} />
                <Text style={[styles.primaryBtnText, { color: paperTheme.colors.onPrimary }]}>
                  Share order link
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: paperTheme.colors.primary }]}
                onPress={() => navigation.navigate('ManualOrders')}
              >
                <Ionicons name="receipt-outline" size={18} color={paperTheme.colors.primary} />
                <Text style={[styles.secondaryBtnText, { color: paperTheme.colors.primary }]}>
                  See manual orders
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {alertConfig && (
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
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  centered: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  shopName: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 19,
    textAlign: 'center',
  },
  branchName: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
  },
  qrWrap: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginVertical: 14,
  },
  cardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  cardText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  urlText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
});

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
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
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { fonts } from '../../../constants/fonts';
import { useDispatch, useSelector } from 'react-redux';
import { PaymentRecord, PaymentStatus } from '../../../type/payment';
import {
  fetchPaymentsByShop_Service,
  paymentSubmit_Service,
} from '../../../services/PaymentService';
import { AppDispatch, RootState } from '../../../store/store';
import { setLoginSession } from '../../../store/reducers/AuthReducer';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { handleSessionExpiredApiError } from '../../../utils/apiErrorAlert';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { cardShadow, settingsDetailStyles as styles } from '../shared/settingsDetailStyles';
import {
  SettingsBadge,
  SettingsDetailRow,
  SettingsSection,
} from '../shared/SettingsDetailComponents';
import { formatPaymentAmount } from '../../../utils/paymentBreakdown';

type Props = NativeStackScreenProps<RootStackParamList, 'PayNow'>;

type ShowAlertFn = (
  type: 'success' | 'error' | 'pending',
  title: string,
  message: string,
  buttons: 0 | 1 | 2,
  MoreDetails?: boolean,
  positiveButtonText?: string,
  onPositivePress?: () => void,
  negativeButtonText?: string,
  onNegativePress?: () => void,
) => void;

function showPermissionDeniedAlert(
  show_Alert: ShowAlertFn,
  {
    title,
    message,
    settingsMessage,
    canAskAgain,
  }: {
    title: string;
    message: string;
    settingsMessage: string;
    canAskAgain: boolean;
  },
) {
  if (!canAskAgain) {
    show_Alert(
      'error',
      title,
      settingsMessage,
      2,
      false,
      'Open Settings',
      () => {
        void Linking.openSettings();
      },
      'Cancel',
      () => {},
    );
    return;
  }

  show_Alert('error', title, message, 1, false, 'OK', () => {});
}

async function ensureMediaLibraryPermission(show_Alert: ShowAlertFn): Promise<boolean> {
  let permission = await ImagePicker.getMediaLibraryPermissionsAsync();

  if (!permission.granted && permission.canAskAgain) {
    permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  }

  if (permission.granted) {
    return true;
  }

  showPermissionDeniedAlert(show_Alert, {
    title: 'Photo library access required',
    message:
      'Please allow photo library access when prompted so you can choose a receipt image.',
    settingsMessage:
      'Photo library access is turned off. Open Settings and enable Photos permission for this app.',
    canAskAgain: permission.canAskAgain,
  });
  return false;
}

async function ensureCameraPermission(show_Alert: ShowAlertFn): Promise<boolean> {
  let permission = await ImagePicker.getCameraPermissionsAsync();

  if (!permission.granted && permission.canAskAgain) {
    permission = await ImagePicker.requestCameraPermissionsAsync();
  }

  if (permission.granted) {
    return true;
  }

  showPermissionDeniedAlert(show_Alert, {
    title: 'Camera access required',
    message:
      'Please allow camera access when prompted so you can take a photo of your receipt.',
    settingsMessage:
      'Camera access is turned off. Open Settings and enable Camera permission for this app.',
    canAskAgain: permission.canAskAgain,
  });
  return false;
}

function formatDateTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatAmount(amount: number | null): string {
  return formatPaymentAmount(amount);
}

function formatPaymentType(type: PaymentRecord['paymentType']): string {
  if (type === 'upFront') return 'Up-front';
  if (type === 'sms') return 'SMS';
  return 'Subscription';
}

function getPaymentTitle(payment: PaymentRecord): string {
  if (payment.paymentType === 'upFront') {
    return 'Up-front payment';
  }
  if (payment.paymentType === 'sms') {
    return 'SMS package billing';
  }
  return 'Subscription payment';
}

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPaymentMonth(month: string | null | undefined): string {
  if (!month) return '—';
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function getStatusMeta(status: PaymentStatus) {
  switch (status) {
    case 'approve':
      return { label: 'Approved', tone: 'success' as const };
    case 'pending':
      return { label: 'Pending', tone: 'warning' as const };
    case 'rejected':
      return { label: 'Rejected', tone: 'neutral' as const };
    case 'notPaid':
    default:
      return { label: 'Not paid', tone: 'neutral' as const };
  }
}

export default function PayNowScreen({ navigation, route }: Props) {
  const { payment } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const submitLoading = useSelector(
    (state: RootState) => state.PaymentReducer.submit.loading,
  );
  const userData = useSelector(
    (state: RootState) => state.AuthReducer.Login.userData,
  );
  const shopData = useSelector(
    (state: RootState) => state.AuthReducer.Login.shopData,
  );
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const statusMeta = getStatusMeta(payment.status);
  const isResubmit = payment.status === 'rejected';

  const pickFromGallery = useCallback(async () => {
    const hasPermission = await ensureMediaLibraryPermission(show_Alert);
    if (!hasPermission) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setReceiptUri(result.assets[0].uri);
    }
  }, [show_Alert]);

  const takePhoto = useCallback(async () => {
    const hasPermission = await ensureCameraPermission(show_Alert);
    if (!hasPermission) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setReceiptUri(result.assets[0].uri);
    }
  }, [show_Alert]);

  const handleSubmit = useCallback(async () => {
    if (!receiptUri) {
      show_Alert(
        'error',
        'Receipt required',
        'Please take a photo or choose an image from your gallery before submitting.',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    if (submitLoading) {
      return;
    }

    try {
      const response = await dispatch(
        paymentSubmit_Service({
          paymentId: payment._id,
          imageUri: receiptUri,
        }),
      ).unwrap();

      if (response.shop?.status && shopData && userData) {
        dispatch(
          setLoginSession({
            user: userData,
            shop: {
              ...shopData,
              status: response.shop.status,
            },
          }),
        );
      }

      if (payment.shopId) {
        await dispatch(fetchPaymentsByShop_Service(payment.shopId)).unwrap();
      }

      setTimeout(() => {
        show_Alert(
          'success',
          'Payment submitted',
          response.message || 'Your payment receipt was submitted successfully.',
          1,
          false,
          'OK',
          () => {
            navigation.goBack();
          },
        );
      }, 150);
    } catch (error: unknown) {
      console.log('error in handleSubmit', error);

      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: string }).message)
            : 'Could not submit payment. Please try again.';
        show_Alert('error', 'Submission failed', message, 1, false, 'OK', () => {});
      }, 150);
    }
  }, [
    dispatch,
    navigation,
    payment._id,
    payment.shopId,
    receiptUri,
    shopData,
    show_Alert,
    submitLoading,
    userData,
  ]);

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
          title="Pay now"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              screenStyles.summaryCard,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              cardShadow(resolvedTheme),
            ]}
          >
            <View
              style={[
                screenStyles.summaryIcon,
                { backgroundColor: paperTheme.colors.primaryContainer },
              ]}
            >
              <Ionicons
                name={payment.paymentType === 'sms' ? 'chatbubble-ellipses-outline' : 'card-outline'}
                size={28}
                color={paperTheme.colors.primary}
              />
            </View>
            <Text style={[screenStyles.summaryTitle, { color: paperTheme.colors.onSurface }]}>
              {getPaymentTitle(payment)}
            </Text>
            <Text
              style={[
                screenStyles.summaryReceipt,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              {payment.receiptNumber}
            </Text>
            <Text style={[screenStyles.summaryAmount, { color: paperTheme.colors.primary }]}>
              {formatAmount(payment.paymentAmount)}
            </Text>
            <View style={screenStyles.summaryBadgeRow}>
              <SettingsBadge
                label={statusMeta.label}
                tone={statusMeta.tone}
                paperTheme={paperTheme}
              />
            </View>
            <Text
              style={[
                screenStyles.summaryHint,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              {isResubmit
                ? 'Upload a new receipt image to resubmit this payment.'
                : 'Upload your bank transfer receipt to complete this payment.'}
            </Text>
          </View>

          <SettingsSection
            title="Payment details"
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
          >
            <SettingsDetailRow
              icon="layers-outline"
              label="Payment type"
              value={formatPaymentType(payment.paymentType)}
              paperTheme={paperTheme}
            />
            {payment.paymentType === 'sms' ? (
              <SettingsDetailRow
                icon="calendar-outline"
                label="Billing month"
                value={formatPaymentMonth(payment.paymentMonth)}
                paperTheme={paperTheme}
              />
            ) : null}
            {payment.paymentType === 'sms' && payment.exactPaymentDay ? (
              <SettingsDetailRow
                icon="alarm-outline"
                label="SMS renewal date"
                value={formatDate(payment.exactPaymentDay)}
                paperTheme={paperTheme}
              />
            ) : null}
            <SettingsDetailRow
              icon="cash-outline"
              label="Payment amount"
              value={formatAmount(payment.paymentAmount)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="flag-outline"
              label="Status"
              value={statusMeta.label}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="document-text-outline"
              label="Description"
              value={payment.description?.trim() || '—'}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="time-outline"
              label="Created at"
              value={formatDateTime(payment.createdAt)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="refresh-outline"
              label="Updated at"
              value={formatDateTime(payment.updatedAt)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="barcode-outline"
              label="Shop ID"
              value={payment.shopId}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="receipt-outline"
              label="Receipt number"
              value={payment.receiptNumber}
              paperTheme={paperTheme}
              isLast
            />
          </SettingsSection>

          <Text
            style={[
              screenStyles.uploadSectionLabel,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            Upload receipt
          </Text>

          <View
            style={[
              screenStyles.uploadCard,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              cardShadow(resolvedTheme),
            ]}
          >
            {receiptUri ? (
              <View style={screenStyles.previewWrap}>
                <Image
                  source={{ uri: receiptUri }}
                  style={screenStyles.previewImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={[
                    screenStyles.removeImageBtn,
                    { backgroundColor: paperTheme.colors.error },
                  ]}
                  onPress={() => setReceiptUri(null)}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={screenStyles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  screenStyles.uploadPlaceholder,
                  { backgroundColor: paperTheme.colors.surfaceVariant },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={40}
                  color={paperTheme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    screenStyles.uploadPlaceholderTitle,
                    { color: paperTheme.colors.onSurface },
                  ]}
                >
                  No receipt selected
                </Text>
                <Text
                  style={[
                    screenStyles.uploadPlaceholderDesc,
                    { color: paperTheme.colors.onSurfaceVariant },
                  ]}
                >
                  Take a clear photo of your payment receipt or choose one from your gallery.
                </Text>
              </View>
            )}

            <View style={screenStyles.uploadActions}>
              <TouchableOpacity
                style={[
                  screenStyles.uploadActionBtn,
                  {
                    backgroundColor: paperTheme.colors.primaryContainer,
                    borderColor: paperTheme.colors.primary,
                  },
                ]}
                onPress={() => void takePhoto()}
                activeOpacity={0.9}
              >
                <Ionicons name="camera-outline" size={22} color={paperTheme.colors.primary} />
                <Text
                  style={[
                    screenStyles.uploadActionText,
                    { color: paperTheme.colors.primary },
                  ]}
                >
                  Take photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  screenStyles.uploadActionBtn,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
                onPress={() => void pickFromGallery()}
                activeOpacity={0.9}
              >
                <Ionicons
                  name="images-outline"
                  size={22}
                  color={paperTheme.colors.onSurface}
                />
                <Text
                  style={[
                    screenStyles.uploadActionText,
                    { color: paperTheme.colors.onSurface },
                  ]}
                >
                  Choose gallery
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              screenStyles.submitButton,
              {
                backgroundColor:
                  receiptUri && !submitLoading
                    ? paperTheme.colors.primary
                    : paperTheme.colors.surfaceVariant,
              },
              submitLoading && screenStyles.submitButtonDisabled,
            ]}
            onPress={() => void handleSubmit()}
            disabled={!receiptUri || submitLoading}
            activeOpacity={0.9}
          >
            {submitLoading ? (
              <ActivityIndicator color={paperTheme.colors.onPrimary} />
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color={
                    receiptUri
                      ? paperTheme.colors.onPrimary
                      : paperTheme.colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[
                    screenStyles.submitButtonText,
                    {
                      color: receiptUri
                        ? paperTheme.colors.onPrimary
                        : paperTheme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {isResubmit ? 'Resubmit payment' : 'Submit payment'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {submitLoading && (
          <View style={screenStyles.loadingOverlay}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text
              style={[
                screenStyles.loadingText,
                { color: paperTheme.colors.onSurface },
              ]}
            >
              Submitting payment...
            </Text>
          </View>
        )}

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
            MoreDetails={alertConfig.MoreDetails}
            OtherDescirption={alertConfig.OtherDescirption}
            OtherButtonPress={alertConfig.OtherButtonPress}
            OtherButtonText={alertConfig.OtherButtonText}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const screenStyles = StyleSheet.create({
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  summaryReceipt: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 4,
  },
  summaryAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 28,
    marginTop: 10,
  },
  summaryBadgeRow: {
    marginTop: 12,
  },
  summaryHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 14,
  },
  uploadSectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  uploadCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  uploadPlaceholder: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  uploadPlaceholderTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  uploadPlaceholderDesc: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  previewWrap: {
    gap: 12,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  removeImageBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  removeImageText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    color: '#fff',
  },
  uploadActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  uploadActionBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadActionText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  submitButtonText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
    marginTop: 14,
    letterSpacing: 0.5,
  },
});

import React, { useCallback, useState } from 'react';
import {
  Image,
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
import { PaymentRecord, PaymentStatus } from '../../../type/payment';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { cardShadow, settingsDetailStyles as styles } from '../shared/settingsDetailStyles';
import {
  SettingsBadge,
  SettingsDetailRow,
  SettingsSection,
} from '../shared/SettingsDetailComponents';

type Props = NativeStackScreenProps<RootStackParamList, 'PayNow'>;

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(amount: number | null): string {
  if (amount == null) return '—';
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function formatPaymentMonth(month: string | null): string {
  if (!month) return '—';
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function getPaymentTitle(payment: PaymentRecord): string {
  if (payment.paymentType === 'upFront') {
    return 'Up-front payment';
  }
  return `${formatPaymentMonth(payment.paymentMonth)} subscription`;
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
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const statusMeta = getStatusMeta(payment.status);
  const isResubmit = payment.status === 'rejected';

  const pickFromGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      show_Alert(
        'error',
        'Permission required',
        'Photo library access is needed to choose a receipt image.',
        1,
        false,
        'OK',
        () => {},
      );
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
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      show_Alert(
        'error',
        'Permission required',
        'Camera access is needed to take a photo of your receipt.',
        1,
        false,
        'OK',
        () => {},
      );
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

  const handleSubmit = useCallback(() => {
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

    show_Alert(
      'pending',
      'Ready to submit',
      'Receipt image selected. Payment submission will be connected in the next step.',
      1,
      false,
      'OK',
      () => {},
    );
  }, [receiptUri, show_Alert]);

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
                name="card-outline"
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
              icon="barcode-outline"
              label="Shop ID"
              value={payment.shopId}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="layers-outline"
              label="Payment type"
              value={payment.paymentType === 'upFront' ? 'Up-front' : 'Subscription'}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="calendar-outline"
              label="Payment month"
              value={formatPaymentMonth(payment.paymentMonth)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="time-outline"
              label="Submitted date"
              value={formatDate(payment.submittedDate)}
              paperTheme={paperTheme}
            />
            <SettingsDetailRow
              icon="cash-outline"
              label="Due amount"
              value={formatAmount(payment.paymentAmount)}
              paperTheme={paperTheme}
              isLast
            />
          </SettingsSection>

          {payment.reason ? (
            <View
              style={[
                screenStyles.reasonCard,
                {
                  backgroundColor: resolvedTheme === 'dark' ? '#450a0a' : '#fef2f2',
                  borderColor: '#fecaca',
                },
              ]}
            >
              <View style={screenStyles.reasonHeader}>
                <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
                <Text style={screenStyles.reasonTitle}>Rejection reason</Text>
              </View>
              <Text style={screenStyles.reasonText}>{payment.reason}</Text>
            </View>
          ) : null}

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
                backgroundColor: receiptUri
                  ? paperTheme.colors.primary
                  : paperTheme.colors.surfaceVariant,
              },
            ]}
            onPress={handleSubmit}
            activeOpacity={0.9}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={20}
              color={receiptUri ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceVariant}
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
          </TouchableOpacity>
        </ScrollView>

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
  reasonCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reasonTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    color: '#dc2626',
  },
  reasonText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 20,
    color: '#b91c1c',
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
});

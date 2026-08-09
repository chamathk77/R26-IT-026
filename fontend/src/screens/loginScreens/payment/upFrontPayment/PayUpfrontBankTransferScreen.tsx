import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../context/ThemeContext';
import CommonHeader from '../../../../components/CommonHeader/CommonHeader';
import { AppDispatch, RootState } from '../../../../store/store';
import {
  fetchUpFrontPayment_Service,
  paymentSubmit_Service,
} from '../../../../services/PaymentService';
import { setLoginSession } from '../../../../store/reducers/AuthReducer';
import { useCommonAlert } from '../../../../hooks/useCommonAlert';
import { handleSessionExpiredApiError } from '../../../../utils/apiErrorAlert';
import CommonAlert from '../../../../components/CommonAlert/CommonAlert';
import { cardShadow } from '../../../settings/shared/settingsDetailStyles';
import { formatPaymentAmount } from '../../../../utils/paymentBreakdown';
import { payUpfrontStyles as styles } from './payUpfrontStyles';
import {
  getUpFrontHeroCardStyle,
  UpFrontPaymentStatusSection,
} from './UpFrontPaymentStatusSection';
import {
  pickReceiptFromGallery,
  takeReceiptPhoto,
} from './paymentReceiptUpload';
import { isInAppBillingAllowed } from '../../../../utils/platformBilling';
import { showIosBillingContactAlert } from '../../../../utils/iosBillingContactAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'PayUpfrontBankTransferScreen'>;

export default function PayUpfrontBankTransferScreen({ navigation, route }: Props) {
  const { payment } = route.params;
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const submitLoading = useSelector(
    (state: RootState) => state.PaymentReducer.submit.loading,
  );
  const userData = useSelector((state: RootState) => state.AuthReducer.Login.userData);
  const shopData = useSelector((state: RootState) => state.AuthReducer.Login.shopData);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const isResubmit = payment.status === 'rejected';
  const heroHighlightStyle = getUpFrontHeroCardStyle(payment, resolvedTheme);

  useFocusEffect(
    useCallback(() => {
      if (isInAppBillingAllowed) {
        return undefined;
      }

      showIosBillingContactAlert(show_Alert, {
        amount: payment.paymentAmount,
        receiptNumber: payment.receiptNumber,
        isResubmit,
      });
      navigation.goBack();
      return undefined;
    }, [
      isResubmit,
      navigation,
      payment.paymentAmount,
      payment.receiptNumber,
      show_Alert,
    ]),
  );

  const pickFromGallery = useCallback(async () => {
    const uri = await pickReceiptFromGallery(show_Alert);
    if (uri) {
      setReceiptUri(uri);
    }
  }, [show_Alert]);

  const takePhoto = useCallback(async () => {
    const uri = await takeReceiptPhoto(show_Alert);
    if (uri) {
      setReceiptUri(uri);
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

      await dispatch(fetchUpFrontPayment_Service()).unwrap();

      setTimeout(() => {
        show_Alert(
          'success',
          'Payment submitted',
          response.message || 'Your payment receipt was submitted successfully.',
          1,
          false,
          'OK',
          () => {
            navigation.navigate('PayUpfrontScreen');
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
    receiptUri,
    shopData,
    show_Alert,
    submitLoading,
    userData,
  ]);

  if (!isInAppBillingAllowed) {
    return null;
  }

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
          title="Bank transfer"
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
              styles.heroCard,
              heroHighlightStyle,
              cardShadow(resolvedTheme),
            ]}
          >
            <View
              style={[
                styles.heroIcon,
                { backgroundColor: paperTheme.colors.primaryContainer },
              ]}
            >
              <Ionicons name="card-outline" size={28} color={paperTheme.colors.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: paperTheme.colors.onSurface }]}>
              Up-front payment
            </Text>
            <Text
              style={[styles.heroReceipt, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              {payment.receiptNumber}
            </Text>
            <Text style={[styles.heroAmount, { color: paperTheme.colors.primary }]}>
              {formatPaymentAmount(payment.paymentAmount)}
            </Text>

            <UpFrontPaymentStatusSection
              payment={payment}
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            />

            <Text
              style={[styles.heroHint, { color: paperTheme.colors.onSurfaceVariant }]}
            >
              {isResubmit
                ? 'Upload a new receipt image to resubmit this payment.'
                : 'Transfer the amount to our bank account, then upload your payment receipt below.'}
            </Text>
          </View>

          <Text
            style={[
              styles.uploadSectionLabel,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            Upload receipt
          </Text>

          <View
            style={[
              styles.uploadCard,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              cardShadow(resolvedTheme),
            ]}
          >
            {receiptUri ? (
              <View style={styles.previewWrap}>
                <Image
                  source={{ uri: receiptUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={[
                    styles.removeImageBtn,
                    { backgroundColor: paperTheme.colors.error },
                  ]}
                  onPress={() => setReceiptUri(null)}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.uploadPlaceholder,
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
                    styles.uploadPlaceholderTitle,
                    { color: paperTheme.colors.onSurface },
                  ]}
                >
                  No receipt selected
                </Text>
                <Text
                  style={[
                    styles.uploadPlaceholderDesc,
                    { color: paperTheme.colors.onSurfaceVariant },
                  ]}
                >
                  Take a clear photo of your payment receipt or choose one from your gallery.
                </Text>
              </View>
            )}

            <View style={styles.uploadActions}>
              <TouchableOpacity
                style={[
                  styles.uploadActionBtn,
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
                  style={[styles.uploadActionText, { color: paperTheme.colors.primary }]}
                >
                  Take photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadActionBtn,
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
                  style={[styles.uploadActionText, { color: paperTheme.colors.onSurface }]}
                >
                  Choose gallery
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor:
                  receiptUri && !submitLoading
                    ? paperTheme.colors.primary
                    : paperTheme.colors.surfaceVariant,
              },
              submitLoading && styles.submitButtonDisabled,
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
                    styles.submitButtonText,
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

        {submitLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text
              style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}
            >
              Submitting payment...
            </Text>
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

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { TextInput as PaperTextInput } from 'react-native-paper';
import { Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../../../navigation/RootStackParamsList';
import { useTheme } from '../../../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../../../store/store';
import { patchLoginShopData } from '../../../../../store/reducers/AuthReducer';
import CommonHeader from '../../../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../../../hooks/useCommonAlert';
import {
  fetchShopUsersFeatures_Service,
  updateShopUsersFeatures_Service,
} from '../../../../../services/ShopOnboardingService';
import {
  ADDITIONAL_USER_MONTHLY_PRICE_LKR,
  DEFAULT_MAX_USERS,
  formatLkr,
} from '../../../../../type/onboarding';
import type { ShopUsersFeaturesPayload } from '../../../../../type/shopOnboarding';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../../../utils/apiErrorAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../../../shared/settingsDetailStyles';
import { manageUsersFeatureStyles as styles } from './manageUsersFeatureStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageAddUsers'>;

type UsersFormState = {
  isAdditionalUsersAdded: boolean;
  additionalUsersCount: string;
};

function buildSnapshot(form: UsersFormState): string {
  return JSON.stringify(form);
}

function toAdditionalUserCount(text: string): string {
  return text.replace(/\D/g, '').slice(0, 4);
}

function BooleanRadioToggle({
  value,
  onChange,
  trueLabel,
  falseLabel,
  paperTheme,
  resolvedTheme,
}: {
  value: boolean;
  onChange: (enabled: boolean) => void;
  trueLabel: string;
  falseLabel: string;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const options = [
    { label: trueLabel, enabled: true },
    { label: falseLabel, enabled: false },
  ];

  return (
    <View style={styles.radioRow}>
      {options.map((option) => {
        const selected = value === option.enabled;
        return (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.radioOption,
              {
                backgroundColor: selected
                  ? paperTheme.colors.surface
                  : paperTheme.colors.surfaceVariant,
                borderColor: selected ? paperTheme.colors.primary : 'transparent',
              },
              selected && cardShadow(resolvedTheme),
            ]}
            onPress={() => onChange(option.enabled)}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.radioOuter,
                {
                  borderColor: selected
                    ? paperTheme.colors.primary
                    : paperTheme.colors.outline,
                },
              ]}
            >
              {selected ? (
                <View
                  style={[styles.radioInner, { backgroundColor: paperTheme.colors.primary }]}
                />
              ) : null}
            </View>
            <Text
              style={[
                styles.radioLabel,
                {
                  color: selected
                    ? paperTheme.colors.onSurface
                    : paperTheme.colors.onSurfaceVariant,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  paperTheme,
  emphasize,
}: {
  label: string;
  value: string;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  emphasize?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryRowLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text
        style={[
          emphasize ? styles.summaryRowValueStrong : styles.summaryRowValue,
          { color: emphasize ? paperTheme.colors.primary : paperTheme.colors.onSurface },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ManageAddUsersScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const primary = paperTheme.colors.primary;

  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );

  const { loading: fetchLoading } = useSelector(
    (state: RootState) => state.shopOnboarding.shopUsersFeatures,
  );
  const { loading: updateLoading } = useSelector(
    (state: RootState) => state.shopOnboarding.updateUsersFeatures,
  );

  const [form, setForm] = useState<UsersFormState | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [loadedMaxUsers, setLoadedMaxUsers] = useState<number | null>(null);

  const parsedAdditionalUsers = useMemo(() => {
    if (!form) return 0;
    const value = parseInt(form.additionalUsersCount, 10);
    if (!form.additionalUsersCount.trim() || Number.isNaN(value) || value < 1) {
      return 0;
    }
    return value;
  }, [form]);

  const computedMaxUsers = useMemo(() => {
    if (!form?.isAdditionalUsersAdded || parsedAdditionalUsers < 1) {
      return DEFAULT_MAX_USERS;
    }
    return DEFAULT_MAX_USERS + parsedAdditionalUsers;
  }, [form?.isAdditionalUsersAdded, parsedAdditionalUsers]);

  const monthlyTotal = useMemo(() => {
    if (!form?.isAdditionalUsersAdded || parsedAdditionalUsers < 1) {
      return 0;
    }
    return parsedAdditionalUsers * ADDITIONAL_USER_MONTHLY_PRICE_LKR;
  }, [form?.isAdditionalUsersAdded, parsedAdditionalUsers]);

  const currentSnapshot = useMemo(() => {
    if (!form) return '';
    return buildSnapshot(form);
  }, [form]);

  const hasChanges = Boolean(form) && currentSnapshot !== savedSnapshot;
  const isSubmitting = updateLoading;
  const showLoader = fetchLoading && !form;

  const applyLoadedUsers = useCallback((features: ShopUsersFeaturesPayload) => {
    const loadedForm: UsersFormState = {
      isAdditionalUsersAdded: features.isAdditionalUsersAdded,
      additionalUsersCount:
        features.numAdditionalUsers != null ? String(features.numAdditionalUsers) : '',
    };
    setForm(loadedForm);
    setLoadedMaxUsers(features.maxUsers);
    setSavedSnapshot(buildSnapshot(loadedForm));
  }, []);

  const loadUsers = useCallback(async () => {
    if (!shopId) {
      setTimeout(() => {
        show_Alert(
          'error',
          'Error',
          'Shop not found. Please log in again.',
          1,
          false,
          'OK',
          () => {},
        );
      }, 150);
      return;
    }

    try {
      const response = await dispatch(fetchShopUsersFeatures_Service(String(shopId))).unwrap();
      applyLoadedUsers(response.features);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load user settings. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadUsers();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [applyLoadedUsers, dispatch, shopId, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadUsers();
    }, [loadUsers]),
  );

  const onToggleAdditionalUsers = (enabled: boolean) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            isAdditionalUsersAdded: enabled,
            additionalUsersCount: enabled ? prev.additionalUsersCount : '',
          }
        : prev,
    );
  };

  const onUpdate = async () => {
    if (!form || !shopId || isSubmitting || !hasChanges) {
      return;
    }

    if (form.isAdditionalUsersAdded && parsedAdditionalUsers < 1) {
      show_Alert(
        'error',
        'Validation',
        'Please enter how many additional users you need (minimum 1).',
        1,
        false,
        'OK',
        () => {},
      );
      return;
    }

    try {
      const response = await dispatch(
        updateShopUsersFeatures_Service({
          shopId: String(shopId),
          isAdditionalUsersAdded: form.isAdditionalUsersAdded,
          numAdditionalUsers: form.isAdditionalUsersAdded ? parsedAdditionalUsers : null,
        }),
      ).unwrap();

      dispatch(
        patchLoginShopData({
          maxUsers: response.features.maxUsers,
        }),
      );

      navigation.goBack();
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      show_Alert(
        'error',
        'Update failed',
        getApiErrorMessage(error, 'Could not update user settings. Please try again.'),
        2,
        false,
        'Try again',
        () => {
          void onUpdate();
        },
        'Cancel',
        () => {},
      );
    }
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[sharedStyles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Add users"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {showLoader ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading user settings…
            </Text>
          </View>
        ) : !form ? (
          <View style={styles.centered}>
            <Ionicons
              name="cloud-offline-outline"
              size={40}
              color={paperTheme.colors.onSurfaceVariant}
            />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
              Could not load user settings
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: primary }]}
              onPress={() => {
                void loadUsers();
              }}
              activeOpacity={0.9}
              disabled={fetchLoading}
            >
              {fetchLoading ? (
                <ActivityIndicator color={paperTheme.colors.onPrimary} />
              ) : (
                <Text style={[styles.retryButtonText, { color: paperTheme.colors.onPrimary }]}>
                  Retry
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={[
                sharedStyles.scroll,
                hasChanges && styles.scrollWithFooter,
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.usersHeroCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <View style={[styles.usersHeroIcon, { backgroundColor: '#e0e7ff' }]}>
                  <Ionicons name="people-outline" size={24} color="#4338ca" />
                </View>
                <View style={styles.usersHeroBody}>
                  <Text style={[styles.usersHeroTitle, { color: paperTheme.colors.onSurface }]}>
                    User capacity
                  </Text>
                  <Text
                    style={[
                      styles.usersHeroDesc,
                      { color: paperTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    {DEFAULT_MAX_USERS} users are included in your plan. Add more staff at{' '}
                    {formatLkr(ADDITIONAL_USER_MONTHLY_PRICE_LKR)}/month per additional user.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: paperTheme.colors.primaryContainer,
                    borderColor: paperTheme.colors.primary,
                  },
                ]}
              >
                <Text
                  style={[styles.summaryCardTitle, { color: paperTheme.colors.onPrimaryContainer }]}
                >
                  Current plan
                </Text>
                <SummaryRow
                  label="Included users"
                  value={String(DEFAULT_MAX_USERS)}
                  paperTheme={paperTheme}
                />
                <SummaryRow
                  label="Additional users"
                  value={
                    form.isAdditionalUsersAdded && parsedAdditionalUsers > 0
                      ? String(parsedAdditionalUsers)
                      : '0'
                  }
                  paperTheme={paperTheme}
                />
                <SummaryRow
                  label="Total capacity"
                  value={`${computedMaxUsers} users`}
                  paperTheme={paperTheme}
                  emphasize
                />
                {loadedMaxUsers != null && !hasChanges ? (
                  <Text
                    style={[
                      styles.savedCapacityHint,
                      { color: paperTheme.colors.onPrimaryContainer },
                    ]}
                  >
                    Saved on your account: {loadedMaxUsers} users
                  </Text>
                ) : null}
                {form.isAdditionalUsersAdded && parsedAdditionalUsers > 0 ? (
                  <>
                    <View
                      style={[
                        styles.summaryDivider,
                        { backgroundColor: paperTheme.colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.billingNote,
                        { color: paperTheme.colors.onPrimaryContainer },
                      ]}
                    >
                      You will be charged {formatLkr(ADDITIONAL_USER_MONTHLY_PRICE_LKR)} per
                      additional user each month.
                    </Text>
                    <SummaryRow
                      label="Monthly add-on total"
                      value={`${formatLkr(monthlyTotal)}/month`}
                      paperTheme={paperTheme}
                      emphasize
                    />
                    <Text
                      style={[
                        styles.billingBreakdown,
                        { color: paperTheme.colors.onPrimaryContainer },
                      ]}
                    >
                      {parsedAdditionalUsers} × {formatLkr(ADDITIONAL_USER_MONTHLY_PRICE_LKR)}
                    </Text>
                  </>
                ) : null}
              </View>

              <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Additional users
              </Text>

              <View
                style={[
                  styles.moduleCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: form.isAdditionalUsersAdded
                      ? '#6366f1'
                      : paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                {form.isAdditionalUsersAdded ? (
                  <View style={[styles.accentBar, { backgroundColor: '#6366f1' }]} />
                ) : null}
                <Text style={[styles.moduleTitle, { color: paperTheme.colors.onSurface }]}>
                  Need more users?
                </Text>
                <Text style={[styles.moduleDesc, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Enable this if you want to add staff beyond the {DEFAULT_MAX_USERS} included users.
                </Text>
                <BooleanRadioToggle
                  value={form.isAdditionalUsersAdded}
                  onChange={onToggleAdditionalUsers}
                  trueLabel="Yes"
                  falseLabel="No"
                  paperTheme={paperTheme}
                  resolvedTheme={resolvedTheme}
                />

                {form.isAdditionalUsersAdded ? (
                  <View
                    style={[
                      styles.expandedSection,
                      { borderTopColor: paperTheme.colors.outlineVariant },
                    ]}
                  >
                    <Text
                      style={[styles.inputLabel, { color: paperTheme.colors.onSurfaceVariant }]}
                    >
                      NUMBER OF ADDITIONAL USERS
                    </Text>
                    <View
                      style={[
                        styles.inputRow,
                        { backgroundColor: paperTheme.colors.surfaceVariant },
                      ]}
                    >
                      <Ionicons
                        name="person-add-outline"
                        size={20}
                        color={paperTheme.colors.onSurfaceVariant}
                      />
                      <PaperTextInput
                        style={styles.input}
                        mode="flat"
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        contentStyle={[
                          styles.inputContent,
                          { color: paperTheme.colors.onSurface },
                        ]}
                        placeholder="e.g. 2"
                        placeholderTextColor="#9b9ca5"
                        value={form.additionalUsersCount}
                        onChangeText={(text) =>
                          setForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  additionalUsersCount: toAdditionalUserCount(text),
                                }
                              : prev,
                          )
                        }
                        keyboardType="number-pad"
                        theme={paperTheme}
                        cursorColor={primary}
                        selectionColor={primary}
                        textColor={paperTheme.colors.onSurface}
                      />
                    </View>
                    <Text style={[styles.usersHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                      {parsedAdditionalUsers > 0
                        ? `Total capacity: ${DEFAULT_MAX_USERS} included + ${parsedAdditionalUsers} additional = ${computedMaxUsers} users`
                        : `Enter how many extra users you need above the ${DEFAULT_MAX_USERS} included.`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            {hasChanges ? (
              <View
                style={[
                  styles.footer,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <Text style={[styles.footerHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  You have unsaved changes
                </Text>
                <TouchableOpacity
                  style={[
                    styles.updateButton,
                    { backgroundColor: primary },
                    isSubmitting && styles.updateButtonDisabled,
                  ]}
                  onPress={() => {
                    void onUpdate();
                  }}
                  activeOpacity={0.9}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={paperTheme.colors.onPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name="save-outline"
                        size={20}
                        color={paperTheme.colors.onPrimary}
                      />
                      <Text
                        style={[styles.updateButtonText, { color: paperTheme.colors.onPrimary }]}
                      >
                        Update
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>

      {alertConfig ? (
        <Portal>
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
        </Portal>
      ) : null}
    </>
  );
}

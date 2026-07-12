import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Portal } from 'react-native-paper';
import { RootStackParamList } from '../../../../../navigation/RootStackParamsList';
import { fonts } from '../../../../../constants/fonts';
import { useTheme } from '../../../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../../../store/store';
import CommonHeader from '../../../../../components/CommonHeader/CommonHeader';
import CommonAlert from '../../../../../components/CommonAlert/CommonAlert';
import { useCommonAlert } from '../../../../../hooks/useCommonAlert';
import {
  createShopUser_Service,
  deleteShopUser_Service,
  fetchShopUsers_Service,
  updateShopUser_Service,
} from '../../../../../services/ManageUsersService';
import { ManageUserRole } from '../../../../../type/manageUser';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
  parseApiError,
} from '../../../../../utils/apiErrorAlert';
import { cardShadow } from '../../../shared/settingsDetailStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageUserForm'>;

const ROLE_OPTIONS: ManageUserRole[] = ['admin', 'staff'];

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  showToggle,
  onToggleSecure,
  paperTheme,
  resolvedTheme,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggleSecure?: () => void;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: paperTheme.colors.outlineVariant,
          },
          cardShadow(resolvedTheme),
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={paperTheme.colors.onSurfaceVariant}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          style={[styles.input, { color: paperTheme.colors.onSurface }]}
        />
        {showToggle ? (
          <TouchableOpacity onPress={onToggleSecure} hitSlop={12}>
            <Ionicons
              name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={paperTheme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function ManageUserFormScreen({ navigation, route }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const editingUserId = route.params?.userId;
  const isEditing = Boolean(editingUserId);

  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );
  const users = useSelector(
    (state: RootState) => state.ManageUsersReducer?.list?.items ?? [],
  );

  const existingUser = useMemo(
    () => users.find((user) => user._id === editingUserId),
    [users, editingUserId],
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<ManageUserRole>('staff');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(!isEditing);

  useFocusEffect(
    useCallback(() => {
      if (isEditing && !existingUser) {
        void dispatch(fetchShopUsers_Service());
      }
    }, [dispatch, existingUser, isEditing]),
  );

  useEffect(() => {
    if (!isEditing) {
      setName('');
      setEmail('');
      setPhoneNumber('');
      setRole('staff');
      setPassword('');
      setConfirmPassword('');
      setInitialLoaded(true);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && existingUser) {
      setName(existingUser.name);
      setEmail(existingUser.email);
      setPhoneNumber(existingUser.phoneNumber);
      setRole(
        existingUser.role === 'admin' ? 'admin' : 'staff',
      );
      setPassword('');
      setConfirmPassword('');
      setInitialLoaded(true);
    }
  }, [existingUser, isEditing]);

  useEffect(() => {
    if (isEditing && !existingUser && users.length > 0) {
      setTimeout(() => {
        show_Alert(
          'error',
          'User not found',
          'Could not find this user. Please go back and try again.',
          1,
          false,
          'OK',
          () => navigation.goBack(),
        );
      }, 150);
    }
  }, [existingUser, isEditing, navigation, show_Alert, users.length]);

  const validateForm = useCallback((): string | null => {
    if (!name.trim()) return 'Name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!phoneNumber.trim()) return 'Phone number is required.';
    if (!role) return 'Role is required.';

    if (!isEditing) {
      if (!password.trim() || !confirmPassword.trim()) {
        return 'Password and confirm password are required.';
      }
    } else if (password.trim() || confirmPassword.trim()) {
      if (!password.trim() || !confirmPassword.trim()) {
        return 'Enter both password fields to set a new password.';
      }
    }

    if (password.trim() && password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (password.trim() && password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    return null;
  }, [confirmPassword, email, isEditing, name, password, phoneNumber, role]);

  const handleSave = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      show_Alert('error', 'Validation', validationError, 1, false, 'OK', () => {});
      return;
    }

    if (!shopId) {
      show_Alert('error', 'Error', 'Shop not found. Please log in again.', 1, false, 'OK', () => {});
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingUserId) {
        await dispatch(
          updateShopUser_Service({
            userId: editingUserId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            role,
            password: password.trim() || undefined,
          }),
        ).unwrap();

        show_Alert(
          'success',
          'Saved',
          'User updated successfully.',
          1,
          false,
          'OK',
          () => navigation.goBack(),
        );
      } else {
        await dispatch(
          createShopUser_Service({
            shopId: String(shopId),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            role,
            password,
          }),
        ).unwrap();

        show_Alert(
          'success',
          'Created',
          'User account created successfully.',
          1,
          false,
          'OK',
          () => navigation.goBack(),
        );
      }
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      const parsed = parseApiError(error);
      const message =
        parsed.code === 'MAX_USERS_EXCEEDED'
          ? 'Your maximum user count is exceeded. Please contact admin.'
          : getApiErrorMessage(error, 'Could not save user. Please try again.');

      show_Alert('error', 'Save failed', message, 1, false, 'OK', () => {});
    } finally {
      setSaving(false);
    }
  }, [
    dispatch,
    editingUserId,
    email,
    isEditing,
    name,
    navigation,
    password,
    phoneNumber,
    role,
    shopId,
    show_Alert,
    validateForm,
  ]);

  const handleDelete = useCallback(() => {
    if (!editingUserId || !existingUser) return;

    show_Alert(
      'error',
      'Delete user?',
      `Are you sure you want to delete "${existingUser.name}"? This cannot be undone.`,
      2,
      false,
      'Delete',
      async () => {
        setDeleting(true);
        try {
          await dispatch(deleteShopUser_Service(editingUserId)).unwrap();
          show_Alert(
            'success',
            'Deleted',
            'User deleted successfully.',
            1,
            false,
            'OK',
            () => navigation.goBack(),
          );
        } catch (error: unknown) {
          const handled = await handleSessionExpiredApiError(error, show_Alert);
          if (handled) return;
          show_Alert(
            'error',
            'Delete failed',
            getApiErrorMessage(error, 'Could not delete user. Please try again.'),
            1,
            false,
            'OK',
            () => {},
          );
        } finally {
          setDeleting(false);
        }
      },
      'Cancel',
      () => {},
    );
  }, [dispatch, editingUserId, existingUser, navigation, show_Alert]);

  if (isEditing && !initialLoaded) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}>
        <CommonHeader
          title="Edit user"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
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
          title={isEditing ? 'Edit user' : 'New user'}
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: paperTheme.colors.primaryContainer,
                  borderColor: `${paperTheme.colors.primary}33`,
                },
              ]}
            >
              <Ionicons
                name={isEditing ? 'person-circle-outline' : 'person-add-outline'}
                size={28}
                color={paperTheme.colors.primary}
              />
              <Text style={[styles.heroTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
                {isEditing ? 'Update shop user' : 'Create shop user'}
              </Text>
              <Text style={[styles.heroSub, { color: paperTheme.colors.onPrimaryContainer }]}>
                {isEditing
                  ? 'Change details or set a new password without the old one.'
                  : 'Add an admin or staff member for your shop.'}
              </Text>
            </View>

            <FormField
              label="FULL NAME"
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            />
            <FormField
              label="PHONE NUMBER"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="07XXXXXXXX"
              keyboardType="phone-pad"
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            />
            <FormField
              label="EMAIL"
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            />

            <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
              ROLE
            </Text>
            <View style={styles.roleRow}>
              {ROLE_OPTIONS.map((option) => {
                const active = role === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: active
                          ? paperTheme.colors.primary
                          : paperTheme.colors.surface,
                        borderColor: active
                          ? paperTheme.colors.primary
                          : paperTheme.colors.outlineVariant,
                      },
                      cardShadow(resolvedTheme),
                    ]}
                    onPress={() => setRole(option)}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        {
                          color: active
                            ? paperTheme.colors.onPrimary
                            : paperTheme.colors.onSurface,
                        },
                      ]}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <FormField
              label={isEditing ? 'NEW PASSWORD (OPTIONAL)' : 'PASSWORD'}
              value={password}
              onChangeText={setPassword}
              placeholder={isEditing ? 'Leave blank to keep current' : 'Min. 6 characters'}
              secureTextEntry={!showPassword}
              showToggle
              onToggleSecure={() => setShowPassword((prev) => !prev)}
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            />
            <FormField
              label={isEditing ? 'CONFIRM NEW PASSWORD' : 'CONFIRM PASSWORD'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry={!showConfirmPassword}
              showToggle
              onToggleSecure={() => setShowConfirmPassword((prev) => !prev)}
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            />

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: paperTheme.colors.primary,
                  opacity: saving ? 0.7 : 1,
                },
              ]}
              onPress={() => void handleSave()}
              disabled={saving || deleting}
            >
              {saving ? (
                <ActivityIndicator color={paperTheme.colors.onPrimary} />
              ) : (
                <Text style={[styles.primaryBtnText, { color: paperTheme.colors.onPrimary }]}>
                  {isEditing ? 'Save changes' : 'Create user'}
                </Text>
              )}
            </TouchableOpacity>

            {isEditing ? (
              <TouchableOpacity
                style={[
                  styles.deleteBtn,
                  {
                    borderColor: '#fecaca',
                    backgroundColor: resolvedTheme === 'dark' ? '#450a0a' : '#fef2f2',
                    opacity: deleting ? 0.7 : 1,
                  },
                ]}
                onPress={handleDelete}
                disabled={saving || deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#dc2626" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    <Text style={styles.deleteBtnText}>Delete user</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
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
            MoreDetails={alertConfig.MoreDetails}
            OtherDescirption={alertConfig.OtherDescirption}
            OtherButtonPress={alertConfig.OtherButtonPress}
            OtherButtonText={alertConfig.OtherButtonText}
          />
        </Portal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    marginTop: 8,
    borderWidth: 1,
    gap: 6,
  },
  heroTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 17,
  },
  heroSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.9,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  label: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontFamily: fonts.InterRegular,
    fontSize: 16,
    paddingVertical: 12,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  roleChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 15,
    marginTop: 14,
  },
  deleteBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    color: '#dc2626',
  },
});

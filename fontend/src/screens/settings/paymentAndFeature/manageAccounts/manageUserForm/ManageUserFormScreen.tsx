import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
  fetchLoggedUserBranches_Service,
  fetchShopUsers_Service,
  updateShopUser_Service,
} from '../../../../../services/ManageUsersService';
import { ManageUserBranch, ManageUserRole } from '../../../../../type/manageUser';
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
  editable = true,
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
  editable?: boolean;
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
          editable={editable}
          style={[styles.input, { color: paperTheme.colors.onSurface }]}
        />
        {showToggle ? (
          <TouchableOpacity onPress={onToggleSecure} hitSlop={12} disabled={!editable}>
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
  const isOwnerUser = existingUser?.role === 'owner';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<ManageUserRole>('staff');
  const [availableBranches, setAvailableBranches] = useState<ManageUserBranch[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(!isEditing);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
      setSelectedBranchIds([]);
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
      setSelectedBranchIds(
        Array.isArray(existingUser.allowedBranchIds) ? existingUser.allowedBranchIds : [],
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

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadBranches = async () => {
      setBranchesLoading(true);
      try {
        const response = await dispatch(fetchLoggedUserBranches_Service()).unwrap();
        if (!isMounted) return;

        const branches = Array.isArray(response.data) ? response.data : [];
        setAvailableBranches(branches);
      } catch (error: unknown) {
        if (!isMounted) return;

        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) return;

        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load branches. Please try again.'),
          1,
          false,
          'OK',
          () => {},
        );
      } finally {
        if (isMounted) {
          setBranchesLoading(false);
        }
      }
    };

    void loadBranches();

    return () => {
      isMounted = false;
    };
  }, [dispatch, show_Alert]);

  const validateForm = useCallback((): string | null => {
    if (!name.trim()) return 'Name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!phoneNumber.trim()) return 'Phone number is required.';
    if (!role) return 'Role is required.';
    if (!selectedBranchIds.length) return 'Select at least one branch.';

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
  }, [confirmPassword, email, isEditing, name, password, phoneNumber, role, selectedBranchIds]);

  const ownerHasAllBranches =
    isOwnerUser &&
    (!existingUser?.allowedBranchIds?.length ||
      existingUser.allowedBranchIds.length >= availableBranches.length);

  const isBranchAssigned = useCallback(
    (branchId: string) => {
      if (isOwnerUser) {
        if (ownerHasAllBranches) return true;
        return selectedBranchIds.includes(branchId);
      }
      return selectedBranchIds.includes(branchId);
    },
    [isOwnerUser, ownerHasAllBranches, selectedBranchIds],
  );

  const selectedBranchCount = isOwnerUser
    ? ownerHasAllBranches
      ? availableBranches.length
      : selectedBranchIds.length
    : selectedBranchIds.length;

  const toggleBranchSelection = useCallback((branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (isOwnerUser) {
      show_Alert('error', 'Owner account', 'Owner account cannot be updated here.', 1, false, 'OK');
      return;
    }

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
            allowedBranchIds: selectedBranchIds,
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
            allowedBranchIds: selectedBranchIds,
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
    selectedBranchIds,
    shopId,
    show_Alert,
    validateForm,
    isOwnerUser,
  ]);

  const handleDelete = useCallback(() => {
    if (!editingUserId || !existingUser) return;
    if (existingUser.role === 'owner') {
      show_Alert('error', 'Owner account', 'Owner account cannot be deleted here.', 1, false, 'OK');
      return;
    }

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
          title={
            existingUser?.role === 'owner'
              ? 'View owner'
              : 'Edit user'
          }
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
          title={
            isOwnerUser ? 'View owner' : isEditing ? 'Edit user' : 'New user'
          }
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 80 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollIndicatorInsets={{ bottom: keyboardHeight > 0 ? keyboardHeight : 0 }}
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
                {isOwnerUser
                  ? 'Owner account'
                  : isEditing
                    ? 'Update shop user'
                    : 'Create shop user'}
              </Text>
              <Text style={[styles.heroSub, { color: paperTheme.colors.onPrimaryContainer }]}>
                {isOwnerUser
                  ? 'View-only. Owner details and branch access cannot be changed here.'
                  : isEditing
                    ? 'Update details and branch access. At least one branch is required.'
                    : 'Add an admin or staff member. Select at least one branch before creating.'}
              </Text>
            </View>

            <FormField
              label="FULL NAME"
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
              editable={!isOwnerUser}
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            />
            <FormField
              label="PHONE NUMBER"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="07XXXXXXXX"
              keyboardType="phone-pad"
              editable={!isOwnerUser}
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
              editable={!isOwnerUser}
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            />

            <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
              ROLE
            </Text>
            {isOwnerUser ? (
              <View
                style={[
                  styles.ownerRoleCard,
                  {
                    backgroundColor: paperTheme.colors.surface,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                  cardShadow(resolvedTheme),
                ]}
              >
                <Text style={[styles.ownerRoleText, { color: paperTheme.colors.onSurface }]}>
                  Owner
                </Text>
              </View>
            ) : (
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
                      onPress={() => {
                        if (!isOwnerUser) setRole(option);
                      }}
                      disabled={isOwnerUser}
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
            )}

            <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
              BRANCH ACCESS {availableBranches.length ? `(${selectedBranchCount}/${availableBranches.length})` : ''}
            </Text>
            <View style={styles.branchSection}>
              {branchesLoading ? (
                <View style={styles.branchLoadingRow}>
                  <ActivityIndicator size="small" color={paperTheme.colors.primary} />
                  <Text style={[styles.branchHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Loading shop branches...
                  </Text>
                </View>
              ) : availableBranches.length === 0 ? (
                <Text style={[styles.branchHint, { color: paperTheme.colors.error }]}>
                  No active branch found for this shop.
                </Text>
              ) : (
                <>
                  <Text style={[styles.branchHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                    {isOwnerUser
                      ? ownerHasAllBranches
                        ? 'Owner has access to all shop branches.'
                        : 'Branches assigned to this owner account.'
                      : 'Tap to assign or unassign branches. At least one branch is required.'}
                  </Text>
                  <View style={styles.branchList}>
                    {availableBranches.map((branch) => {
                      const assigned = isBranchAssigned(branch.branchId);
                      return (
                        <TouchableOpacity
                          key={branch.branchId}
                          style={[
                            styles.branchChip,
                            {
                              backgroundColor: assigned
                                ? `${paperTheme.colors.primary}18`
                                : paperTheme.colors.surface,
                              borderColor: assigned
                                ? paperTheme.colors.primary
                                : paperTheme.colors.outlineVariant,
                              opacity: isOwnerUser ? 0.95 : 1,
                            },
                            cardShadow(resolvedTheme),
                          ]}
                          onPress={() => {
                            if (!isOwnerUser) {
                              toggleBranchSelection(branch.branchId);
                            }
                          }}
                          disabled={isOwnerUser}
                          activeOpacity={isOwnerUser ? 1 : 0.85}
                        >
                          <View style={styles.branchChipHeader}>
                            <View
                              style={[
                                styles.branchCheck,
                                {
                                  borderColor: assigned
                                    ? paperTheme.colors.primary
                                    : paperTheme.colors.outline,
                                  backgroundColor: assigned
                                    ? paperTheme.colors.primary
                                    : 'transparent',
                                },
                              ]}
                            >
                              {assigned ? (
                                <Ionicons
                                  name="checkmark"
                                  size={14}
                                  color={paperTheme.colors.onPrimary}
                                />
                              ) : null}
                            </View>
                            <View style={styles.branchChipTextWrap}>
                              <Text
                                style={[
                                  styles.branchChipTitle,
                                  { color: paperTheme.colors.onSurface },
                                ]}
                              >
                                {branch.branchName}
                              </Text>
                              <Text
                                style={[
                                  styles.branchChipMeta,
                                  { color: paperTheme.colors.onSurfaceVariant },
                                ]}
                              >
                                {branch.branchId}
                                {branch.isMainBranch ? ' • Main branch' : ''}
                              </Text>
                              {branch.address ? (
                                <Text
                                  style={[
                                    styles.branchChipAddress,
                                    { color: paperTheme.colors.onSurfaceVariant },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {branch.address}
                                </Text>
                              ) : null}
                            </View>
                            {!isOwnerUser ? (
                              <Text
                                style={[
                                  styles.branchToggleLabel,
                                  {
                                    color: assigned
                                      ? paperTheme.colors.primary
                                      : paperTheme.colors.onSurfaceVariant,
                                  },
                                ]}
                              >
                                {assigned ? 'Assigned' : 'Tap to assign'}
                              </Text>
                            ) : assigned ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color={paperTheme.colors.primary}
                              />
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </View>

            {!isOwnerUser ? (
              <>
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
                  disabled={saving || deleting || branchesLoading}
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
              </>
            ) : (
              <View
                style={[
                  styles.readOnlyBanner,
                  {
                    backgroundColor: paperTheme.colors.surfaceVariant,
                    borderColor: paperTheme.colors.outlineVariant,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={paperTheme.colors.onSurfaceVariant}
                />
                <Text style={[styles.readOnlyBannerText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Owner account is read-only and cannot be updated or deleted.
                </Text>
              </View>
            )}
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
    flexGrow: 1,
    paddingHorizontal: 16,
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
  branchSection: {
    marginBottom: 18,
  },
  branchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  branchHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginBottom: 10,
  },
  branchList: {
    gap: 10,
  },
  branchChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  branchChipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  branchCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  branchChipTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  branchChipTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  branchChipMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  branchChipAddress: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginTop: 2,
  },
  branchToggleLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
    maxWidth: 72,
    textAlign: 'right',
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  readOnlyBannerText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  ownerRoleCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  ownerRoleText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
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

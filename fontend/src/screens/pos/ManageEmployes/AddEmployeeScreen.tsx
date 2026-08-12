import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import {
  createSalePerson_Service,
  fetchSalePersonById_Service,
  updateSalePerson_Service,
} from '../../../services/SalePersonService';
import { fetchLoggedUserBranches_Service } from '../../../services/ManageUsersService';
import { ManageUserBranch } from '../../../type/manageUser';
import { resetSalePersonDetail } from '../../../store/reducers/SalePersonReducer';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';
import { resolveProductImageUri } from '../../../utils/productImage';
import { softShadow } from '../ManageInventory/inventoryUiStyles';
import { Portal } from 'react-native-paper';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEmployee'>;

async function ensureMediaLibraryPermission(
  show_Alert: ReturnType<typeof useCommonAlert>['show_Alert'],
): Promise<boolean> {
  let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (permission.granted) return true;
  show_Alert(
    'error',
    'Photo library access required',
    permission.canAskAgain
      ? 'Please allow photo library access to choose an employee photo.'
      : 'Photo library access is turned off. Enable Photos permission for this app in Settings.',
    1,
    true,
    'OK',
  );
  return false;
}

async function ensureCameraPermission(
  show_Alert: ReturnType<typeof useCommonAlert>['show_Alert'],
): Promise<boolean> {
  let permission = await ImagePicker.getCameraPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await ImagePicker.requestCameraPermissionsAsync();
  }
  if (permission.granted) return true;
  show_Alert(
    'error',
    'Camera access required',
    permission.canAskAgain
      ? 'Please allow camera access to take an employee photo.'
      : 'Camera access is turned off. Enable Camera permission for this app in Settings.',
    1,
    true,
    'OK',
  );
  return false;
}

export default function AddEmployeeScreen({ navigation, route }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const editingId = route.params?.salePersonId;
  const isEditing = Boolean(editingId);
  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );
  const { loading: loadingDetail } = useSelector(
    (state: RootState) => state.SalePersonReducer.detail,
  );

  const [salePersonId, setSalePersonId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [availableBranches, setAvailableBranches] = useState<ManageUserBranch[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(!isEditing);

  const loadEmployee = useCallback(async () => {
    if (!editingId) return;

    if (!shopId) {
      setTimeout(() => {
        show_Alert(
          'error',
          'Error',
          'Shop not found. Please log in again.',
          1,
          false,
          'OK',
          () => navigation.goBack(),
        );
      }, 150);
      return;
    }

    try {
      const response = await dispatch(fetchSalePersonById_Service(editingId)).unwrap();
      const person = response.data;
      setSalePersonId(person.salePersonId);
      setFirstName(person.firstName);
      setLastName(person.lastName);
      setPosition(person.position);
      setSelectedBranchIds(
        Array.isArray(person.allowedBranchIds) ? person.allowedBranchIds : [],
      );
      setImageUri(resolveProductImageUri(person.image));
      setInitialLoaded(true);
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load employee. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadEmployee();
          },
          'Go back',
          () => navigation.goBack(),
        );
      }, 150);
    }
  }, [dispatch, editingId, navigation, shopId, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      if (isEditing) {
        void loadEmployee();
      }
      return () => {
        dispatch(resetSalePersonDetail());
      };
    }, [dispatch, isEditing, loadEmployee]),
  );

  useEffect(() => {
    if (!isEditing) {
      setSalePersonId('');
      setFirstName('');
      setLastName('');
      setPosition('');
      setSelectedBranchIds([]);
      setImageUri(null);
      setInitialLoaded(true);
    }
  }, [isEditing]);

  useEffect(() => {
    let isMounted = true;

    const loadBranches = async () => {
      setBranchesLoading(true);
      try {
        const response = await dispatch(fetchLoggedUserBranches_Service()).unwrap();
        if (!isMounted) return;
        setAvailableBranches(Array.isArray(response.data) ? response.data : []);
      } catch (error: unknown) {
        if (!isMounted) return;
        const handled = await handleSessionExpiredApiError(error, show_Alert);
        if (handled) return;
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(error, 'Could not load branches. Please try again.'),
          1,
          true,
          'OK',
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

  const toggleBranchSelection = useCallback((branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    );
  }, []);

  const pickFromGallery = useCallback(async () => {
    Keyboard.dismiss();
    const hasPermission = await ensureMediaLibraryPermission(show_Alert);
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, [show_Alert]);

  const takePhoto = useCallback(async () => {
    Keyboard.dismiss();
    const hasPermission = await ensureCameraPermission(show_Alert);
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, [show_Alert]);

  const validateForm = (): string | null => {
    if (!salePersonId.trim()) return 'Employee ID is required';
    if (!firstName.trim()) return 'First name is required';
    if (!lastName.trim()) return 'Last name is required';
    if (!position.trim()) return 'Position is required';
    if (!selectedBranchIds.length) return 'Select at least one branch.';
    return null;
  };

  const onSave = async () => {
    if (saving || branchesLoading || (isEditing && !initialLoaded)) return;

    const validationError = validateForm();
    if (validationError) {
      show_Alert('error', 'Error', validationError, 1, true, 'OK');
      return;
    }

    if (!shopId) {
      show_Alert('error', 'Error', 'Shop not found. Please log in again.', 1, true, 'OK');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingId) {
        await dispatch(
          updateSalePerson_Service({
            id: editingId,
            salePersonId: salePersonId.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            position: position.trim(),
            allowedBranchIds: selectedBranchIds,
            imageUri,
          }),
        ).unwrap();
        show_Alert('success', 'Success', 'Employee updated successfully.', 1, true, 'OK', () => {
          navigation.goBack();
        });
      } else {
        await dispatch(
          createSalePerson_Service({
            salePersonId: salePersonId.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            position: position.trim(),
            allowedBranchIds: selectedBranchIds,
            imageUri,
          }),
        ).unwrap();
        show_Alert('success', 'Success', 'Employee saved successfully.', 1, true, 'OK', () => {
          navigation.goBack();
        });
      }
    } catch (error: unknown) {
      const handled = await handleSessionExpiredApiError(error, show_Alert);
      if (handled) return;
      show_Alert(
        'error',
        'Error',
        getApiErrorMessage(error, 'Could not save employee. Please try again.'),
        1,
        true,
        'OK',
      );
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      color: paperTheme.colors.onSurface,
      backgroundColor: paperTheme.colors.surfaceVariant,
    },
  ];

  const displayImageUri = imageUri;

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
          title={isEditing ? 'Edit Employee' : 'Add Employee'}
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.primary}
          onPressLeftBtn={() => navigation.goBack()}
        />

        {isEditing && (loadingDetail || !initialLoaded) ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.photoCard,
                  { backgroundColor: paperTheme.colors.surface },
                  softShadow(resolvedTheme),
                ]}
              >
                <View style={[styles.photoPlaceholder, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                  {displayImageUri ? (
                    <Image source={{ uri: displayImageUri }} style={styles.photo} />
                  ) : (
                    <Ionicons name="person" size={48} color={paperTheme.colors.primary} />
                  )}
                </View>
                <Text style={[styles.photoHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Take a photo or choose one from your gallery
                </Text>

                <View style={styles.imageActionColumn}>
                  <TouchableOpacity
                    style={[
                      styles.imageActionBtn,
                      styles.imageActionBtnPrimary,
                      { backgroundColor: paperTheme.colors.primary },
                    ]}
                    onPress={() => {
                      void takePhoto();
                    }}
                    activeOpacity={0.88}
                  >
                    <View style={styles.imageActionIconCircle}>
                      <Ionicons name="camera" size={22} color={paperTheme.colors.primary} />
                    </View>
                    <View style={styles.imageActionLabelBlock}>
                      <Text style={[styles.imageActionBtnTitle, { color: paperTheme.colors.onPrimary }]}>
                        Take photo
                      </Text>
                      <Text style={[styles.imageActionBtnSub, { color: 'rgba(255,255,255,0.85)' }]}>
                        Open camera
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={paperTheme.colors.onPrimary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.imageActionBtn,
                      styles.imageActionBtnSecondary,
                      {
                        backgroundColor: paperTheme.colors.surface,
                        borderColor: paperTheme.colors.primary,
                      },
                    ]}
                    onPress={() => {
                      void pickFromGallery();
                    }}
                    activeOpacity={0.88}
                  >
                    <View
                      style={[
                        styles.imageActionIconCircle,
                        { backgroundColor: paperTheme.colors.primaryContainer },
                      ]}
                    >
                      <Ionicons name="images" size={22} color={paperTheme.colors.primary} />
                    </View>
                    <View style={styles.imageActionLabelBlock}>
                      <Text style={[styles.imageActionBtnTitle, { color: paperTheme.colors.onSurface }]}>
                        Choose gallery
                      </Text>
                      <Text style={[styles.imageActionBtnSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                        Pick from device
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={paperTheme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={[
                  styles.formCard,
                  { backgroundColor: paperTheme.colors.surface },
                  softShadow(resolvedTheme),
                ]}
              >
                <Text style={[styles.shopBadge, { color: paperTheme.colors.primary }]}>
                  Shop {shopId.toUpperCase() || '—'}
                </Text>

                <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Employee ID
                </Text>
                <TextInput
                  value={salePersonId}
                  onChangeText={(value) => setSalePersonId(value.toUpperCase())}
                  placeholder="e.g. SP005"
                  placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                  autoCapitalize="characters"
                  style={inputStyle}
                />

                <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
                  First name
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                  autoCapitalize="words"
                  style={inputStyle}
                />

                <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Last name
                </Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                  autoCapitalize="words"
                  style={inputStyle}
                />

                <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Position
                </Text>
                <TextInput
                  value={position}
                  onChangeText={setPosition}
                  placeholder="e.g. Sales Executive"
                  placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                  style={inputStyle}
                />
              </View>

              <View
                style={[
                  styles.branchCard,
                  { backgroundColor: paperTheme.colors.surface },
                  softShadow(resolvedTheme),
                ]}
              >
                <View style={styles.branchCardHeader}>
                  <View style={[styles.branchIconWrap, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                    <Ionicons name="git-branch-outline" size={18} color={paperTheme.colors.primary} />
                  </View>
                  <View style={styles.branchHeaderText}>
                    <Text style={[styles.branchCardTitle, { color: paperTheme.colors.onSurface }]}>
                      Branch access
                    </Text>
                    <Text style={[styles.branchCardSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                      {availableBranches.length
                        ? `${selectedBranchIds.length} of ${availableBranches.length} selected`
                        : 'Assign at least one branch'}
                    </Text>
                  </View>
                </View>

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
                      Tap to assign or unassign branches. At least one branch is required before saving.
                    </Text>
                    <View style={styles.branchList}>
                      {availableBranches.map((branch) => {
                        const assigned = selectedBranchIds.includes(branch.branchId);
                        return (
                          <TouchableOpacity
                            key={branch.branchId}
                            style={[
                              styles.branchChip,
                              {
                                backgroundColor: assigned
                                  ? `${paperTheme.colors.primary}18`
                                  : paperTheme.colors.surfaceVariant,
                                borderColor: assigned
                                  ? paperTheme.colors.primary
                                  : paperTheme.colors.outlineVariant,
                              },
                            ]}
                            onPress={() => toggleBranchSelection(branch.branchId)}
                            activeOpacity={0.85}
                          >
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
                                style={[styles.branchChipTitle, { color: paperTheme.colors.onSurface }]}
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
                            </View>
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
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={saving || branchesLoading}
                onPress={() => {
                  void onSave();
                }}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: paperTheme.colors.primary,
                    opacity: saving ? 0.7 : 1,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={paperTheme.colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={paperTheme.colors.onPrimary} />
                    <Text style={[styles.saveBtnText, { color: paperTheme.colors.onPrimary }]}>
                      {isEditing ? 'Update employee' : 'Save employee'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      <Portal>
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
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  photoCard: {
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  photoPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: 112,
    height: 112,
    borderRadius: 28,
  },
  photoHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    textAlign: 'center',
  },
  imageActionColumn: {
    width: '100%',
    gap: 10,
  },
  imageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  imageActionBtnPrimary: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  imageActionBtnSecondary: {
    borderWidth: 2,
  },
  imageActionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageActionLabelBlock: {
    flex: 1,
    minWidth: 0,
  },
  imageActionBtnTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  imageActionBtnSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginTop: 1,
  },
  formCard: {
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  shopBadge: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  label: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  branchCard: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  branchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  branchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchHeaderText: {
    flex: 1,
    gap: 2,
  },
  branchCardTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  branchCardSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  branchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  branchHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  branchList: {
    gap: 10,
  },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  branchCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  branchToggleLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
    maxWidth: 72,
    textAlign: 'right',
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    minHeight: 52,
  },
  saveBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
});

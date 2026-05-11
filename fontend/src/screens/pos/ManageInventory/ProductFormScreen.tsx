import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../store/store';
import { createProduct_Service, updateProduct_Service } from '../../../services/ProductService';
import { Category } from '../../../type/category';
import { InventoryProductFormParams } from '../../../type/inventory';
import { resolveProductImageUri } from '../../../utils/productImage';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import CommonAlert from '../../../components/CommonAlert';

type FormMode = 'add' | 'edit';

type EditSnapshot = {
  name: string;
  categoryId: string;
  price: string;
  imageUri: string | null;
};

function isLocalImageUri(uri: string): boolean {
  return /^(file|content|ph|assets-library):\/\//i.test(uri);
}

type ProductFormContentProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  mode: FormMode;
  initial?: InventoryProductFormParams;
};

function thunkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function ProductFormContent({ navigation, mode, initial }: ProductFormContentProps) {
  const { paperTheme, resolvedTheme } = useTheme();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((state: RootState) => state.CategoryReducer.list.items);


  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [price, setPrice] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<EditSnapshot | null>(null);

  useEffect(() => {
    if (mode === 'edit' && initial) {
      const resolvedImage = resolveProductImageUri(initial.image);
      const nextPrice = String(initial.unitPrice);
      setName(initial.name);
      setCategoryId(initial.categoryId);
      setPrice(nextPrice);
      setImageUri(resolvedImage);
      setInitialSnapshot({
        name: initial.name.trim(),
        categoryId: initial.categoryId,
        price: nextPrice,
        imageUri: resolvedImage,
      });
    } else {
      setName('');
      setCategoryId('');
      setPrice('');
      setImageUri(null);
      setInitialSnapshot(null);
    }
  }, [mode, initial?.id, initial?.name, initial?.categoryId, initial?.unitPrice, initial?.image]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id === categoryId),
    [categories, categoryId],
  );

  const isDirty = useMemo(() => {
    if (mode !== 'edit' || !initialSnapshot) return true;
    return (
      name.trim() !== initialSnapshot.name ||
      categoryId !== initialSnapshot.categoryId ||
      price !== initialSnapshot.price ||
      imageUri !== initialSnapshot.imageUri
    );
  }, [mode, initialSnapshot, name, categoryId, price, imageUri]);

  const canSave = useMemo(() => {
    if (mode === 'edit') return isDirty;
    return true;
  }, [mode, isDirty]);

  const onSave = async () => {
    if (!canSave || saving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      show_Alert
      ('error', 'Error', 'Missing name', 1, true, 'OK');
      return;
    }
    if (!categoryId) {
      show_Alert
      ('error', 'Error', 'Missing category', 1, true, 'OK');
      return;
    }

    const priceNum = Number(price);
    if (price.trim() === '' || Number.isNaN(priceNum) || priceNum < 0) {
      show_Alert
      ('error', 'Error', 'Invalid price', 1, true, 'OK');
      return;
    }

    const payload = {
      name: trimmedName,
      category: categoryId,
      price: priceNum,
      imageUri: imageUri && isLocalImageUri(imageUri) ? imageUri : null,
    };

    setSaving(true);
    try {
      if (mode === 'edit' && initial?.id) {
        await dispatch(
          updateProduct_Service({
            id: initial.id,
            ...payload,
          }),
        ).unwrap();
    show_Alert
    ('success', 'Success', 'Product updated successfully.', 1, true, 'OK');


      } else {
        await dispatch(createProduct_Service(payload)).unwrap();
    show_Alert
    ('success', 'Success', 'Product saved successfully.', 1, true, 'OK');
      }
    } catch (error: any) {
    show_Alert
    ('error', 'Error', error.message, 1, true, 'OK');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      show_Alert
      ('error', 'Error', 'Photo access needed', 1, true, 'OK');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: paperTheme.colors.surface }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color={paperTheme.colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>
                {mode === 'add' ? 'Add product' : 'Edit product'}
              </Text>
              <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
                Name, category, price, and product image
              </Text>
            </View>
          </View>

          {mode === 'edit' && initial ? (
            <View style={[styles.metaBanner, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <Text style={[styles.metaText, { color: paperTheme.colors.onSurfaceVariant }]}>
                Product ID {initial.id}
              </Text>
            </View>
          ) : null}

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Product name"
              placeholderTextColor={paperTheme.colors.onSurfaceVariant}
              style={[
                styles.input,
                { color: paperTheme.colors.onSurface, backgroundColor: paperTheme.colors.surface },
              ]}
            />

            <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>Category</Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.selectRow,
                { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outline },
              ]}
              onPress={() => setCategoryModalVisible(true)}
              activeOpacity={0.85}
            >
              {selectedCategory ? (
                <View style={styles.selectInner}>
                  <View style={[styles.catDot, { backgroundColor: selectedCategory.colorCode }]} />
                  <Text style={[styles.selectText, { color: paperTheme.colors.onSurface }]}>
                    {selectedCategory.name}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.selectPlaceholder, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Select a category
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={paperTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>Price</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={paperTheme.colors.onSurfaceVariant}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { color: paperTheme.colors.onSurface, backgroundColor: paperTheme.colors.surface },
              ]}
            />

            <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>Image</Text>
            <TouchableOpacity
              style={[
                styles.imageBox,
                imageUri && styles.imageBoxFilled,
                {
                  borderColor: paperTheme.colors.outline,
                  backgroundColor: paperTheme.colors.surface,
                },
              ]}
              onPress={pickImage}
              activeOpacity={0.85}
            >
              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="images-outline" size={22} color={paperTheme.colors.onPrimary} />
                    <Text style={[styles.imageOverlayText, { color: paperTheme.colors.onPrimary }]}>
                      Tap to change photo
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="image-outline" size={36} color={paperTheme.colors.primary} />
                  <Text style={[styles.imageBoxTitle, { color: paperTheme.colors.onSurface }]}>
                    Add product image
                  </Text>
                  <Text style={[styles.imageBoxHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Choose a photo from your device
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {imageUri ? (
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImageUri(null)}
                activeOpacity={0.85}
              >
                <Ionicons name="trash-outline" size={18} color={paperTheme.colors.error} />
                <Text style={[styles.removeImageText, { color: paperTheme.colors.error }]}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}

            {canSave ? (
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: paperTheme.colors.primary },
                  saving && styles.saveBtnDisabled,
                ]}
                onPress={onSave}
                activeOpacity={0.9}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={paperTheme.colors.onPrimary} />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={20} color={paperTheme.colors.onPrimary} />
                )}
                <Text style={[styles.saveBtnText, { color: paperTheme.colors.onPrimary }]}>
                  {saving ? 'Saving...' : mode === 'add' ? 'Save product' : 'Save changes'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          <Modal
            visible={categoryModalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setCategoryModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setCategoryModalVisible(false)}
            >
              <View
                style={[styles.modalSheet, { backgroundColor: paperTheme.colors.surface }]}
                onStartShouldSetResponder={() => true}
              >
                <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>Select category</Text>
                <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                  {categories.length === 0 ? (
                    <Text style={[styles.modalEmpty, { color: paperTheme.colors.onSurfaceVariant }]}>
                      No categories loaded. Pull to refresh on Manage Inventory first.
                    </Text>
                  ) : (
                    categories.map((cat: Category) => {
                      const active = cat._id === categoryId;
                      return (
                        <TouchableOpacity
                          key={cat._id}
                          style={[
                            styles.modalRow,
                            { borderBottomColor: paperTheme.colors.outline },
                            active && { backgroundColor: paperTheme.colors.primaryContainer },
                          ]}
                          onPress={() => {
                            setCategoryId(cat._id);
                            setCategoryModalVisible(false);
                          }}
                        >
                          <View style={[styles.catDot, { backgroundColor: cat.colorCode }]} />
                          <Text style={[styles.modalRowText, { color: paperTheme.colors.onSurface }]}>
                            {cat.name}
                          </Text>
                          {active ? (
                            <Ionicons name="checkmark" size={20} color={paperTheme.colors.primary} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.modalClose, { backgroundColor: paperTheme.colors.secondaryContainer }]}
                  onPress={() => setCategoryModalVisible(false)}
                >
                  <Text style={[styles.modalCloseText, { color: paperTheme.colors.onSecondaryContainer }]}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </KeyboardAvoidingView>


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
        )}s
      </SafeAreaView>
    </>
  );
}

export function AddProductScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'AddProduct'>) {
  return <ProductFormContent navigation={navigation} mode="add" />;
}

export function EditProductScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'EditProduct'>) {
  return <ProductFormContent navigation={navigation} mode="edit" initial={route.params} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontFamily: fonts.PoppinsBold },
  subtitle: { fontSize: 13, fontFamily: fonts.PoppinsRegular, marginTop: 2 },
  metaBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  metaText: { fontFamily: fonts.PoppinsMedium, fontSize: 12 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  label: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 16,
    marginBottom: 4,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  selectInner: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  selectText: { fontFamily: fonts.PoppinsRegular, fontSize: 16, flex: 1 },
  selectPlaceholder: { fontFamily: fonts.PoppinsRegular, fontSize: 16, flex: 1 },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  imageBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  imageBoxFilled: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderStyle: 'solid',
  },
  imagePreview: {
    width: '100%',
    height: 220,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  imageOverlayText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  imageBoxTitle: { fontFamily: fonts.PoppinsSemiBold, fontSize: 16 },
  imageBoxHint: { fontFamily: fonts.PoppinsRegular, fontSize: 13, textAlign: 'center' },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 8,
  },
  removeImageText: { fontFamily: fonts.PoppinsMedium, fontSize: 14 },
  saveBtn: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.75,
  },
  saveBtnText: { fontFamily: fonts.PoppinsSemiBold, fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontFamily: fonts.PoppinsBold, fontSize: 18, marginBottom: 8 },
  modalList: { maxHeight: 360 },
  modalEmpty: { fontFamily: fonts.PoppinsRegular, fontSize: 14, paddingVertical: 16 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalRowText: { flex: 1, fontFamily: fonts.PoppinsRegular, fontSize: 16 },
  modalClose: {
    marginVertical: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15 },
});

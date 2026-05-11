import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { RootState } from '../../store/store';
import { Category } from '../../type/category';
import { InventoryProductFormParams } from '../../type/inventory';

type FormMode = 'add' | 'edit';

type ProductFormContentProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  mode: FormMode;
  initial?: InventoryProductFormParams;
};

function ProductFormContent({ navigation, mode, initial }: ProductFormContentProps) {
  const { paperTheme, resolvedTheme } = useTheme();
  const categories = useSelector((state: RootState) => state.CategoryReducer.list.items);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [price, setPrice] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && initial) {
      setName(initial.name);
      setCategoryId(initial.categoryId);
      setPrice(String(initial.unitPrice));
    } else {
      setName('');
      setCategoryId('');
      setPrice('');
    }
  }, [mode, initial?.id, initial?.name, initial?.categoryId, initial?.unitPrice]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id === categoryId),
    [categories, categoryId],
  );

  const onSaveUiOnly = () => {
    Alert.alert(
      mode === 'add' ? 'Add product' : 'Update product',
      'This screen is UI only — hook up the products API when ready.',
      [{ text: 'OK' }],
    );
  };

  const openImagePlaceholder = () => {
    Alert.alert('Product image', 'Image picker will be wired here (e.g. camera / gallery or upload).', [
      { text: 'OK' },
    ]);
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
                Name, category, price, and image (form UI only)
              </Text>
            </View>
          </View>

          {mode === 'edit' && initial ? (
            <View style={[styles.metaBanner, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <Text style={[styles.metaText, { color: paperTheme.colors.onSurfaceVariant }]}>
                SKU {initial.sku} · Stock {initial.stock}
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
                {
                  borderColor: paperTheme.colors.outline,
                  backgroundColor: paperTheme.colors.surface,
                },
              ]}
              onPress={openImagePlaceholder}
              activeOpacity={0.85}
            >
              <Ionicons name="image-outline" size={36} color={paperTheme.colors.primary} />
              <Text style={[styles.imageBoxTitle, { color: paperTheme.colors.onSurface }]}>
                Add product image
              </Text>
              <Text style={[styles.imageBoxHint, { color: paperTheme.colors.onSurfaceVariant }]}>
                UI placeholder — no file saved yet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: paperTheme.colors.primary }]}
              onPress={onSaveUiOnly}
              activeOpacity={0.9}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={paperTheme.colors.onPrimary} />
              <Text style={[styles.saveBtnText, { color: paperTheme.colors.onPrimary }]}>
                {mode === 'add' ? 'Save product' : 'Save changes'}
              </Text>
            </TouchableOpacity>
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
  },
  imageBoxTitle: { fontFamily: fonts.PoppinsSemiBold, fontSize: 16 },
  imageBoxHint: { fontFamily: fonts.PoppinsRegular, fontSize: 13, textAlign: 'center' },
  saveBtn: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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

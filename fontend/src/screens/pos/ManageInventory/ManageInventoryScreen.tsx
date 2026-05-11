import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../store/store';
import { fetchCategories_Service } from '../../../services/CategoryService';
import { deleteProduct_Service, fetchProducts_Service } from '../../../services/ProductService';
import { Product } from '../../../type/product';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import { devLog } from '../../../utils/devLog';
import { resolveProductImageUri } from '../../../utils/productImage';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';

function thunkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

type Props = NativeStackScreenProps<RootStackParamList, 'ManageInventory'>;

export default function ManageInventoryScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const {
    items: categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useSelector((state: RootState) => state.CategoryReducer.list);
  const {
    items: products,
    loading: productsLoading,
    error: productsError,
  } = useSelector((state: RootState) => state.ProductReducer.list);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategoryId !== null) {
      list = list.filter((product) => product.category === selectedCategoryId);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((product) => {
        const cat = categories.find((c) => c._id === product.category);
        const catName = cat?.name.toLowerCase() ?? '';
        return product.name.toLowerCase().includes(q) || catName.includes(q);
      });
    }
    return list;
  }, [products, selectedCategoryId, searchQuery, categories]);

  const loadInventory = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchCategories_Service()).unwrap(),
        dispatch(fetchProducts_Service()).unwrap(),
      ]);
    } catch (err: unknown) {
      devLog('Manage inventory load:', err);
      show_Alert('error', 'Error', thunkErrorMessage(err, 'Failed to load inventory'), 1, true, 'OK');
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadInventory();
    }, [loadInventory]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInventory();
    } finally {
      setRefreshing(false);
    }
  }, [loadInventory]);

  const confirmDeleteProduct = useCallback(
    (item: Product) => {
      const closeSwipe = () => swipeableRefs.current.get(item._id)?.close();

      show_Alert(
        'error',
        'Delete product?',
        `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
        2,
        false,
        'Yes',
        async () => {
          try {
            await dispatch(deleteProduct_Service(item._id)).unwrap();
            swipeableRefs.current.get(item._id)?.close();
            await loadInventory();
          } catch (err: unknown) {
            show_Alert('error', 'Error', thunkErrorMessage(err, 'Could not delete product'), 1, true, 'OK');
          }
        },
        'Cancel',
        closeSwipe,
      );
    },
    [dispatch, show_Alert, loadInventory],
  );

  const isAllSelected = selectedCategoryId === null;

  const renderProductRow = ({ item }: { item: Product }) => {
    const cat = categories.find((c) => c._id === item.category);
    const imageUri = resolveProductImageUri(item.image);
    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(item._id, ref);
          else swipeableRefs.current.delete(item._id);
        }}
        friction={2}
        overshootRight={false}
        renderRightActions={() => (
          <View style={styles.swipeDeleteWrap}>
            <TouchableOpacity
              style={styles.swipeDeleteBtn}
              activeOpacity={0.85}
              onPress={() => confirmDeleteProduct(item)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
            >
              <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
              <Text style={styles.swipeDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      >
        <View style={[styles.productRow, { backgroundColor: paperTheme.colors.surface }]}>
          <View style={styles.productThumbWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.productThumb} resizeMode="cover" />
            ) : (
              <View
                style={[
                  styles.productThumbPlaceholder,
                  { backgroundColor: paperTheme.colors.surfaceVariant },
                ]}
              >
                <Ionicons name="image-outline" size={22} color={paperTheme.colors.onSurfaceVariant} />
              </View>
            )}
            <View
              style={[
                styles.categoryColorBadge,
                { backgroundColor: cat?.colorCode ?? paperTheme.colors.outline },
              ]}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.productName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.productMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
              {cat?.name ?? 'Uncategorized'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: paperTheme.colors.primaryContainer }]}
            onPress={() =>
              navigation.navigate('EditProduct', {
                id: item._id,
                name: item.name,
                categoryId: item.category,
                unitPrice: item.price,
                image: item.image,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
          >
            <Ionicons name="create-outline" size={20} color={paperTheme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.productRight}>
            <Text style={[styles.price, { color: paperTheme.colors.primary }]}>
              ${item.price.toFixed(2)}
            </Text>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: paperTheme.colors.surface }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={paperTheme.colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>Manage Inventory</Text>
            <Text style={[styles.subtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
              Products from your catalog — tap a category to filter
            </Text>
          </View>
        </View>

        {categoriesError ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{categoriesError}</Text>
        ) : null}
        {productsError ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{productsError}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.addProductBtn, { backgroundColor: paperTheme.colors.secondaryContainer }]}
          onPress={() => navigation.navigate('AddProduct')}
          activeOpacity={0.9}
        >
          <Ionicons name="add-circle-outline" size={22} color={paperTheme.colors.onSecondaryContainer} />
          <Text style={[styles.addProductBtnText, { color: paperTheme.colors.onSecondaryContainer }]}>
            Add new product
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Categories</Text>

        {categoriesLoading && !refreshing && categories.length === 0 ? (
          <View style={styles.categoriesLoading}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <View style={styles.chipsOuter}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              bounces={false}
            >
            <TouchableOpacity
              onPress={() => setSelectedCategoryId(null)}
              style={[
                styles.chip,
                styles.chipTouchable,
                {
                  backgroundColor: isAllSelected ? paperTheme.colors.primary : paperTheme.colors.surface,
                  borderColor: paperTheme.colors.outline,
                },
              ]}
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={isAllSelected ? paperTheme.colors.onPrimary : paperTheme.colors.primary}
              />
              <Text
                style={[
                  styles.chipName,
                  { color: isAllSelected ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface },
                ]}
                numberOfLines={1}
              >
                All products
              </Text>
            </TouchableOpacity>

            {categories.length === 0 && !categoriesLoading ? (
              <Text style={[styles.emptyCategories, { color: paperTheme.colors.onSurfaceVariant }]}>
                No categories yet.
              </Text>
            ) : (
              categories.map((item) => {
                const selected = selectedCategoryId === item._id;
                return (
                  <TouchableOpacity
                    key={item._id}
                    onPress={() => setSelectedCategoryId(item._id)}
                    style={[
                      styles.chip,
                      styles.chipTouchable,
                      {
                        backgroundColor: selected ? paperTheme.colors.primary : paperTheme.colors.surface,
                        borderColor: paperTheme.colors.outline,
                      },
                    ]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: item.colorCode }]} />
                    <Text
                      style={[
                        styles.chipName,
                        {
                          color: selected ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
            </ScrollView>
          </View>
        )}

        <View
          style={[
            styles.searchWrap,
            { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outline },
          ]}
        >
          <Ionicons name="search-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name or category…"
            placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            style={[styles.searchInput, { color: paperTheme.colors.onSurface }]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={22} color={paperTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.listHeader, { color: paperTheme.colors.onSurfaceVariant }]}>
          {isAllSelected ? 'All products' : 'This category only'} · {filteredProducts.length} shown
        </Text>

        {productsLoading && !refreshing && products.length === 0 ? (
          <View style={styles.productsLoading}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
          </View>
        ) : (
        <FlatList
          style={styles.productList}
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          renderItem={renderProductRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={paperTheme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="cube-outline" size={40} color={paperTheme.colors.outline} />
              <Text style={[styles.emptyListTitle, { color: paperTheme.colors.onSurface }]}>
                No products match
              </Text>
              <Text style={[styles.emptyListBody, { color: paperTheme.colors.onSurfaceVariant }]}>
                {products.length === 0
                  ? 'Add a product to start building your inventory.'
                  : 'Try another category or clear the search.'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
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
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontFamily: fonts.PoppinsBold },
  subtitle: { fontSize: 13, fontFamily: fonts.PoppinsRegular, marginTop: 2 },
  errorText: { fontFamily: fonts.PoppinsRegular, fontSize: 13, marginBottom: 8 },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addProductBtnText: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15 },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesLoading: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-start', marginBottom: 6 },
  /** Horizontal ScrollView can grow vertically in flex layouts; cap height to chip row. */
  chipsOuter: { maxHeight: 52, marginBottom: 8 },
  chipsRow: { gap: 10, paddingBottom: 0, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    maxWidth: 220,
    borderWidth: 1,
  },
  chipTouchable: { alignSelf: 'flex-start' },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipName: { fontFamily: fonts.PoppinsSemiBold, fontSize: 14, flexShrink: 1 },
  emptyCategories: { fontFamily: fonts.PoppinsRegular, fontSize: 14, paddingVertical: 8, alignSelf: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 0,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    paddingVertical: 0,
  },
  listHeader: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginBottom: 8,
  },
  productList: { flex: 1 },
  listContent: { paddingBottom: 24, flexGrow: 1 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumbWrap: {
    position: 'relative',
  },
  productThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  productThumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryColorBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  productName: { fontFamily: fonts.PoppinsSemiBold, fontSize: 15 },
  productMeta: { fontFamily: fonts.PoppinsRegular, fontSize: 12, marginTop: 2 },
  productsLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  productRight: { alignItems: 'flex-end', minWidth: 64 },
  price: { fontSize: 16, fontFamily: fonts.PoppinsBold },
  swipeDeleteWrap: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  swipeDeleteBtn: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 4,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  emptyList: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyListTitle: { fontFamily: fonts.PoppinsSemiBold, fontSize: 16, marginTop: 12 },
  emptyListBody: { fontFamily: fonts.PoppinsRegular, fontSize: 14, textAlign: 'center', marginTop: 6 },
});

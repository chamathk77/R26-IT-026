import React, { useCallback, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { MainBottomTabParamList } from '../../navigation/MainBottomTabParamList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { useCommonAlert } from '../../hooks/useCommonAlert';
import { fetchCategories_Service } from '../../services/CategoryService';
import { fetchProducts_Service } from '../../services/ProductService';
import { AppDispatch, RootState } from '../../store/store';
import { Product } from '../../type/product';
import { devLog } from '../../utils/devLog';
import { resolveProductImageUri } from '../../utils/productImage';
import CommonAlert from '../../components/CommonAlert/CommonAlert';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Products'>;

function thunkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export default function ProductsScreen(_props: Props) {
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
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategoryId !== null) {
      list = list.filter((product) => product.category === selectedCategoryId);
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((product) => {
        const category = categories.find((item) => item._id === product.category);
        const categoryName = category?.name.toLowerCase() ?? '';
        return (
          product.name.toLowerCase().includes(query) ||
          categoryName.includes(query)
        );
      });
    }
    return list;
  }, [products, selectedCategoryId, searchQuery, categories]);

  const loadCatalog = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchCategories_Service()).unwrap(),
        dispatch(fetchProducts_Service()).unwrap(),
      ]);
    } catch (err: unknown) {
      devLog('Products tab load:', err);
      show_Alert('error', 'Error', thunkErrorMessage(err, 'Failed to load products'), 1, true, 'OK');
    }
  }, [dispatch, show_Alert]);

  useFocusEffect(
    useCallback(() => {
      void loadCatalog();
    }, [loadCatalog]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCatalog();
    } finally {
      setRefreshing(false);
    }
  }, [loadCatalog]);

  const isAllSelected = selectedCategoryId === null;
  const isInitialLoading =
    (categoriesLoading || productsLoading) && !refreshing && products.length === 0;

  const renderProductRow = ({ item }: { item: Product }) => {
    const category = categories.find((entry) => entry._id === item.category);
    const imageUri = resolveProductImageUri(item.image);

    return (
      <View
        style={[
          styles.productCard,
          {
            backgroundColor: paperTheme.colors.surfaceVariant,
            borderColor: paperTheme.colors.outline,
          },
        ]}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.productImagePlaceholder,
              { backgroundColor: paperTheme.colors.surfaceVariant },
            ]}
          >
            <Ionicons name="image-outline" size={28} color={paperTheme.colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.productBody}>
          <Text style={[styles.productName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.productCategory, { color: paperTheme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {category?.name ?? 'Uncategorized'}
          </Text>
          <Text style={[styles.productPrice, { color: paperTheme.colors.primary }]}>
            ${item.price.toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

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
        <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>Products</Text>
        <Text style={[styles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
          Browse your catalog by category or search.
        </Text>

        {categoriesError ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{categoriesError}</Text>
        ) : null}
        {productsError ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{productsError}</Text>
        ) : null}

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
            placeholder="Search product or category…"
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
          {isAllSelected && !searchQuery.trim()
            ? `All products · ${filteredProducts.length} shown`
            : `${filteredProducts.length} shown`}
        </Text>

        {isInitialLoading ? (
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
                    ? 'Add products from Manage Inventory to see them here.'
                    : 'Try another category or clear the search.'}
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
    marginBottom: 8,
    marginTop: 8,
  },
  sub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginBottom: 16,
  },
  errorText: { fontFamily: fonts.PoppinsRegular, fontSize: 13, marginBottom: 8 },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesLoading: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-start', marginBottom: 6 },
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
  productsLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  productList: { flex: 1 },
  listContent: { paddingBottom: 24, flexGrow: 1 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  productImage: {
    width: 84,
    height: 84,
    borderRadius: 14,
  },
  productImagePlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBody: { flex: 1, minWidth: 0, gap: 4 },
  productName: { fontFamily: fonts.PoppinsSemiBold, fontSize: 17 },
  productCategory: { fontFamily: fonts.PoppinsRegular, fontSize: 13 },
  productPrice: { fontFamily: fonts.PoppinsBold, fontSize: 18, marginTop: 4 },
  emptyList: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyListTitle: { fontFamily: fonts.PoppinsSemiBold, fontSize: 16, marginTop: 12 },
  emptyListBody: { fontFamily: fonts.PoppinsRegular, fontSize: 14, textAlign: 'center', marginTop: 6 },
});

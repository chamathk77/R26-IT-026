import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import { AppDispatch, RootState } from '../../../store/store';
import { fetchCategories_Service } from '../../../services/CategoryService';
import { fetchProducts_Service } from '../../../services/ProductService';
import { Category } from '../../../type/category';
import { getProductCategoryId, Product } from '../../../type/product';
import { formatCheckoutAmount } from '../../../type/checkoutPayment';
import { resolveProductImageUri } from '../../../utils/productImage';
import { cardShadow } from '../../settings/shared/settingsDetailStyles';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  selectedProductIds?: string[];
};

function getCategoryColor(categories: Category[], product: Product): string {
  const categoryId = getProductCategoryId(product);
  return categories.find((entry) => entry._id === categoryId)?.colorCode ?? '#64748b';
}

function SkeletonBone({
  width,
  height,
  borderRadius = 8,
  style,
  color,
  opacity,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
  color: string;
  opacity: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
}

function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return pulse;
}

function CategoryChipsSkeleton({ boneColor }: { boneColor: string }) {
  const pulse = useSkeletonPulse();
  const widths = [52, 88, 72, 96, 64];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryRow}
      scrollEnabled={false}
    >
      {widths.map((width, index) => (
        <SkeletonBone
          key={`category-chip-skeleton-${index}`}
          width={width}
          height={36}
          borderRadius={18}
          color={boneColor}
          opacity={pulse}
        />
      ))}
    </ScrollView>
  );
}

function ProductListSkeleton({
  boneColor,
  cardColor,
  accentColor,
  count = 6,
}: {
  boneColor: string;
  cardColor: string;
  accentColor: string;
  count?: number;
}) {
  const pulse = useSkeletonPulse();

  return (
    <View style={styles.listContent}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`quotation-picker-skeleton-${index}`}
          style={[styles.productCard, { backgroundColor: cardColor }, styles.skeletonCardSpacing]}
        >
          <View style={[styles.productAccent, { backgroundColor: accentColor }]} />
          <View style={styles.productRow}>
            <SkeletonBone width={56} height={56} borderRadius={14} color={boneColor} opacity={pulse} />
            <View style={styles.productBody}>
              <SkeletonBone width="72%" height={14} borderRadius={7} color={boneColor} opacity={pulse} />
              <View style={[styles.metaRow, { marginTop: 8 }]}>
                <SkeletonBone width={88} height={22} borderRadius={11} color={boneColor} opacity={pulse} />
                <SkeletonBone width={64} height={22} borderRadius={11} color={boneColor} opacity={pulse} />
              </View>
              <SkeletonBone
                width={72}
                height={14}
                borderRadius={7}
                color={boneColor}
                opacity={pulse}
                style={{ marginTop: 8 }}
              />
            </View>
            <SkeletonBone width={40} height={40} borderRadius={20} color={boneColor} opacity={pulse} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function QuotationProductPickerModal({
  visible,
  onClose,
  onSelectProduct,
  selectedProductIds = [],
}: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const products = useSelector((state: RootState) => state.ProductReducer.list.items);
  const productsLoading = useSelector((state: RootState) => state.ProductReducer.list.loading);
  const categories = useSelector((state: RootState) => state.CategoryReducer.list.items);
  const categoriesLoading = useSelector((state: RootState) => state.CategoryReducer.list.loading);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const headerPulse = useSkeletonPulse();

  const isLoading =
    (productsLoading && products.length === 0) ||
    (categoriesLoading && categories.length === 0);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSelectedCategoryId(null);
      return;
    }

    if (products.length === 0 && !productsLoading) {
      void dispatch(fetchProducts_Service());
    }
    if (categories.length === 0 && !categoriesLoading) {
      void dispatch(fetchCategories_Service());
    }
  }, [visible, dispatch, products.length, categories.length, productsLoading, categoriesLoading]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        selectedCategoryId == null || getProductCategoryId(product) === selectedCategoryId;
      if (!matchesCategory) return false;
      if (!query) return true;

      const categoryName =
        product.categoryName ||
        categories.find((entry) => entry._id === getProductCategoryId(product))?.name ||
        '';

      return (
        product.productName.toLowerCase().includes(query) ||
        categoryName.toLowerCase().includes(query) ||
        String(product.productNumber ?? '').toLowerCase().includes(query)
      );
    });
  }, [categories, products, searchQuery, selectedCategoryId]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => {
      const imageUri = resolveProductImageUri(item.image);
      const categoryColor = getCategoryColor(categories, item);
      const categoryLabel =
        item.categoryName ||
        categories.find((entry) => entry._id === getProductCategoryId(item))?.name ||
        'Uncategorized';
      const alreadyAdded = selectedProductIds.includes(item._id);
      const isService = item.type === 'service';

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onSelectProduct(item)}
          style={[
            styles.productCard,
            { backgroundColor: paperTheme.colors.surface },
            cardShadow(resolvedTheme),
          ]}
        >
          <View style={[styles.productAccent, { backgroundColor: categoryColor }]} />
          <View style={styles.productRow}>
            <View style={styles.thumbWrap}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumbPlaceholder, { backgroundColor: `${categoryColor}18` }]}>
                  <Ionicons
                    name={isService ? 'construct-outline' : 'cube-outline'}
                    size={20}
                    color={categoryColor}
                  />
                </View>
              )}
              {alreadyAdded ? (
                <View style={[styles.addedBadge, { backgroundColor: paperTheme.colors.primary }]}>
                  <Ionicons name="checkmark" size={12} color={paperTheme.colors.onPrimary} />
                </View>
              ) : null}
            </View>

            <View style={styles.productBody}>
              <Text style={[styles.productName, { color: paperTheme.colors.onSurface }]} numberOfLines={2}>
                {item.productName}
              </Text>
              <View style={styles.metaRow}>
                <View style={[styles.categoryPill, { backgroundColor: `${categoryColor}18` }]}>
                  <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                  <Text style={[styles.categoryText, { color: categoryColor }]} numberOfLines={1}>
                    {categoryLabel}
                  </Text>
                </View>
                <View
                  style={[
                    styles.typePill,
                    {
                      backgroundColor: isService
                        ? `${paperTheme.colors.tertiary}18`
                        : `${paperTheme.colors.secondary}18`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: isService ? paperTheme.colors.tertiary : paperTheme.colors.secondary },
                    ]}
                  >
                    {isService ? 'Service' : 'Product'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.priceText, { color: paperTheme.colors.primary }]}>
                {item.amount != null ? formatCheckoutAmount(item.amount) : 'Custom price'}
              </Text>
            </View>

            <View style={[styles.addBtn, { backgroundColor: paperTheme.colors.primaryContainer }]}>
              <Ionicons name="add" size={22} color={paperTheme.colors.primary} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [
      categories,
      onSelectProduct,
      paperTheme.colors,
      resolvedTheme,
      selectedProductIds,
    ],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: paperTheme.colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: paperTheme.colors.outlineVariant }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color={paperTheme.colors.onBackground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: paperTheme.colors.onBackground }]}>Add items</Text>
            <Text style={[styles.headerSubtitle, { color: paperTheme.colors.onSurfaceVariant }]}>
              Search or filter by category
            </Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        <View style={[styles.searchWrap, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
          <Ionicons name="search-outline" size={18} color={paperTheme.colors.onSurfaceVariant} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name, category, or product #"
            placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            style={[styles.searchInput, { color: paperTheme.colors.onSurface }]}
            autoCorrect={false}
            editable={!isLoading}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={paperTheme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.categoryScrollWrap}>
          {categoriesLoading && categories.length === 0 ? (
            <CategoryChipsSkeleton boneColor={paperTheme.colors.surfaceVariant} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(null)}
                activeOpacity={0.85}
                style={[
                  styles.categoryChip,
                  selectedCategoryId == null ? styles.categoryChipActive : null,
                  {
                    backgroundColor:
                      selectedCategoryId == null ? paperTheme.colors.primary : paperTheme.colors.surface,
                    borderColor:
                      selectedCategoryId == null ? paperTheme.colors.primary : paperTheme.colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color:
                        selectedCategoryId == null ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface,
                    },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((category) => {
                const active = selectedCategoryId === category._id;
                return (
                  <TouchableOpacity
                    key={category._id}
                    onPress={() => setSelectedCategoryId(category._id)}
                    activeOpacity={0.85}
                    style={[
                      styles.categoryChip,
                      active ? styles.categoryChipActive : null,
                      {
                        backgroundColor: active ? category.colorCode : paperTheme.colors.surface,
                        borderColor: active ? category.colorCode : paperTheme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryChipDot,
                        { backgroundColor: active ? '#ffffff' : category.colorCode },
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: active ? '#ffffff' : paperTheme.colors.onSurface },
                      ]}
                      numberOfLines={1}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.listHeader}>
          {isLoading ? (
            <SkeletonBone
              width={72}
              height={12}
              borderRadius={6}
              color={paperTheme.colors.surfaceVariant}
              opacity={headerPulse}
            />
          ) : (
            <Text style={[styles.resultCount, { color: paperTheme.colors.onSurfaceVariant }]}>
              {filteredProducts.length} item{filteredProducts.length === 1 ? '' : 's'}
            </Text>
          )}
        </View>

        {isLoading ? (
          <ProductListSkeleton
            boneColor={paperTheme.colors.surfaceVariant}
            cardColor={paperTheme.colors.surface}
            accentColor={paperTheme.colors.primary}
          />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProduct}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={42} color={paperTheme.colors.outline} />
                <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>No items found</Text>
                <Text style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
                  Try another category or search term.
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    padding: 0,
  },
  categoryScrollWrap: {
    minHeight: 52,
    justifyContent: 'center',
  },
  categoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexShrink: 0,
    gap: 6,
  },
  categoryChipActive: {
    paddingHorizontal: 14,
  },
  categoryChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  categoryChipText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 1,
    maxWidth: 140,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 6,
    minHeight: 24,
    justifyContent: 'center',
  },
  resultCount: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  skeletonCardSpacing: {
    marginBottom: 12,
  },
  productCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  productAccent: {
    height: 4,
    width: '100%',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBody: {
    flex: 1,
    gap: 6,
  },
  productName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 130,
  },
  categoryText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
    flexShrink: 1,
  },
  typePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
  },
  priceText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  emptyText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

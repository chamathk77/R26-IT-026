import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
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
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { deleteCategory_Service, fetchCategories_Service } from '../../../services/CategoryService';
import { Category } from '../../../type/category';
import { useCommonAlert } from '../../../hooks/useCommonAlert';
import {
  getApiErrorMessage,
  handleSessionExpiredApiError,
} from '../../../utils/apiErrorAlert';
import CommonAlert from '../../../components/CommonAlert/CommonAlert';
import { cardShadow, settingsDetailStyles as sharedStyles } from '../../settings/shared/settingsDetailStyles';
import { SettingsEmptyState } from '../../settings/shared/SettingsDetailComponents';
import { inventoryUi, softShadow } from '../ManageInventory/inventoryUiStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageCatogory'>;

function CategoryCard({
  item,
  paperTheme,
  resolvedTheme,
  onEdit,
  onDelete,
  swipeableRef,
}: {
  item: Category;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
  onEdit: () => void;
  onDelete: () => void;
  swipeableRef: (ref: Swipeable | null) => void;
}) {
  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.swipeDeleteWrap}>
          <TouchableOpacity
            style={styles.swipeDeleteBtn}
            activeOpacity={0.85}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Ionicons name="trash" size={22} color="#FFFFFF" />
            <Text style={styles.swipeDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onEdit}
        style={[
          styles.card,
          {
            backgroundColor: paperTheme.colors.surface,
            borderColor: paperTheme.colors.outlineVariant,
          },
          cardShadow(resolvedTheme),
        ]}
      >
        <View style={[styles.colorSwatch, { backgroundColor: item.colorCode }]}>
          <Ionicons name="pricetag" size={18} color="#fff" />
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: paperTheme.colors.onSurface }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text
            style={[styles.cardMeta, { color: paperTheme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            {item.description || 'No description'}
          </Text>
          <View style={[styles.colorCodePill, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
            <View style={[styles.colorCodeDot, { backgroundColor: item.colorCode }]} />
            <Text style={[styles.colorCodeText, { color: paperTheme.colors.onSurfaceVariant }]}>
              {item.colorCode}
            </Text>
          </View>
        </View>

        <View style={[styles.editBtn, { backgroundColor: paperTheme.colors.primaryContainer }]}>
          <Ionicons name="create-outline" size={18} color={paperTheme.colors.primary} />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function ManageCatogoryScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { alertConfig, visible, hideAlert, show_Alert } = useCommonAlert();
  const shopId = useSelector(
    (state: RootState) =>
      state.AuthReducer.Login.shopData?.shopId ||
      state.AuthReducer.Login.userData?.shopId ||
      '',
  );
  const { items: categories, loading, error, count } = useSelector(
    (state: RootState) => state.CategoryReducer.list,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description?.toLowerCase().includes(query) ?? false) ||
        c.colorCode.toLowerCase().includes(query),
    );
  }, [categories, searchQuery]);

  const loadCategories = useCallback(async () => {
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
      await dispatch(fetchCategories_Service()).unwrap();
    } catch (err: unknown) {
      const handled = await handleSessionExpiredApiError(err, show_Alert);
      if (handled) return;

      setTimeout(() => {
        show_Alert(
          'error',
          'Load failed',
          getApiErrorMessage(err, 'Could not load categories. Please try again.'),
          2,
          false,
          'Retry',
          () => {
            void loadCategories();
          },
          'Cancel',
          () => {},
        );
      }, 150);
    }
  }, [dispatch, shopId, show_Alert]);

  const confirmDeleteCategory = useCallback(
    (item: Category) => {
      const closeSwipe = () => swipeableRefs.current.get(item._id)?.close();

      show_Alert(
        'error',
        'Delete category?',
        `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
        2,
        false,
        'Delete',
        async () => {
          try {
            await dispatch(deleteCategory_Service(item._id)).unwrap();
            swipeableRefs.current.get(item._id)?.close();
          } catch (err: unknown) {
            const handled = await handleSessionExpiredApiError(err, show_Alert);
            if (handled) return;

            setTimeout(() => {
              show_Alert(
                'error',
                'Delete failed',
                getApiErrorMessage(err, 'Could not delete category. Please try again.'),
                1,
                false,
                'OK',
                () => {},
              );
            }, 150);
          }
        },
        'Cancel',
        closeSwipe,
      );
    },
    [dispatch, show_Alert],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
    }, [loadCategories]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCategories();
    } finally {
      setRefreshing(false);
    }
  }, [loadCategories]);

  const renderHeroCard = () => (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: paperTheme.colors.primaryContainer,
          borderColor: `${paperTheme.colors.primary}33`,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      <View style={styles.heroTopRow}>
        <View style={[styles.heroIcon, { backgroundColor: paperTheme.colors.primary }]}>
          <Ionicons name="pricetags" size={18} color={paperTheme.colors.onPrimary} />
        </View>
        <View style={styles.heroTextBlock}>
          <Text style={[styles.heroTitle, { color: paperTheme.colors.onPrimaryContainer }]}>
            Categories
          </Text>
          <Text style={[styles.heroSubtitle, { color: paperTheme.colors.onPrimaryContainer }]}>
            Organize products for faster POS checkout
          </Text>
        </View>
      </View>
      <View style={styles.statsPillRow}>
        <View style={[styles.statPill, { backgroundColor: paperTheme.colors.surface }]}>
          <Text style={[styles.statValue, { color: paperTheme.colors.primary }]}>
            {count || categories.length}
          </Text>
          <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Total
          </Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: paperTheme.colors.surface }]}>
          <Text style={[styles.statValue, { color: paperTheme.colors.primary }]}>
            {filteredCategories.length}
          </Text>
          <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            Showing
          </Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: paperTheme.colors.surface }]}>
          <Text style={[styles.statValue, { color: paperTheme.colors.primary }]}>
            {categories.filter((c) => c.description?.trim()).length}
          </Text>
          <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
            With details
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View
      style={[
        styles.searchCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      <Pressable
        onPress={Keyboard.dismiss}
        style={[
          styles.searchWrap,
          {
            backgroundColor: paperTheme.colors.background,
            borderColor: paperTheme.colors.outlineVariant,
          },
        ]}
      >
        <View style={[styles.searchIconWrap, { backgroundColor: paperTheme.colors.primaryContainer }]}>
          <Ionicons name="search" size={16} color={paperTheme.colors.primary} />
        </View>
        <TextInput
          ref={searchInputRef}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search name, description, color…"
          placeholderTextColor={paperTheme.colors.onSurfaceVariant}
          style={[styles.searchInput, { color: paperTheme.colors.onSurface }]}
          autoCorrect={false}
          autoCapitalize="none"
          blurOnSubmit={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={20} color={paperTheme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : null}
      </Pressable>
    </View>
  );

  const renderListHeader = () => (
    <View>
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: paperTheme.colors.errorContainer }]}>
          <Ionicons name="alert-circle-outline" size={18} color={paperTheme.colors.error} />
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{error}</Text>
        </View>
      ) : null}
      <Text style={[inventoryUi.sectionEyebrow, styles.listSectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
        Your categories
      </Text>
    </View>
  );

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[sharedStyles.safe, styles.screen, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Manage Category"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <Pressable onPress={Keyboard.dismiss} style={styles.headerContent}>
          {renderHeroCard()}
          {renderSearchBar()}
        </Pressable>

        {loading && !refreshing && categories.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurfaceVariant }]}>
              Loading categories...
            </Text>
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={filteredCategories}
            keyExtractor={(item: Category) => item._id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={paperTheme.colors.primary}
              />
            }
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={
              !loading ? (
                <SettingsEmptyState
                  icon="pricetags-outline"
                  title={categories.length === 0 ? 'No categories yet' : 'No categories found'}
                  description={
                    categories.length === 0
                      ? 'Create your first category to group products in the catalog.'
                      : 'Try a different search term.'
                  }
                  paperTheme={paperTheme}
                />
              ) : null
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <CategoryCard
                item={item}
                paperTheme={paperTheme}
                resolvedTheme={resolvedTheme}
                onEdit={() => navigation.navigate('CreateCatogory', { category: item })}
                onDelete={() => confirmDeleteCategory(item)}
                swipeableRef={(ref) => {
                  if (ref) swipeableRefs.current.set(item._id, ref);
                  else swipeableRefs.current.delete(item._id);
                }}
              />
            )}
          />
        )}

        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: paperTheme.colors.primary },
            softShadow(resolvedTheme),
          ]}
          onPress={() => navigation.navigate('CreateCatogory', {})}
          activeOpacity={0.92}
        >
          <Ionicons name="add" size={28} color={paperTheme.colors.onPrimary} />
        </TouchableOpacity>

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
  screen: {
    paddingHorizontal: 20,
  },
  headerContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
    lineHeight: 21,
  },
  heroSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginTop: 1,
    lineHeight: 15,
    opacity: 0.85,
  },
  statsPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statPill: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
    lineHeight: 18,
  },
  statLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
    marginTop: 1,
  },
  searchCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    paddingVertical: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    flex: 1,
  },
  listSectionLabel: {
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    minHeight: 200,
  },
  loadingText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.PoppinsSemiBold,
    lineHeight: 21,
  },
  cardMeta: {
    fontSize: 13,
    fontFamily: fonts.PoppinsRegular,
    lineHeight: 18,
  },
  colorCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  colorCodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorCodeText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteWrap: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  swipeDeleteBtn: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 20,
    gap: 4,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

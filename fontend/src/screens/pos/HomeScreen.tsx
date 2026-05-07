import React, { useMemo } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Searchbar } from 'react-native-paper';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainBottomTabParamList } from '../../navigation/MainBottomTabParamList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'Home'>;

const CATEGORIES = ['All', 'Beverages', 'Snacks', 'Dairy', 'Groceries'];

const MOCK_PRODUCTS = [
  { id: '1', name: 'Espresso', price: 3.5, category: 'Beverages' },
  { id: '2', name: 'Croissant', price: 4.25, category: 'Snacks' },
  { id: '3', name: 'Orange Juice', price: 5.0, category: 'Beverages' },
  { id: '4', name: 'Milk 1L', price: 2.99, category: 'Dairy' },
  { id: '5', name: 'Granola Bar', price: 2.5, category: 'Snacks' },
  { id: '6', name: 'Sandwich', price: 7.5, category: 'Snacks' },
];

export default function HomeScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('All');

  const filtered = useMemo(() => {
    return MOCK_PRODUCTS.filter((p) => {
      const matchCat = category === 'All' || p.category === category;
      const q = query.trim().toLowerCase();
      const matchQ = !q || p.name.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [category, query]);

  const surface = paperTheme.colors.surface;
  const primary = paperTheme.colors.primary;

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: paperTheme.colors.onSurfaceVariant }]}>
                Welcome back
              </Text>
              <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>
                Smart POS
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.iconBtn, { backgroundColor: surface }]}
              onPress={() => {}}
            >
              <Ionicons name="notifications-outline" size={22} color={primary} />
            </TouchableOpacity>
          </View>

          <Searchbar
            placeholder="Search products or SKU…"
            value={query}
            onChangeText={setQuery}
            style={[styles.search, { backgroundColor: surface }]}
            inputStyle={{ fontFamily: fonts.PoppinsRegular }}
            iconColor={paperTheme.colors.onSurfaceVariant}
            elevation={0}
          />

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: primary }]}>
              <Ionicons name="trending-up" size={22} color={paperTheme.colors.onPrimary} />
              <Text style={[styles.statLabel, { color: paperTheme.colors.onPrimary }]}>
                Today&apos;s sales
              </Text>
              <Text style={[styles.statValue, { color: paperTheme.colors.onPrimary }]}>
                $1,248.50
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: surface }]}>
              <Ionicons name="receipt-outline" size={22} color={primary} />
              <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                Transactions
              </Text>
              <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
                42
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onBackground }]}>
            Categories
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? primary : surface,
                      borderColor: active ? primary : paperTheme.colors.outline,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface,
                        fontFamily: active ? fonts.PoppinsSemiBold : fonts.PoppinsRegular,
                      },
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: paperTheme.colors.onBackground }]}>
              Quick add
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Inventory')}>
              <Text style={[styles.link, { color: primary }]}>See inventory</Text>
            </TouchableOpacity>
          </View>

          {filtered.length === 0 ? (
            <Text
              style={{
                color: paperTheme.colors.onSurfaceVariant,
                fontFamily: fonts.PoppinsRegular,
              }}
            >
              No items match your filters.
            </Text>
          ) : (
            Array.from({ length: Math.ceil(filtered.length / 2) }).map((_, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.gridRow}>
                {filtered.slice(rowIndex * 2, rowIndex * 2 + 2).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    style={[styles.productCard, { backgroundColor: surface }]}
                    onPress={() => navigation.navigate('Cart')}
                  >
                    <View
                      style={[styles.productIconWrap, { backgroundColor: paperTheme.colors.primaryContainer }]}
                    >
                      <Ionicons name="cube-outline" size={28} color={primary} />
                    </View>
                    <Text
                      style={[styles.productName, { color: paperTheme.colors.onSurface }]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.productPrice, { color: primary }]}>
                      ${item.price.toFixed(2)}
                    </Text>
                    <View style={[styles.addRow, { borderTopColor: paperTheme.colors.outline }]}>
                      <Ionicons name="add-circle" size={22} color={primary} />
                      <Text style={[styles.addLabel, { color: primary }]}>Add to cart</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
  },
  title: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 26,
    marginTop: 2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    borderRadius: 14,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  statLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    opacity: 0.95,
  },
  statValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 17,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  link: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: '48%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 4,
  },
  productIconWrap: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  productName: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
    minHeight: 36,
  },
  productPrice: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
    marginTop: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
});

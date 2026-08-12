import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import {
  getTableDisplayLabel,
  groupTablesByPrefix,
  TablePickerItem,
} from '../../type/table';

type Props = {
  items: TablePickerItem[];
  loading?: boolean;
  selectedTableId?: string | null;
  onSelectTable?: (table: TablePickerItem) => void;
  emptyMessage?: string;
  scrollEnabled?: boolean;
  freeTablesOnly?: boolean;
};

const NUM_COLUMNS = 4;

function chunkRow<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
}

export default function TablePickerGrid({
  items,
  loading = false,
  selectedTableId = null,
  onSelectTable,
  emptyMessage = 'No tables configured yet.',
  scrollEnabled = true,
  freeTablesOnly = false,
}: Props) {
  const { paperTheme } = useTheme();

  const groups = useMemo(() => groupTablesByPrefix(items), [items]);

  const renderTile = (item: TablePickerItem) => {
        const isOccupied = item.status === 'occupied';
        const isSelected = selectedTableId === item._id;
        const isDisabled = freeTablesOnly && isOccupied;
        const tileColor = isOccupied ? '#dc2626' : '#15803d';
        const tileBg = isOccupied ? '#fef2f2' : '#ecfdf5';

        return (
          <TouchableOpacity
            key={item._id}
            style={[
              styles.tile,
              {
                backgroundColor: isSelected ? `${paperTheme.colors.primary}18` : tileBg,
                borderColor: isSelected ? paperTheme.colors.primary : `${tileColor}55`,
                opacity: isDisabled ? 0.45 : 1,
              },
            ]}
            onPress={() => {
              if (isDisabled) return;
              onSelectTable?.(item);
            }}
            activeOpacity={onSelectTable && !isDisabled ? 0.85 : 1}
            disabled={!onSelectTable || isDisabled}
        accessibilityRole={onSelectTable ? 'button' : 'text'}
        accessibilityLabel={`${getTableDisplayLabel(item)} ${isOccupied ? 'occupied' : 'free'}`}
      >
        <Text style={[styles.tileNumber, { color: tileColor }]} numberOfLines={2}>
          {item.tableNumber}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={paperTheme.colors.primary} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="restaurant-outline" size={32} color={paperTheme.colors.outline} />
        <Text style={[styles.emptyText, { color: paperTheme.colors.onSurfaceVariant }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  const content = (
    <View style={styles.sectionsWrap}>
      {groups.map((group) => (
        <View key={group.prefix || group.title} style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
            {group.title}
          </Text>
          <View style={styles.sectionGrid}>
            {chunkRow(group.tables, NUM_COLUMNS).map((row, rowIndex) => (
              <View key={`${group.prefix}-${rowIndex}`} style={styles.columnWrap}>
                {row.map((item) => renderTile(item))}
                {row.length < NUM_COLUMNS
                  ? Array.from({ length: NUM_COLUMNS - row.length }).map((_, fillerIndex) => (
                      <View key={`filler-${fillerIndex}`} style={styles.tileSpacer} />
                    ))
                  : null}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );

  if (!scrollEnabled) {
    return content;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 8,
  },
  sectionsWrap: {
    gap: 16,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  sectionGrid: {
    gap: 10,
  },
  columnWrap: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSpacer: {
    flex: 1,
  },
  tileNumber: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

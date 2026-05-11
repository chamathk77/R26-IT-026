import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
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
import { fetchHistory_Service } from '../../services/HistoryService';
import { setHistoryScope } from '../../store/reducers/HistoryReducer';
import { AppDispatch, RootState } from '../../store/store';
import { HistoryRecord, HistoryScope } from '../../type/history';

type Props = BottomTabScreenProps<MainBottomTabParamList, 'History'>;

function formatCheckoutTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getHandledUserName(record: HistoryRecord): string {
  if (typeof record.handledUser === 'string') return 'User';
  return record.handledUser.name?.trim() || 'User';
}

export default function HistoryScreen(_props: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { scope, list } = useSelector((state: RootState) => state.HistoryReducer);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const loadHistory = useCallback(
    async (nextScope: HistoryScope = scope) => {
      await dispatch(fetchHistory_Service(nextScope));
    },
    [dispatch, scope],
  );

  useFocusEffect(
    useCallback(() => {
      void loadHistory(scope);
    }, [loadHistory, scope]),
  );

  const handleScopeChange = useCallback(
    (nextScope: HistoryScope) => {
      setExpandedHistoryId(null);
      dispatch(setHistoryScope(nextScope));
      void dispatch(fetchHistory_Service(nextScope));
    },
    [dispatch],
  );

  const toggleHistoryCard = useCallback((historyId: string) => {
    setExpandedHistoryId((current) => (current === historyId ? null : historyId));
  }, []);

  const renderHistoryRow = ({ item }: { item: HistoryRecord }) => {
    const itemCount = item.items.length;
    const handledBy = getHandledUserName(item);
    const isExpanded = expandedHistoryId === item._id;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => toggleHistoryCard(item._id)}
        style={[
          styles.row,
          {
            backgroundColor: isExpanded
              ? paperTheme.colors.primaryContainer
              : paperTheme.colors.surface,
          },
        ]}
      >
        <View style={[styles.rowIcon, { backgroundColor: paperTheme.colors.primaryContainer }]}>
          <Ionicons name="receipt" size={22} color={paperTheme.colors.primary} />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: paperTheme.colors.onSurface }]}>
            Checkout · {itemCount} item{itemCount === 1 ? '' : 's'}
          </Text>
          <Text style={[styles.rowTime, { color: paperTheme.colors.onSurfaceVariant }]}>
            {formatCheckoutTime(item.checkoutAt)}
          </Text>
          {scope === 'all' ? (
            <Text style={[styles.rowMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
              Handled by {handledBy}
            </Text>
          ) : null}
          {isExpanded ? (
            <View style={styles.expandedItems}>
              {item.items.map((entry) => (
                <Text
                  key={`${item._id}-${entry.productId}`}
                  style={[styles.rowItems, { color: paperTheme.colors.onSurface }]}
                >
                  {entry.name} × {entry.quantity}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.rowTrailing}>
          <Text style={[styles.rowAmount, { color: paperTheme.colors.primary }]}>
            ${item.totalPrice.toFixed(2)}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={paperTheme.colors.onSurfaceVariant}
          />
        </View>
      </TouchableOpacity>
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
        <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>History</Text>
        <Text style={[styles.sub, { color: paperTheme.colors.onSurfaceVariant }]}>
          Completed checkouts with cart details and totals.
        </Text>

        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => handleScopeChange('mine')}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  scope === 'mine' ? paperTheme.colors.primary : paperTheme.colors.surface,
                borderColor: paperTheme.colors.outline,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    scope === 'mine' ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface,
                },
              ]}
            >
              My history
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleScopeChange('all')}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  scope === 'all' ? paperTheme.colors.primary : paperTheme.colors.surface,
                borderColor: paperTheme.colors.outline,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    scope === 'all' ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface,
                },
              ]}
            >
              Total history
            </Text>
          </TouchableOpacity>
        </View>

        {list.error ? (
          <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>{list.error}</Text>
        ) : null}

        {list.loading && list.items.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={paperTheme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={list.items}
            keyExtractor={(item) => item._id}
            renderItem={renderHistoryRow}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="time-outline" size={40} color={paperTheme.colors.outline} />
                <Text style={[styles.emptyTitle, { color: paperTheme.colors.onSurface }]}>
                  No checkout history
                </Text>
                <Text style={[styles.emptySub, { color: paperTheme.colors.onSurfaceVariant }]}>
                  {scope === 'mine'
                    ? 'Your completed checkouts will appear here.'
                    : 'No checkout records found yet.'}
                </Text>
              </View>
            }
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
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  errorText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginBottom: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  rowTime: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  rowMeta: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  rowItems: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  expandedItems: {
    marginTop: 8,
    gap: 4,
  },
  rowTrailing: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: 8,
  },
  rowAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
});

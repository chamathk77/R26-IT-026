import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import { fonts } from '../../../constants/fonts';
import {
  getKpiSalePersonName,
  KpiMockSalePerson,
  MOCK_KPI_SALE_PERSONS,
} from '../shared/kpiMockData';
import { kpiCardShadow } from '../shared/kpiStyles';

type Props = {
  salePersons?: KpiMockSalePerson[];
  selectedSalesPersonId: string | null;
  onSelect: (id: string | null) => void;
  paperTheme: MD3Theme;
  resolvedTheme: 'light' | 'dark';
  disabled?: boolean;
};

export default function KpiSalesPersonField({
  salePersons = MOCK_KPI_SALE_PERSONS,
  selectedSalesPersonId,
  onSelect,
  paperTheme,
  resolvedTheme,
  disabled = false,
}: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!selectedSalesPersonId) return 'Select sales person';
    const person = salePersons.find((item) => item._id === selectedSalesPersonId);
    return person ? getKpiSalePersonName(person) : 'Select sales person';
  }, [salePersons, selectedSalesPersonId]);

  const options = useMemo(
    () =>
      salePersons.map((person) => ({
        id: person._id,
        label: `${getKpiSalePersonName(person)} · ${person.position}`,
        subLabel: person.salePersonId,
      })),
    [salePersons],
  );

  return (
    <>
      <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>
        Sales person
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select sales person"
        disabled={disabled}
        onPress={() => setPickerVisible(true)}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: paperTheme.colors.surfaceVariant,
            borderColor: selectedSalesPersonId
              ? paperTheme.colors.primary
              : paperTheme.colors.outlineVariant,
            opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
          },
          selectedSalesPersonId ? kpiCardShadow(resolvedTheme) : null,
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: selectedSalesPersonId
                ? paperTheme.colors.primary
                : `${paperTheme.colors.primary}18`,
            },
          ]}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color={selectedSalesPersonId ? paperTheme.colors.onPrimary : paperTheme.colors.primary}
          />
        </View>
        <View style={styles.body}>
          <Text style={[styles.value, { color: paperTheme.colors.onSurface }]}>{selectedLabel}</Text>
          <Text style={[styles.hint, { color: paperTheme.colors.onSurfaceVariant }]}>
            Required to load KPI data
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={paperTheme.colors.onSurfaceVariant} />
      </Pressable>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.overlayRoot}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPickerVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: paperTheme.colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: paperTheme.colors.outlineVariant }]} />
            <Text style={[styles.sheetTitle, { color: paperTheme.colors.onSurface }]}>
              Select sales person
            </Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.id ?? 'none'}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              renderItem={({ item }) => {
                const selected = selectedSalesPersonId === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected
                          ? paperTheme.colors.primaryContainer
                          : paperTheme.colors.surfaceVariant,
                        borderColor: selected
                          ? paperTheme.colors.primary
                          : paperTheme.colors.outlineVariant,
                      },
                    ]}
                    onPress={() => {
                      onSelect(item.id);
                      setPickerVisible(false);
                    }}
                  >
                    <View style={styles.optionBody}>
                      <Text style={[styles.optionLabel, { color: paperTheme.colors.onSurface }]}>
                        {item.label}
                      </Text>
                      {'subLabel' in item && item.subLabel ? (
                        <Text
                          style={[styles.optionSub, { color: paperTheme.colors.onSurfaceVariant }]}
                        >
                          ID: {item.subLabel}
                        </Text>
                      ) : null}
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={paperTheme.colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    marginBottom: 6,
    marginLeft: 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  value: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  hint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
    marginBottom: 12,
  },
  list: {
    maxHeight: 360,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  optionSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
});

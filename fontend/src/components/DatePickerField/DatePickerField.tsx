import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { MD3Theme } from 'react-native-paper';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maximumDate?: Date;
  minimumDate?: Date;
  paperTheme: MD3Theme;
};

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string): Date | null {
  if (!value.trim()) return null;
  const parts = value.split('-').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(value: string): string {
  const parsed = parseDateValue(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  maximumDate,
  minimumDate,
  paperTheme,
}: DatePickerFieldProps) {
  const { resolvedTheme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() => parseDateValue(value) ?? new Date());

  const pickerValue = useMemo(() => parseDateValue(value) ?? new Date(), [value]);

  const pickerTextColor = resolvedTheme === 'dark' ? '#FFFFFF' : '#1C1B1F';

  const openPicker = () => {
    setDraftDate(parseDateValue(value) ?? new Date());
    setShowPicker(true);
  };

  const closePicker = () => {
    setShowPicker(false);
  };

  const commitDate = (selectedDate: Date) => {
    onChange(formatDateValue(selectedDate));
    closePicker();
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      closePicker();
      return;
    }
    if (selectedDate) {
      commitDate(selectedDate);
    }
  };

  const handleIosChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setDraftDate(selectedDate);
    }
  };

  const clearValue = () => {
    onChange('');
    closePicker();
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant }]}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={disabled}
        onPress={openPicker}
        style={[
          styles.field,
          {
            backgroundColor: paperTheme.colors.surfaceVariant,
            borderColor: paperTheme.colors.outlineVariant,
            opacity: disabled ? 0.65 : 1,
          },
        ]}
      >
        <Ionicons name="calendar-outline" size={18} color={paperTheme.colors.onSurfaceVariant} />
        <Text
          style={[
            styles.value,
            {
              color: value ? paperTheme.colors.onSurface : paperTheme.colors.onSurfaceVariant,
            },
          ]}
          numberOfLines={1}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        {value ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            onPress={clearValue}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={paperTheme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={16} color={paperTheme.colors.onSurfaceVariant} />
        )}
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={closePicker}>
          <Pressable style={styles.backdrop} onPress={closePicker}>
            <Pressable
              style={[styles.sheet, { backgroundColor: paperTheme.colors.surface }]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: paperTheme.colors.onSurface }]}>
                  {label}
                </Text>
                <TouchableOpacity onPress={() => commitDate(draftDate)}>
                  <Text style={[styles.doneText, { color: paperTheme.colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.pickerWrap,
                  { backgroundColor: paperTheme.colors.surface },
                ]}
              >
                <DateTimePicker
                  value={draftDate}
                  mode="date"
                  display="spinner"
                  maximumDate={maximumDate}
                  minimumDate={minimumDate}
                  onChange={handleIosChange}
                  themeVariant={resolvedTheme}
                  textColor={pickerTextColor}
                  accentColor={paperTheme.colors.primary}
                  style={styles.picker}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="calendar"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={handleAndroidChange}
          positiveButton={{ label: 'OK', textColor: paperTheme.colors.primary }}
          negativeButton={{ label: 'Cancel', textColor: paperTheme.colors.onSurfaceVariant }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    flex: 1,
  },
  label: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  field: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  value: {
    flex: 1,
    fontFamily: fonts.PoppinsMedium,
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  doneText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  pickerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  picker: {
    width: '100%',
    height: 216,
  },
});

export { formatDateValue, parseDateValue, formatDisplayDate };

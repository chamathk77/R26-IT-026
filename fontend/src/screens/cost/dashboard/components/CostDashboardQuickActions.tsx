import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../../context/ThemeContext';
import { RootStackParamList } from '../../../../navigation/RootStackParamsList';
import { costCardShadow, costDashboardStyles as styles } from '../shared/costDashboardStyles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CostDashboardQuickActions() {
  const { paperTheme, resolvedTheme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.quickActionsWrap}>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: paperTheme.colors.surface,
              borderColor: paperTheme.colors.outlineVariant,
            },
            costCardShadow(resolvedTheme),
          ]}
          onPress={() => navigation.navigate('ManageCostCategories')}
        >
          <Ionicons name="folder-open-outline" size={18} color={paperTheme.colors.primary} />
          <Text style={[styles.actionBtnText, { color: paperTheme.colors.onSurface }]}>
            Add category
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnPrimary,
            { backgroundColor: paperTheme.colors.primary },
            costCardShadow(resolvedTheme),
          ]}
          onPress={() => navigation.navigate('AddCostExpense')}
        >
          <Ionicons name="add-circle-outline" size={18} color={paperTheme.colors.onPrimary} />
          <Text style={[styles.actionBtnText, { color: paperTheme.colors.onPrimary }]}>
            New expense
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

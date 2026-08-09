import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { SMART_COST_BANK_DETAILS } from '../../constants/businessConfig';
import { cardShadow } from '../../screens/settings/shared/settingsDetailStyles';

type Theme = ReturnType<typeof import('../../context/ThemeContext').useTheme>;

type Props = {
  paperTheme: Theme['paperTheme'];
  resolvedTheme: Theme['resolvedTheme'];
  footerText?: string;
};

function DetailLine({
  label,
  value,
  paperTheme,
  isLast = false,
}: {
  label: string;
  value: string;
  paperTheme: Theme['paperTheme'];
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: isLast ? 0 : 10,
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.PoppinsRegular,
          fontSize: 13,
          color: paperTheme.colors.onSurfaceVariant,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          flex: 1.2,
          fontFamily: fonts.PoppinsSemiBold,
          fontSize: 13,
          textAlign: 'right',
          color: paperTheme.colors.onSurface,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function BankTransferDetailsSection({
  paperTheme,
  resolvedTheme,
  footerText = 'After transfer, contact admin with your shop name and receipt number.',
}: Props) {
  return (
    <View
      style={[
        {
          borderRadius: 20,
          borderWidth: 1,
          borderColor: paperTheme.colors.outlineVariant,
          backgroundColor: paperTheme.colors.surface,
          padding: 16,
          marginBottom: 20,
          gap: 12,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: paperTheme.colors.primaryContainer,
          }}
        >
          <Ionicons name="business-outline" size={18} color={paperTheme.colors.primary} />
        </View>
        <Text
          style={{
            fontFamily: fonts.PoppinsSemiBold,
            fontSize: 15,
            color: paperTheme.colors.onSurface,
          }}
        >
          Bank transfer details
        </Text>
      </View>

      <DetailLine label="Bank" value={SMART_COST_BANK_DETAILS.bankName} paperTheme={paperTheme} />
      <DetailLine
        label="Account name"
        value={SMART_COST_BANK_DETAILS.accountName}
        paperTheme={paperTheme}
      />
      <DetailLine
        label="Account no"
        value={SMART_COST_BANK_DETAILS.accountNumber}
        paperTheme={paperTheme}
      />
      <DetailLine
        label="Branch"
        value={SMART_COST_BANK_DETAILS.branch}
        paperTheme={paperTheme}
        isLast
      />

      <Text
        style={{
          fontFamily: fonts.PoppinsRegular,
          fontSize: 13,
          lineHeight: 20,
          color: paperTheme.colors.onSurfaceVariant,
          marginTop: 4,
        }}
      >
        {footerText}
      </Text>
    </View>
  );
}

import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentRecord } from '../../../../type/payment';
import { payUpfrontStyles as styles } from './payUpfrontStyles';
import {
  getUpFrontStatusHighlight,
  getUpFrontStatusMeta,
} from './upFrontPaymentStatus';

type Theme = ReturnType<
  typeof import('../../../../context/ThemeContext').useTheme
>['paperTheme'];
type ResolvedTheme = ReturnType<
  typeof import('../../../../context/ThemeContext').useTheme
>['resolvedTheme'];

export function UpFrontPaymentStatusSection({
  payment,
  paperTheme,
  resolvedTheme,
}: {
  payment: PaymentRecord;
  paperTheme: Theme;
  resolvedTheme: ResolvedTheme;
}) {
  const statusMeta = getUpFrontStatusMeta(payment.status);
  const highlight = getUpFrontStatusHighlight(payment.status, resolvedTheme);

  return (
    <>
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: highlight.backgroundColor,
            borderColor: highlight.borderColor,
          },
        ]}
      >
        <Ionicons
          name={statusMeta.icon}
          size={18}
          color={statusMeta.color}
        />
        <Text style={[styles.statusBannerText, { color: statusMeta.color }]}>
          {statusMeta.label}
        </Text>
      </View>

      {payment.status === 'rejected' && payment.reason?.trim() ? (
        <View
          style={[
            styles.reasonBox,
            {
              backgroundColor: resolvedTheme === 'dark' ? '#450a0a' : '#fef2f2',
              borderColor: '#fecaca',
            },
          ]}
        >
          <Text style={[styles.reasonLabel, { color: '#b91c1c' }]}>
            Rejection reason
          </Text>
          <Text style={[styles.reasonText, { color: '#991b1b' }]}>
            {payment.reason.trim()}
          </Text>
        </View>
      ) : null}
    </>
  );
}

export function getUpFrontHeroCardStyle(
  payment: PaymentRecord,
  resolvedTheme: ResolvedTheme,
) {
  const highlight = getUpFrontStatusHighlight(payment.status, resolvedTheme);
  return {
    backgroundColor: highlight.backgroundColor,
    borderColor: highlight.borderColor,
    borderLeftWidth: 4,
    borderLeftColor: highlight.accentColor,
  };
}

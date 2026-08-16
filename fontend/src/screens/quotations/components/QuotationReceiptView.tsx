import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../../constants/fonts';
import { useTheme } from '../../../context/ThemeContext';
import type { LoginShop } from '../../../type/auth';
import { formatCheckoutAmount } from '../../../type/checkoutPayment';
import type { QuotationRecord } from '../../../type/quotation';
import {
  formatQuotationDate,
  formatQuotationDiscountLabel,
  getQuotationStatusStyle,
} from '../../../utils/quotationPresentation';
import { cardShadow } from '../../settings/shared/settingsDetailStyles';

type Props = {
  record: QuotationRecord;
  shop: LoginShop | null;
};

function SummaryLine({
  label,
  value,
  labelColor,
  valueColor,
  bold = false,
}: {
  label: string;
  value: string;
  labelColor: string;
  valueColor: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, { color: labelColor }, bold && styles.boldText]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: valueColor }, bold && styles.boldText]}>{value}</Text>
    </View>
  );
}

export default function QuotationReceiptView({ record, shop }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const shopName = shop?.shopName?.trim() || 'Shop';
  const shopAddress = shop?.address?.trim() || '—';
  const shopPhone = shop?.shopMobileNumber?.trim() || '';
  const ownerPhone = shop?.ownerMobileNumber?.trim() || '';
  const contactLine = [shopPhone, ownerPhone].filter(Boolean).join(' · ') || '—';
  const statusStyle = getQuotationStatusStyle(record.status);
  const primary = paperTheme.colors.primary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outlineVariant },
        cardShadow(resolvedTheme),
      ]}
    >
      <View style={[styles.hero, { backgroundColor: primary }]}>
        <View style={styles.heroOrbOne} />
        <View style={styles.heroOrbTwo} />

        <View style={styles.heroTop}>
          <View style={styles.shopBadge}>
            <Ionicons name="storefront-outline" size={18} color={primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroShopName}>{shopName}</Text>
            <Text style={styles.heroShopMeta}>{shopAddress}</Text>
            <Text style={styles.heroShopMeta}>{contactLine}</Text>
          </View>
        </View>

        <View style={styles.heroQuoteBlock}>
          <Text style={styles.heroEyebrow}>QUOTATION</Text>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroQuoteNumber}>{record.quotationNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{record.status}</Text>
            </View>
          </View>
          <Text style={styles.heroDate}>{formatQuotationDate(record.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.infoCard, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
          <Text style={[styles.infoLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Prepared for</Text>
          <Text style={[styles.customerName, { color: paperTheme.colors.onSurface }]}>
            {record.customerName.trim() || 'Walk-in customer'}
          </Text>
          {record.customerMobile.trim() ? (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color={paperTheme.colors.primary} />
              <Text style={[styles.customerPhone, { color: paperTheme.colors.onSurfaceVariant }]}>
                {record.customerMobile}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>Line items</Text>
          <Text style={[styles.sectionMeta, { color: paperTheme.colors.onSurfaceVariant }]}>
            {record.items.length} item{record.items.length === 1 ? '' : 's'}
          </Text>
        </View>

        {record.items.map((item, index) => (
          <View
            key={`${item.productId}-${item.productName}`}
            style={[
              styles.itemCard,
              {
                backgroundColor: paperTheme.colors.background,
                borderColor: paperTheme.colors.outlineVariant,
              },
            ]}
          >
            <View style={[styles.itemIndex, { backgroundColor: `${primary}18` }]}>
              <Text style={[styles.itemIndexText, { color: primary }]}>{index + 1}</Text>
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemName, { color: paperTheme.colors.onSurface }]}>{item.productName}</Text>
              <Text style={[styles.itemUnit, { color: paperTheme.colors.onSurfaceVariant }]}>
                {item.qty} × {formatCheckoutAmount(item.unitCost ?? 0)}
              </Text>
            </View>
            <Text style={[styles.itemAmount, { color: paperTheme.colors.onSurface }]}>
              {formatCheckoutAmount((item.unitCost ?? 0) * item.qty)}
            </Text>
          </View>
        ))}

        <View style={[styles.summaryCard, { borderColor: paperTheme.colors.outlineVariant }]}>
          <SummaryLine
            label="Subtotal"
            value={formatCheckoutAmount(record.subtotal)}
            labelColor={paperTheme.colors.onSurfaceVariant}
            valueColor={paperTheme.colors.onSurface}
          />
          {(record.discountAmount ?? 0) > 0 ? (
            <SummaryLine
              label={formatQuotationDiscountLabel(record)}
              value={`-${formatCheckoutAmount(record.discountAmount ?? 0)}`}
              labelColor={paperTheme.colors.onSurfaceVariant}
              valueColor={paperTheme.colors.error}
            />
          ) : null}
          {record.includeTaxes
            ? record.taxBreakdown.map((entry) => (
                <SummaryLine
                  key={entry.id}
                  label={entry.label}
                  value={formatCheckoutAmount(entry.amount)}
                  labelColor={paperTheme.colors.onSurfaceVariant}
                  valueColor={paperTheme.colors.onSurface}
                />
              ))
            : null}
        </View>

        <View style={[styles.totalCard, { backgroundColor: paperTheme.colors.primaryContainer }]}>
          <View>
            <Text style={[styles.totalLabel, { color: paperTheme.colors.onPrimaryContainer }]}>Quote total</Text>
            <Text style={[styles.totalHint, { color: paperTheme.colors.onPrimaryContainer }]}>
              {record.includeTaxes ? 'Taxes included' : 'Taxes not included'}
            </Text>
          </View>
          <Text style={[styles.totalValue, { color: paperTheme.colors.primary }]}>
            {formatCheckoutAmount(record.totalAmount)}
          </Text>
        </View>

        {record.notes.trim() ? (
          <View style={[styles.notesCard, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
            <Text style={[styles.infoLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Notes</Text>
            <Text style={[styles.notesText, { color: paperTheme.colors.onSurface }]}>{record.notes}</Text>
          </View>
        ) : null}

        <Text style={[styles.footerNote, { color: paperTheme.colors.onSurfaceVariant }]}>
          This document is a quotation for pricing purposes only. It is not a tax invoice.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  heroOrbOne: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -30,
    right: -20,
  },
  heroOrbTwo: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: 10,
    left: -20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  shopBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroShopName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 2,
  },
  heroShopMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.86)',
  },
  heroQuoteBlock: {
    gap: 6,
  },
  heroEyebrow: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.82)',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroQuoteNumber: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 28,
    color: '#ffffff',
    flex: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  heroDate: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
  },
  body: {
    padding: 18,
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  infoLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  customerName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 17,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  customerPhone: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  sectionMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemIndex: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIndexText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  itemUnit: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  itemAmount: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    flex: 1,
  },
  summaryValue: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
    textAlign: 'right',
  },
  boldText: {
    fontFamily: fonts.PoppinsSemiBold,
  },
  totalCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  totalHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.85,
  },
  totalValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 26,
  },
  notesCard: {
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  notesText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  footerNote: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});

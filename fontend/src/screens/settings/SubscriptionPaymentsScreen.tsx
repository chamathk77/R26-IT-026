import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { useTheme } from '../../context/ThemeContext';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import { fonts } from '../../constants/fonts';
import { cardShadow, settingsDetailStyles as styles } from './settingsDetailStyles';
import { SettingsBadge } from './SettingsDetailComponents';

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionPayments'>;

type PaymentStatus = 'pending' | 'approve' | 'rejected' | 'notPaid';

type DummyPayment = {
  id: string;
  receiptNumber: string;
  paymentMonth: string;
  submittedDate: string;
  amount: number;
  status: PaymentStatus;
  reason?: string;
};

const DUMMY_CURRENT_STATUS: PaymentStatus = 'pending';

const DUMMY_PAYMENTS: DummyPayment[] = [
  {
    id: '1',
    receiptNumber: 'RCP-2026-0042',
    paymentMonth: 'June',
    submittedDate: '2026-06-01T09:30:00.000Z',
    amount: 2500,
    status: 'pending',
  },
  {
    id: '2',
    receiptNumber: 'RCP-2026-0038',
    paymentMonth: 'May',
    submittedDate: '2026-05-02T10:30:00.000Z',
    amount: 2500,
    status: 'approve',
  },
  {
    id: '3',
    receiptNumber: 'RCP-2026-0031',
    paymentMonth: 'April',
    submittedDate: '2026-04-01T09:15:00.000Z',
    amount: 2500,
    status: 'approve',
  },
  {
    id: '4',
    receiptNumber: 'RCP-2026-0025',
    paymentMonth: 'March',
    submittedDate: '2026-03-03T14:20:00.000Z',
    amount: 2500,
    status: 'rejected',
    reason: 'Receipt image is unclear. Please resubmit.',
  },
  {
    id: '5',
    receiptNumber: 'RCP-2026-0018',
    paymentMonth: 'February',
    submittedDate: '2026-02-05T11:00:00.000Z',
    amount: 2500,
    status: 'approve',
  },
];

function formatDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`;
}

function getStatusMeta(status: PaymentStatus) {
  switch (status) {
    case 'approve':
      return {
        label: 'Approved',
        tone: 'success' as const,
        icon: 'checkmark-circle-outline' as const,
        color: '#15803d',
      };
    case 'pending':
      return {
        label: 'Pending',
        tone: 'warning' as const,
        icon: 'time-outline' as const,
        color: '#b45309',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        tone: 'neutral' as const,
        icon: 'close-circle-outline' as const,
        color: '#dc2626',
      };
    case 'notPaid':
    default:
      return {
        label: 'Not paid',
        tone: 'neutral' as const,
        icon: 'alert-circle-outline' as const,
        color: '#64748b',
      };
  }
}

function PaymentHistoryCard({
  payment,
  paperTheme,
  resolvedTheme,
}: {
  payment: DummyPayment;
  paperTheme: ReturnType<typeof useTheme>['paperTheme'];
  resolvedTheme: 'light' | 'dark';
}) {
  const statusMeta = getStatusMeta(payment.status);

  return (
    <View
      style={[
        paymentStyles.historyCard,
        {
          backgroundColor: paperTheme.colors.surface,
          borderColor: paperTheme.colors.outlineVariant,
        },
        cardShadow(resolvedTheme),
      ]}
    >
      <View style={paymentStyles.historyTop}>
        <View style={paymentStyles.historyTitleBlock}>
          <Text style={[paymentStyles.monthText, { color: paperTheme.colors.onSurface }]}>
            {payment.paymentMonth} subscription
          </Text>
          <Text
            style={[
              paymentStyles.receiptText,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            {payment.receiptNumber}
          </Text>
        </View>
        {payment.status === 'rejected' ? (
          <View
            style={[paymentStyles.rejectedBadge, { backgroundColor: '#fee2e2' }]}
          >
            <Text style={[paymentStyles.rejectedBadgeText, { color: '#dc2626' }]}>
              Rejected
            </Text>
          </View>
        ) : (
          <SettingsBadge
            label={statusMeta.label}
            tone={statusMeta.tone}
            paperTheme={paperTheme}
          />
        )}
      </View>

      <View style={paymentStyles.metaRow}>
        <View style={paymentStyles.metaItem}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={paperTheme.colors.onSurfaceVariant}
          />
          <Text
            style={[
              paymentStyles.metaText,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            Submitted {formatDate(payment.submittedDate)}
          </Text>
        </View>
        <Text style={[paymentStyles.amountText, { color: paperTheme.colors.onSurface }]}>
          {formatAmount(payment.amount)}
        </Text>
      </View>

      {payment.reason ? (
        <View
          style={[
            paymentStyles.reasonBox,
            {
              backgroundColor:
                resolvedTheme === 'dark' ? '#450a0a' : '#fef2f2',
              borderColor: '#fecaca',
            },
          ]}
        >
          <Text style={[paymentStyles.reasonText, { color: '#b91c1c' }]}>
            {payment.reason}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function SubscriptionPaymentsScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const currentStatus = getStatusMeta(DUMMY_CURRENT_STATUS);
  const latestPayment = DUMMY_PAYMENTS[0];

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
        <CommonHeader
          title="Payments"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              paymentStyles.summaryCard,
              {
                backgroundColor: paperTheme.colors.surface,
                borderColor: paperTheme.colors.outlineVariant,
              },
              cardShadow(resolvedTheme),
            ]}
          >
            <View
              style={[
                paymentStyles.summaryIcon,
                { backgroundColor: paperTheme.colors.primaryContainer },
              ]}
            >
              <Ionicons
                name="wallet-outline"
                size={28}
                color={paperTheme.colors.primary}
              />
            </View>
            <Text style={[paymentStyles.summaryTitle, { color: paperTheme.colors.onSurface }]}>
              Subscription payment
            </Text>
            <Text
              style={[
                paymentStyles.summarySubtitle,
                { color: paperTheme.colors.onSurfaceVariant },
              ]}
            >
              Monthly plan — Rs. 2,500
            </Text>

            <View style={paymentStyles.currentStatusRow}>
              <Text
                style={[
                  paymentStyles.currentStatusLabel,
                  { color: paperTheme.colors.onSurfaceVariant },
                ]}
              >
                Current status
              </Text>
              <View style={paymentStyles.currentStatusValue}>
                <Ionicons
                  name={currentStatus.icon}
                  size={16}
                  color={currentStatus.color}
                />
                <Text
                  style={[
                    paymentStyles.currentStatusText,
                    { color: currentStatus.color },
                  ]}
                >
                  {currentStatus.label}
                </Text>
              </View>
            </View>

            <View
              style={[
                paymentStyles.latestBanner,
                {
                  backgroundColor:
                    resolvedTheme === 'dark' ? '#422006' : '#fffbeb',
                  borderColor: '#f59e0b',
                },
              ]}
            >
              <Text style={[paymentStyles.latestLabel, { color: '#92400e' }]}>
                Latest submission
              </Text>
              <Text style={[paymentStyles.latestValue, { color: '#78350f' }]}>
                {latestPayment.paymentMonth} — {latestPayment.receiptNumber}
              </Text>
            </View>
          </View>

          <Text
            style={[
              paymentStyles.sectionLabel,
              { color: paperTheme.colors.onSurfaceVariant },
            ]}
          >
            Payment history
          </Text>

          {DUMMY_PAYMENTS.map((payment) => (
            <PaymentHistoryCard
              key={payment.id}
              payment={payment}
              paperTheme={paperTheme}
              resolvedTheme={resolvedTheme}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const paymentStyles = StyleSheet.create({
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
    lineHeight: 26,
  },
  summarySubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    marginTop: 4,
  },
  currentStatusRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  currentStatusLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  currentStatusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentStatusText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  latestBanner: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  latestLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  latestValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  historyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  historyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  monthText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  receiptText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  rejectedBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rejectedBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    flexShrink: 1,
  },
  amountText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 14,
  },
  reasonBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  reasonText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 18,
  },
});

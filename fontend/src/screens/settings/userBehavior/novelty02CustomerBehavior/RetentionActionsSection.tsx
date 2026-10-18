import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { getApiErrorMessage } from '../../../../utils/apiErrorAlert';
import {
  createRetentionAction,
  deleteRetentionAction,
  fetchRetentionActions,
  updateRetentionAction,
} from './retentionActionService';
import { retentionActionStyles as styles } from './retentionActionStyles';
import type {
  CreateRetentionActionPayload,
  RetentionAction,
  RetentionActionPriority,
  RetentionActionSegment,
  RetentionActionStatus,
} from './retentionActionTypes';

const SEGMENT_COLORS: Record<RetentionActionSegment, string> = {
  'VIP / Loyal': '#16a34a',
  Regular: '#2563eb',
  Occasional: '#f59e0b',
  'At Risk / Lapsed': '#ef4444',
};

const PRIORITY_THEMES: Record<
  RetentionActionPriority,
  { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  High: { bg: '#fee2e2', text: '#b91c1c', icon: 'flame' },
  Medium: { bg: '#fef3c7', text: '#b45309', icon: 'alert-circle' },
  Low: { bg: '#e0f2fe', text: '#0284c7', icon: 'flag' },
};

const STATUS_THEMES: Record<
  RetentionActionStatus,
  { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  Planned: { bg: '#f1f5f9', text: '#475569', icon: 'calendar-outline' },
  'In Progress': { bg: '#dbeafe', text: '#1d4ed8', icon: 'time-outline' },
  Completed: { bg: '#dcfce7', text: '#15803d', icon: 'checkmark-circle-outline' },
};

const STARTER_TEMPLATES = [
  {
    title: 'Reward VIP / Loyal Customers',
    targetSegment: 'VIP / Loyal' as RetentionActionSegment,
    priority: 'High' as RetentionActionPriority,
    description: 'Provide exclusive tier discounts, complimentary gifts, or early access promos to high-LTV loyal customers.',
  },
  {
    title: 'Re-engage At Risk / Lapsed Customers',
    targetSegment: 'At Risk / Lapsed' as RetentionActionSegment,
    priority: 'High' as RetentionActionPriority,
    description: 'Send special win-back offers or reminder notifications to re-activate customers who have not visited recently.',
  },
  {
    title: 'Encourage Repeat Purchases for Occasional Customers',
    targetSegment: 'Occasional' as RetentionActionSegment,
    priority: 'Medium' as RetentionActionPriority,
    description: 'Offer bundled combos or purchase-frequency incentives to convert occasional shoppers into regulars.',
  },
  {
    title: 'Review Retention Performance for Regulars',
    targetSegment: 'Regular' as RetentionActionSegment,
    priority: 'Low' as RetentionActionPriority,
    description: 'Track basket size trends and evaluate monthly shopping cadence for regular segment members.',
  },
];

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateDisplay(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Automatically creates suitable start and end dates based on action status.
 */
function getDatesForStatus(status: RetentionActionStatus): { startDate: string; endDate: string } {
  const now = new Date();
  if (status === 'Planned') {
    // Tomorrow as start, +14 days as end
    const start = new Date(now);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    return { startDate: formatDateInput(start), endDate: formatDateInput(end) };
  } else if (status === 'In Progress') {
    // Today as start, +7 days as end
    const start = new Date(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { startDate: formatDateInput(start), endDate: formatDateInput(end) };
  } else {
    // Completed: 7 days ago as start, today as completed/end
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { startDate: formatDateInput(start), endDate: formatDateInput(end) };
  }
}

/**
 * Automatically resolves the active lifecycle status based on calendar dates:
 * - When end date has arrived or passed (now >= endDate) -> 'Completed'
 * - When planned start date has arrived (now >= startDate) -> 'In Progress'
 * - Otherwise preserves the scheduled status (e.g. 'Planned')
 */
export function resolveActionStatus(action: RetentionAction): RetentionActionStatus {
  const now = new Date();
  const rawEnd = action.endDate || action.dueDate;
  if (rawEnd) {
    const end = new Date(rawEnd);
    if (!isNaN(end.getTime()) && now >= end) {
      return 'Completed';
    }
  }

  if (action.startDate) {
    const start = new Date(action.startDate);
    if (!isNaN(start.getTime()) && now >= start) {
      if (action.status === 'Planned') {
        return 'In Progress';
      }
    }
  }

  return action.status;
}

function getProgressMetrics(action: RetentionAction): {
  percent: number;
  elapsedDays: number;
  totalDays: number;
  remainingDays: number;
} {
  const effectiveStatus = resolveActionStatus(action);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = action.startDate ? new Date(action.startDate) : new Date(action.createdAt);
  start.setHours(0, 0, 0, 0);

  const rawEnd = action.endDate || action.dueDate;
  const end = rawEnd ? new Date(rawEnd) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  end.setHours(0, 0, 0, 0);

  const totalMs = Math.max(end.getTime() - start.getTime(), 1000 * 60 * 60 * 24);
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());
  const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.min(totalDays, Math.round(elapsedMs / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  if (effectiveStatus === 'Completed') {
    return { percent: 100, elapsedDays: totalDays, totalDays, remainingDays: 0 };
  }

  if (effectiveStatus === 'Planned') {
    return { percent: 0, elapsedDays: 0, totalDays, remainingDays: totalDays };
  }

  const rawPercent = Math.round((elapsedMs / totalMs) * 100);
  const percent = Math.min(100, Math.max(5, rawPercent));
  return { percent, elapsedDays, totalDays, remainingDays };
}

function getTimelineInfo(action: RetentionAction): {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  const effectiveStatus = resolveActionStatus(action);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (effectiveStatus === 'Completed') {
    const end = action.endDate || action.dueDate;
    return {
      text: end ? `Finished on ${formatDateDisplay(end)}` : 'Completed',
      icon: 'checkmark-circle',
      color: '#15803d',
    };
  }

  if (effectiveStatus === 'Planned') {
    if (action.startDate) {
      const start = new Date(action.startDate);
      start.setHours(0, 0, 0, 0);
      const diffDays = Math.round((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        return { text: `Starts in ${diffDays} days`, icon: 'calendar-outline', color: '#475569' };
      } else if (diffDays === 1) {
        return { text: 'Starts tomorrow', icon: 'calendar-outline', color: '#0284c7' };
      } else if (diffDays === 0) {
        return { text: 'Starts today', icon: 'flash-outline', color: '#2563eb' };
      }
    }
    return { text: 'Planned', icon: 'calendar-outline', color: '#475569' };
  }

  // In Progress
  const end = action.endDate || action.dueDate;
  if (end) {
    const dueDate = new Date(end);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, icon: 'alert-circle', color: '#dc2626' };
    } else if (diffDays === 0) {
      return { text: 'Due today', icon: 'time', color: '#b45309' };
    } else if (diffDays === 1) {
      return { text: '1 day left', icon: 'time-outline', color: '#b45309' };
    } else {
      return { text: `${diffDays} days left`, icon: 'time-outline', color: '#2563eb' };
    }
  }

  return { text: 'In Progress', icon: 'time-outline', color: '#2563eb' };
}

export default function RetentionActionsSection() {
  const { paperTheme } = useTheme();
  const primary = paperTheme.colors.primary;
  const surface = paperTheme.colors.surface;
  const outline = paperTheme.colors.outline;
  const onSurface = paperTheme.colors.onSurface;
  const onSurfaceVariant = paperTheme.colors.onSurfaceVariant;

  const [actions, setActions] = useState<RetentionAction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'All' | RetentionActionStatus>('All');
  const [segmentFilter, setSegmentFilter] = useState<'All' | RetentionActionSegment>('All');

  // Modals state
  const [showRetentionPopup, setShowRetentionPopup] = useState<boolean>(false);
  const [returnToRetentionPopup, setReturnToRetentionPopup] = useState<boolean>(false);
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<RetentionAction | null>(null);
  const [viewingAction, setViewingAction] = useState<RetentionAction | null>(null);

  const closeFormModal = () => {
    setShowFormModal(false);
    if (returnToRetentionPopup) {
      setShowRetentionPopup(true);
      setReturnToRetentionPopup(false);
    }
  };

  const closeDetailsModal = () => {
    setViewingAction(null);
    if (returnToRetentionPopup) {
      setShowRetentionPopup(true);
      setReturnToRetentionPopup(false);
    }
  };

  // Form fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSegment, setFormSegment] = useState<RetentionActionSegment>('VIP / Loyal');
  const [formPriority, setFormPriority] = useState<RetentionActionPriority>('Medium');
  const [formStatus, setFormStatus] = useState<RetentionActionStatus>('Planned');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const list = await fetchRetentionActions();
      setActions(list);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not load retention actions. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  const openCreateModal = (template?: typeof STARTER_TEMPLATES[0]) => {
    setEditingAction(null);
    setTitleError(null);
    setDateError(null);

    const initialStatus: RetentionActionStatus = 'Planned';
    const dates = getDatesForStatus(initialStatus);

    if (template) {
      setFormTitle(template.title);
      setFormDescription(template.description);
      setFormSegment(template.targetSegment);
      setFormPriority(template.priority);
      setFormStatus(initialStatus);
    } else {
      setFormTitle('');
      setFormDescription('');
      setFormSegment('VIP / Loyal');
      setFormPriority('Medium');
      setFormStatus(initialStatus);
    }
    setFormStartDate(dates.startDate);
    setFormEndDate(dates.endDate);
    setShowFormModal(true);
  };

  const openEditModal = (action: RetentionAction) => {
    setEditingAction(action);
    setTitleError(null);
    setDateError(null);
    setFormTitle(action.title);
    setFormDescription(action.description || '');
    setFormSegment(action.targetSegment);
    setFormPriority(action.priority);
    setFormStatus(resolveActionStatus(action));

    const sDate = action.startDate
      ? new Date(action.startDate).toISOString().slice(0, 10)
      : '';
    const eDate = action.endDate || action.dueDate
      ? new Date(action.endDate || action.dueDate!).toISOString().slice(0, 10)
      : '';

    setFormStartDate(sDate);
    setFormEndDate(eDate);
    setShowFormModal(true);
  };

  /**
   * When user clicks any status (Planned, In Progress, Completed),
   * automatically configure suitable start and end dates.
   */
  const handleSelectStatus = (newStatus: RetentionActionStatus) => {
    setFormStatus(newStatus);
    const dates = getDatesForStatus(newStatus);
    setFormStartDate(dates.startDate);
    setFormEndDate(dates.endDate);
    setDateError(null);
  };

  const handleSaveAction = async () => {
    if (!formTitle.trim()) {
      setTitleError('Action title is required');
      return;
    }
    setTitleError(null);

    // Validate date sequence if both provided
    if (formStartDate.trim() && formEndDate.trim()) {
      const s = new Date(formStartDate.trim());
      const e = new Date(formEndDate.trim());
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e.getTime() < s.getTime()) {
        setDateError('End date cannot be earlier than start date');
        return;
      }
    }
    setDateError(null);

    try {
      setSubmitting(true);

      // Auto-align status if dates arrived
      let resolvedSaveStatus = formStatus;
      const now = new Date();
      const s = formStartDate.trim() ? new Date(formStartDate.trim()) : null;
      const e = formEndDate.trim() ? new Date(formEndDate.trim()) : null;

      if (e && !isNaN(e.getTime()) && e <= now) {
        resolvedSaveStatus = 'Completed';
      } else if (s && !isNaN(s.getTime()) && s <= now) {
        if (resolvedSaveStatus === 'Planned') {
          resolvedSaveStatus = 'In Progress';
        }
      }

      const payload: CreateRetentionActionPayload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        targetSegment: formSegment,
        priority: formPriority,
        status: resolvedSaveStatus,
        startDate: formStartDate.trim() ? new Date(formStartDate.trim()).toISOString() : null,
        endDate: formEndDate.trim() ? new Date(formEndDate.trim()).toISOString() : null,
        dueDate: formEndDate.trim() ? new Date(formEndDate.trim()).toISOString() : null,
      };

      if (editingAction) {
        const updated = await updateRetentionAction(editingAction._id, payload);
        setActions((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
        if (viewingAction?._id === updated._id) {
          setViewingAction(updated);
        }
      } else {
        const created = await createRetentionAction(payload);
        setActions((prev) => [created, ...prev]);
      }

      closeFormModal();
    } catch (err: unknown) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to save retention action.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusCycle = async (action: RetentionAction) => {
    const nextStatusMap: Record<RetentionActionStatus, RetentionActionStatus> = {
      Planned: 'In Progress',
      'In Progress': 'Completed',
      Completed: 'Planned',
    };
    const nextStatus = nextStatusMap[action.status];
    const suitableDates = getDatesForStatus(nextStatus);

    try {
      const updated = await updateRetentionAction(action._id, {
        status: nextStatus,
        startDate: action.startDate || new Date(suitableDates.startDate).toISOString(),
        endDate: new Date(suitableDates.endDate).toISOString(),
        dueDate: new Date(suitableDates.endDate).toISOString(),
      });
      setActions((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      if (viewingAction?._id === updated._id) {
        setViewingAction(updated);
      }
    } catch (err: unknown) {
      Alert.alert('Error', getApiErrorMessage(err, 'Could not change action status.'));
    }
  };

  const handleDeleteAction = (action: RetentionAction) => {
    Alert.alert(
      'Delete Retention Action',
      `Are you sure you want to delete "${action.title}"?\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRetentionAction(action._id);
              setActions((prev) => prev.filter((a) => a._id !== action._id));
              if (viewingAction?._id === action._id) {
                closeDetailsModal();
              }
            } catch (err: unknown) {
              Alert.alert('Error', getApiErrorMessage(err, 'Failed to delete retention action.'));
            }
          },
        },
      ],
    );
  };

  const setQuickStartDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setFormStartDate(formatDateInput(d));
    setDateError(null);

    // If start date is today/past, automatically set status to In Progress
    if (daysAhead <= 0 && formStatus === 'Planned') {
      setFormStatus('In Progress');
    } else if (daysAhead > 0 && formStatus === 'In Progress') {
      setFormStatus('Planned');
    }
  };

  const setQuickEndDate = (daysAhead: number) => {
    const base = formStartDate.trim() ? new Date(formStartDate.trim()) : new Date();
    const d = new Date(isNaN(base.getTime()) ? new Date() : base);
    d.setDate(d.getDate() + daysAhead);
    const dateStr = formatDateInput(d);
    setFormEndDate(dateStr);
    setDateError(null);

    const nowStr = formatDateInput(new Date());
    if (dateStr <= nowStr) {
      setFormStatus('Completed');
    }
  };

  // Filtered list with dynamic lifecycle resolution
  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      const currentStatus = resolveActionStatus(action);
      if (statusFilter !== 'All' && currentStatus !== statusFilter) return false;
      if (segmentFilter !== 'All' && action.targetSegment !== segmentFilter) return false;
      return true;
    });
  }, [actions, statusFilter, segmentFilter]);

  // Counts for badge with dynamic lifecycle resolution
  const countsByStatus = useMemo(() => {
    const counts = { All: actions.length, Planned: 0, 'In Progress': 0, Completed: 0 };
    actions.forEach((a) => {
      const s = resolveActionStatus(a);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [actions]);

  return (
    <View style={styles.container}>
      {/* 1. Main Retention Actions Hero Card */}
      <View style={[styles.mainSectionCard, { backgroundColor: surface, borderColor: outline }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIconWrap, { backgroundColor: `${primary}1f` }]}>
              <Ionicons name="checkbox-outline" size={20} color={primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: onSurface }]}>Retention Actions</Text>
              <Text style={[styles.sectionSubtitle, { color: onSurfaceVariant, marginBottom: 0 }]}>
                Customer retention campaigns & lifecycle tracking
              </Text>
            </View>
          </View>
        </View>

        {/* Live Status Summary Badges (Clicking opens popup filtered to that status) */}
        <View style={styles.statusSummaryRow}>
          <TouchableOpacity
            style={[styles.statusSummaryPill, { backgroundColor: '#f1f5f9' }]}
            activeOpacity={0.8}
            onPress={() => {
              setStatusFilter('Planned');
              setShowRetentionPopup(true);
            }}
          >
            <Ionicons name="calendar-outline" size={13} color="#475569" />
            <Text style={[styles.statusSummaryPillText, { color: '#475569' }]}>
              {countsByStatus.Planned} Planned
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusSummaryPill, { backgroundColor: '#eff6ff' }]}
            activeOpacity={0.8}
            onPress={() => {
              setStatusFilter('In Progress');
              setShowRetentionPopup(true);
            }}
          >
            <Ionicons name="flash-outline" size={13} color="#2563eb" />
            <Text style={[styles.statusSummaryPillText, { color: '#2563eb' }]}>
              {countsByStatus['In Progress']} In Progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusSummaryPill, { backgroundColor: '#f0fdf4' }]}
            activeOpacity={0.8}
            onPress={() => {
              setStatusFilter('Completed');
              setShowRetentionPopup(true);
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={13} color="#16a34a" />
            <Text style={[styles.statusSummaryPillText, { color: '#16a34a' }]}>
              {countsByStatus.Completed} Completed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Solid Buttons: Retention Actions (Opens Popup) and Add Action */}
        <View style={styles.mainButtonRow}>
          <TouchableOpacity
            style={[styles.retentionMainBtn, { backgroundColor: primary }]}
            activeOpacity={0.85}
            onPress={() => {
              setStatusFilter('All');
              setShowRetentionPopup(true);
            }}
          >
            <Ionicons name="layers-outline" size={18} color="#ffffff" />
            <Text style={styles.retentionMainBtnText}>Retention Actions</Text>
            <View style={styles.retentionMainBtnCount}>
              <Text style={styles.retentionMainBtnCountText}>{actions.length}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.retentionAddBtn, { borderColor: primary, backgroundColor: `${primary}0f` }]}
            activeOpacity={0.85}
            onPress={() => openCreateModal()}
          >
            <Ionicons name="add" size={18} color={primary} />
            <Text style={[styles.retentionAddBtnText, { color: primary }]}>Add Action</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. POPUP MODAL: Shows All Retention Actions, Status Tabs & Management */}
      <Modal
        visible={showRetentionPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRetentionPopup(false)}
      >
        <View style={styles.retentionPopupOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowRetentionPopup(false)}
          />
          <View
            style={[styles.retentionPopupCard, { backgroundColor: surface, borderColor: outline }]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.sectionIconWrap, { backgroundColor: `${primary}1f` }]}>
                  <Ionicons name="layers-outline" size={18} color={primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.modalTitle, { color: onSurface }]}>Retention Actions</Text>
                    <View style={[styles.statusTabBadge, { backgroundColor: `${primary}18` }]}>
                      <Text style={[styles.statusTabBadgeText, { color: primary }]}>{actions.length}</Text>
                    </View>
                  </View>
                  <Text style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
                    Plan, monitor campaigns & customer retention
                  </Text>
                </View>
              </View>

              <View style={styles.popupHeaderActions}>
                <TouchableOpacity
                  style={[styles.popupAddBtn, { backgroundColor: primary }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setReturnToRetentionPopup(true);
                    setShowRetentionPopup(false);
                    openCreateModal();
                  }}
                >
                  <Ionicons name="add" size={14} color="#ffffff" />
                  <Text style={styles.popupAddBtnText}>Add</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: `${outline}20` }]}
                  onPress={() => setShowRetentionPopup(false)}
                >
                  <Ionicons name="close" size={18} color={onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Filter Tab Buttons: All, Planned, In Progress, Completed */}
            <View style={styles.statusButtonsBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.statusButtonsRow}
              >
                {(['All', 'Planned', 'In Progress', 'Completed'] as const).map((st) => {
                  const active = statusFilter === st;
                  const count = countsByStatus[st];
                  const theme =
                    st === 'In Progress'
                      ? { bg: '#eff6ff', border: '#2563eb', text: '#2563eb' }
                      : st === 'Completed'
                        ? { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a' }
                        : st === 'Planned'
                          ? { bg: '#f1f5f9', border: '#475569', text: '#475569' }
                          : { bg: `${primary}18`, border: primary, text: primary };

                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusTabBtn,
                        {
                          backgroundColor: active ? theme.bg : surface,
                          borderColor: active ? theme.border : outline,
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setStatusFilter(st)}
                    >
                      <Text
                        style={[
                          styles.statusTabBtnText,
                          { color: active ? theme.text : onSurfaceVariant },
                        ]}
                      >
                        {st}
                      </Text>
                      <View
                        style={[
                          styles.statusTabBadge,
                          {
                            backgroundColor: active ? theme.text : `${outline}40`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTabBadgeText,
                            { color: active ? '#ffffff' : onSurfaceVariant },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Scrollable Content inside Popup */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1 }}
            >
              {/* Loading State */}
              {loading ? (
                <View style={[styles.loadingBox, { backgroundColor: surface, borderColor: outline }]}>
                  <ActivityIndicator size="small" color={primary} />
                  <Text style={[styles.loadingText, { color: onSurfaceVariant }]}>
                    Loading customer retention actions…
                  </Text>
                </View>
              ) : null}

              {/* Error State */}
              {error && !loading ? (
                <View
                  style={[
                    styles.errorBox,
                    {
                      backgroundColor: paperTheme.colors.errorContainer,
                      borderColor: `${paperTheme.colors.error}33`,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={20} color={paperTheme.colors.error} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.errorText, { color: paperTheme.colors.onErrorContainer }]}>
                      {error}
                    </Text>
                    <TouchableOpacity
                      style={[styles.retryBtn, { backgroundColor: paperTheme.colors.error }]}
                      onPress={() => void loadActions()}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="refresh" size={12} color="#ffffff" />
                      <Text style={[styles.retryBtnText, { color: '#ffffff' }]}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

      {/* Active Filter Banner when filtered by Status */}
      {statusFilter !== 'All' ? (
        <View
          style={[
            styles.filterBanner,
            {
              backgroundColor:
                statusFilter === 'In Progress'
                  ? '#eff6ff'
                  : statusFilter === 'Completed'
                    ? '#f0fdf4'
                    : '#f8fafc',
              borderColor:
                statusFilter === 'In Progress'
                  ? '#93c5fd'
                  : statusFilter === 'Completed'
                    ? '#86efac'
                    : '#cbd5e1',
            },
          ]}
        >
          <Ionicons
            name={STATUS_THEMES[statusFilter].icon}
            size={16}
            color={STATUS_THEMES[statusFilter].text}
          />
          <Text style={[styles.filterBannerText, { color: STATUS_THEMES[statusFilter].text }]}>
            {statusFilter === 'In Progress'
              ? `Showing In-Progress Retentions (${countsByStatus['In Progress']})`
              : statusFilter === 'Completed'
                ? `Showing Completed Retentions (${countsByStatus['Completed']})`
                : `Showing Planned Retentions (${countsByStatus['Planned']})`}
          </Text>
          <TouchableOpacity
            style={[styles.filterBannerClear, { backgroundColor: `${STATUS_THEMES[statusFilter].text}18` }]}
            onPress={() => setStatusFilter('All')}
          >
            <Text style={[styles.filterBannerClearText, { color: STATUS_THEMES[statusFilter].text }]}>
              Show All
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 5. Empty State - No actions recorded yet */}
      {!loading && !error && actions.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: outline }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: `${primary}14` }]}>
            <Ionicons name="bulb-outline" size={26} color={primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: onSurface }]}>No retention actions yet</Text>
          <Text style={[styles.emptySubtitle, { color: onSurfaceVariant }]}>
            Bridge analytics with results. Create targeted campaigns for VIP, regular, occasional, and at-risk customer segments.
          </Text>

          <Text style={[styles.templateHeader, { color: onSurface }]}>Quick-start templates:</Text>
          <View style={styles.templateList}>
            {STARTER_TEMPLATES.map((tmpl) => (
              <TouchableOpacity
                key={tmpl.title}
                style={[styles.templateItem, { backgroundColor: `${surface}ee`, borderColor: outline }]}
                activeOpacity={0.75}
                onPress={() => {
                  setReturnToRetentionPopup(true);
                  setShowRetentionPopup(false);
                  openCreateModal(tmpl);
                }}
              >
                <Ionicons
                  name="arrow-forward-circle-outline"
                  size={18}
                  color={SEGMENT_COLORS[tmpl.targetSegment]}
                />
                <Text style={[styles.templateText, { color: onSurface }]}>{tmpl.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.emptyActionBtn, { backgroundColor: primary }]}
            activeOpacity={0.85}
            onPress={() => {
              setReturnToRetentionPopup(true);
              setShowRetentionPopup(false);
              openCreateModal();
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
            <Text style={styles.emptyActionBtnText}>Create First Retention Action</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 6. Filter Empty State */}
      {!loading && !error && actions.length > 0 && filteredActions.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: outline }]}>
          <Ionicons name="funnel-outline" size={24} color={onSurfaceVariant} style={{ marginBottom: 6 }} />
          <Text style={[styles.emptyTitle, { color: onSurface }]}>No matching actions</Text>
          <Text style={[styles.emptySubtitle, { color: onSurfaceVariant }]}>
            No retention actions found under the "{statusFilter}" status filter.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: `${primary}14`, borderColor: primary, borderWidth: 1 }]}
            onPress={() => setStatusFilter('All')}
          >
            <Text style={[styles.retryBtnText, { color: primary }]}>Show All Actions</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 7. Action List */}
      {!loading && !error && filteredActions.length > 0 ? (
        <View>
          {filteredActions.map((action) => {
            const effectiveStatus = resolveActionStatus(action);
            const segColor = SEGMENT_COLORS[action.targetSegment] || '#64748b';
            const priorityTheme = PRIORITY_THEMES[action.priority] || PRIORITY_THEMES.Medium;
            const statusTheme = STATUS_THEMES[effectiveStatus] || STATUS_THEMES.Planned;
            const timelineInfo = getTimelineInfo(action);
            const progress = getProgressMetrics(action);

            const startFormatted = formatDateDisplay(action.startDate);
            const endFormatted = formatDateDisplay(action.endDate || action.dueDate);

            return (
              <TouchableOpacity
                key={action._id}
                style={[styles.actionCard, { backgroundColor: surface, borderColor: outline }]}
                activeOpacity={0.85}
                onPress={() => {
                  setReturnToRetentionPopup(true);
                  setShowRetentionPopup(false);
                  setViewingAction(action);
                }}
              >
                {/* Top Badges */}
                <View style={styles.cardTopRow}>
                  <View style={styles.badgeGroup}>
                    {/* Target Segment */}
                    <View style={[styles.tagBadge, { backgroundColor: `${segColor}18` }]}>
                      <Ionicons name="people" size={12} color={segColor} />
                      <Text style={[styles.tagBadgeText, { color: segColor }]}>
                        {action.targetSegment}
                      </Text>
                    </View>

                    {/* Priority */}
                    <View style={[styles.tagBadge, { backgroundColor: priorityTheme.bg }]}>
                      <Ionicons name={priorityTheme.icon} size={12} color={priorityTheme.text} />
                      <Text style={[styles.tagBadgeText, { color: priorityTheme.text }]}>
                        {action.priority} Priority
                      </Text>
                    </View>
                  </View>

                  {/* Status Toggle Badge */}
                  <TouchableOpacity
                    style={[styles.tagBadge, { backgroundColor: statusTheme.bg }]}
                    activeOpacity={0.7}
                    onPress={() => void handleQuickStatusCycle(action)}
                  >
                    <Ionicons name={statusTheme.icon} size={13} color={statusTheme.text} />
                    <Text style={[styles.tagBadgeText, { color: statusTheme.text }]}>
                      {effectiveStatus}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={[styles.cardTitle, { color: onSurface }]}>{action.title}</Text>

                {/* Description */}
                {action.description ? (
                  <Text
                    style={[styles.cardDescription, { color: onSurfaceVariant }]}
                    numberOfLines={2}
                  >
                    {action.description}
                  </Text>
                ) : null}

                {/* Date range display */}
                {startFormatted || endFormatted ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ionicons name="calendar-outline" size={13} color={onSurfaceVariant} />
                    <Text style={[styles.metaText, { color: onSurfaceVariant }]}>
                      {startFormatted ? `Starts: ${startFormatted}` : ''}
                      {startFormatted && endFormatted ? '  ➔  ' : ''}
                      {endFormatted ? `Due: ${endFormatted}` : ''}
                    </Text>
                  </View>
                ) : null}

                {/* Visual Progress Bar for In Progress, Completed, and Planned */}
                {effectiveStatus === 'In Progress' ? (
                  <View style={[styles.progressBarContainer, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                    <View style={styles.progressBarHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="trending-up" size={14} color="#1d4ed8" />
                        <Text style={[styles.progressBarLabel, { color: '#1d4ed8' }]}>Active Campaign Progress</Text>
                      </View>
                      <Text style={[styles.progressBarPercent, { color: '#1d4ed8' }]}>{progress.percent}%</Text>
                    </View>
                    <View style={[styles.progressBarTrack, { backgroundColor: '#dbeafe' }]}>
                      <View style={[styles.progressBarFill, { width: `${progress.percent}%`, backgroundColor: '#2563eb' }]} />
                    </View>
                    <Text style={[styles.progressBarSub, { color: '#1e40af' }]}>
                      Day {progress.elapsedDays} of {progress.totalDays} elapsed · {progress.remainingDays} days remaining
                    </Text>
                  </View>
                ) : effectiveStatus === 'Completed' ? (
                  <View style={[styles.progressBarContainer, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                    <View style={styles.progressBarHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                        <Text style={[styles.progressBarLabel, { color: '#15803d' }]}>Retention Completed</Text>
                      </View>
                      <Text style={[styles.progressBarPercent, { color: '#15803d' }]}>100%</Text>
                    </View>
                    <View style={[styles.progressBarTrack, { backgroundColor: '#dcfce7' }]}>
                      <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#16a34a' }]} />
                    </View>
                    <Text style={[styles.progressBarSub, { color: '#166534' }]}>
                      Action completed successfully
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.progressBarContainer, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
                    <View style={styles.progressBarHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="calendar-outline" size={14} color="#475569" />
                        <Text style={[styles.progressBarLabel, { color: '#475569' }]}>Scheduled Plan</Text>
                      </View>
                      <Text style={[styles.progressBarPercent, { color: '#475569' }]}>Planned</Text>
                    </View>
                    <View style={[styles.progressBarTrack, { backgroundColor: '#e2e8f0' }]}>
                      <View style={[styles.progressBarFill, { width: '0%', backgroundColor: '#94a3b8' }]} />
                    </View>
                    <Text style={[styles.progressBarSub, { color: '#64748b' }]}>
                      {startFormatted ? `Scheduled to launch on ${startFormatted}` : 'Awaiting start date'}
                    </Text>
                  </View>
                )}

                {/* Meta Row & Action Controls */}
                <View style={[styles.cardMetaRow, { borderTopColor: `${outline}40` }]}>
                  <View style={styles.metaLeft}>
                    <Ionicons name={timelineInfo.icon} size={13} color={timelineInfo.color} />
                    <Text style={[styles.metaText, { color: timelineInfo.color, fontFamily: 'PoppinsMedium' }]}>
                      {timelineInfo.text}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    {/* View Details */}
                    <TouchableOpacity
                      style={[styles.iconActionBtn, { backgroundColor: `${primary}14` }]}
                      onPress={() => {
                        setReturnToRetentionPopup(true);
                        setShowRetentionPopup(false);
                        setViewingAction(action);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="eye-outline" size={15} color={primary} />
                    </TouchableOpacity>

                    {/* Edit */}
                    <TouchableOpacity
                      style={[styles.iconActionBtn, { backgroundColor: `${outline}25` }]}
                      onPress={() => {
                        setReturnToRetentionPopup(true);
                        setShowRetentionPopup(false);
                        openEditModal(action);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil-outline" size={15} color={onSurface} />
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity
                      style={[styles.iconActionBtn, { backgroundColor: '#fee2e2' }]}
                      onPress={() => handleDeleteAction(action)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={15} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 8. CREATE / EDIT MODAL */}
      <Modal
        visible={showFormModal}
        transparent
        animationType="fade"
        onRequestClose={closeFormModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeFormModal}
          />
          <View
            style={[styles.modalCard, { backgroundColor: surface, borderColor: outline }]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.sectionIconWrap, { backgroundColor: `${primary}1f` }]}>
                  <Ionicons
                    name={editingAction ? 'pencil-outline' : 'add-outline'}
                    size={20}
                    color={primary}
                  />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: onSurface }]}>
                    {editingAction ? 'Edit Retention Action' : 'New Retention Action'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
                    {editingAction ? 'Update strategy parameters' : 'Create segment follow-up plan'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: `${outline}30` }]}
                onPress={closeFormModal}
              >
                <Ionicons name="close" size={18} color={onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1 }}
            >
              {/* Title Input */}
              <Text style={[styles.formLabel, { color: onSurface }]}>
                Action Title <Text style={{ color: '#dc2626' }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: surface,
                    borderColor: titleError ? '#dc2626' : outline,
                    color: onSurface,
                  },
                ]}
                placeholder="e.g. VIP Loyalty Discount Campaign"
                placeholderTextColor={onSurfaceVariant}
                value={formTitle}
                onChangeText={(text) => {
                  setFormTitle(text);
                  if (titleError) setTitleError(null);
                }}
                maxLength={200}
              />
              {titleError ? <Text style={styles.fieldErrorText}>{titleError}</Text> : null}

              {/* Target Segment */}
              <Text style={[styles.formLabel, { color: onSurface }]}>Target Customer Segment</Text>
              <View style={styles.chipSelectorRow}>
                {(['VIP / Loyal', 'Regular', 'Occasional', 'At Risk / Lapsed'] as const).map(
                  (seg) => {
                    const active = formSegment === seg;
                    const segColor = SEGMENT_COLORS[seg];
                    return (
                      <TouchableOpacity
                        key={seg}
                        style={[
                          styles.selectChip,
                          {
                            backgroundColor: active ? `${segColor}20` : surface,
                            borderColor: active ? segColor : outline,
                          },
                        ]}
                        activeOpacity={0.75}
                        onPress={() => setFormSegment(seg)}
                      >
                        <Text
                          style={[
                            styles.selectChipText,
                            { color: active ? segColor : onSurfaceVariant },
                          ]}
                        >
                          {seg}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>

              {/* Priority */}
              <Text style={[styles.formLabel, { color: onSurface }]}>Priority</Text>
              <View style={styles.chipSelectorRow}>
                {(['Low', 'Medium', 'High'] as const).map((pr) => {
                  const active = formPriority === pr;
                  const prTheme = PRIORITY_THEMES[pr];
                  return (
                    <TouchableOpacity
                      key={pr}
                      style={[
                        styles.selectChip,
                        {
                          backgroundColor: active ? prTheme.bg : surface,
                          borderColor: active ? prTheme.text : outline,
                        },
                      ]}
                      activeOpacity={0.75}
                      onPress={() => setFormPriority(pr)}
                    >
                      <Text
                        style={[
                          styles.selectChipText,
                          { color: active ? prTheme.text : onSurfaceVariant },
                        ]}
                      >
                        {pr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status Selector with Smart Date configuration */}
              <Text style={[styles.formLabel, { color: onSurface }]}>
                Status <Text style={{ fontSize: 11, color: onSurfaceVariant }}>(Auto-sets suitable dates)</Text>
              </Text>
              <View style={styles.chipSelectorRow}>
                {(['Planned', 'In Progress', 'Completed'] as const).map((st) => {
                  const active = formStatus === st;
                  const stTheme = STATUS_THEMES[st];
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.selectChip,
                        {
                          backgroundColor: active ? stTheme.bg : surface,
                          borderColor: active ? stTheme.text : outline,
                        },
                      ]}
                      activeOpacity={0.75}
                      onPress={() => handleSelectStatus(st)}
                    >
                      <Ionicons
                        name={stTheme.icon}
                        size={12}
                        color={active ? stTheme.text : onSurfaceVariant}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.selectChipText,
                          { color: active ? stTheme.text : onSurfaceVariant },
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status Dynamic Helper Banner */}
              <View
                style={[
                  styles.statusHelperBox,
                  {
                    backgroundColor:
                      formStatus === 'Planned'
                        ? '#f1f5f9'
                        : formStatus === 'In Progress'
                          ? '#dbeafe'
                          : '#dcfce7',
                    borderColor:
                      formStatus === 'Planned'
                        ? '#cbd5e1'
                        : formStatus === 'In Progress'
                          ? '#93c5fd'
                          : '#86efac',
                  },
                ]}
              >
                <Ionicons
                  name={STATUS_THEMES[formStatus].icon}
                  size={16}
                  color={STATUS_THEMES[formStatus].text}
                />
                <Text style={[styles.statusHelperText, { color: STATUS_THEMES[formStatus].text }]}>
                  {formStatus === 'Planned'
                    ? `Planned campaign: Starts on ${formStartDate || 'scheduled date'}. When this date arrives, it automatically transitions to In Progress.`
                    : formStatus === 'In Progress'
                      ? `In Progress campaign: Active until ${formEndDate || 'end date'}. When this end date arrives, it automatically transitions to Completed.`
                      : `Completed campaign: Finished on ${formEndDate || 'today'}.`}
                </Text>
              </View>

              {/* Start Date & End Date Grid */}
              <View style={styles.dateInputsGrid}>
                {/* Start Date Col */}
                <View style={styles.dateInputCol}>
                  <Text style={[styles.formLabel, { color: onSurface }]}>Start Date</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { backgroundColor: surface, borderColor: dateError ? '#dc2626' : outline, color: onSurface },
                    ]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={onSurfaceVariant}
                    value={formStartDate}
                    onChangeText={(t) => {
                      setFormStartDate(t);
                      setDateError(null);
                    }}
                  />
                  <View style={styles.quickDateRow}>
                    <TouchableOpacity
                      style={[styles.quickDateBtn, { borderColor: outline }]}
                      onPress={() => setQuickStartDate(0)}
                    >
                      <Text style={[styles.quickDateText, { color: onSurfaceVariant }]}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickDateBtn, { borderColor: outline }]}
                      onPress={() => setQuickStartDate(1)}
                    >
                      <Text style={[styles.quickDateText, { color: onSurfaceVariant }]}>Tomorrow</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* End Date Col */}
                <View style={styles.dateInputCol}>
                  <Text style={[styles.formLabel, { color: onSurface }]}>End / Due Date</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { backgroundColor: surface, borderColor: dateError ? '#dc2626' : outline, color: onSurface },
                    ]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={onSurfaceVariant}
                    value={formEndDate}
                    onChangeText={(t) => {
                      setFormEndDate(t);
                      setDateError(null);
                    }}
                  />
                  <View style={styles.quickDateRow}>
                    <TouchableOpacity
                      style={[styles.quickDateBtn, { borderColor: outline }]}
                      onPress={() => setQuickEndDate(7)}
                    >
                      <Text style={[styles.quickDateText, { color: onSurfaceVariant }]}>+7D</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickDateBtn, { borderColor: outline }]}
                      onPress={() => setQuickEndDate(14)}
                    >
                      <Text style={[styles.quickDateText, { color: onSurfaceVariant }]}>+14D</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickDateBtn, { borderColor: outline }]}
                      onPress={() => setQuickEndDate(30)}
                    >
                      <Text style={[styles.quickDateText, { color: onSurfaceVariant }]}>+30D</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {dateError ? <Text style={styles.fieldErrorText}>{dateError}</Text> : null}

              {/* Description */}
              <Text style={[styles.formLabel, { color: onSurface }]}>Description / Action Plan</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: surface, borderColor: outline, color: onSurface },
                ]}
                placeholder="Provide strategy details, offer details, or assigned responsibilities…"
                placeholderTextColor={onSurfaceVariant}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={3}
              />

              {/* Action Buttons */}
              <View style={styles.modalFooterRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: `${outline}20` }]}
                  onPress={closeFormModal}
                  disabled={submitting}
                >
                  <Text style={[styles.cancelBtnText, { color: onSurface }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: primary }]}
                  onPress={() => void handleSaveAction()}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                      <Text style={styles.submitBtnText}>
                        {editingAction ? 'Save Changes' : 'Create Action'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 9. VIEW DETAILS MODAL */}
      <Modal
        visible={viewingAction !== null}
        transparent
        animationType="fade"
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDetailsModal}
          />
          {viewingAction ? (
            <View
              style={[styles.modalCard, { backgroundColor: surface, borderColor: outline }]}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View
                    style={[
                      styles.sectionIconWrap,
                      {
                        backgroundColor: `${SEGMENT_COLORS[viewingAction.targetSegment] || primary
                          }1f`,
                      },
                    ]}
                  >
                    <Ionicons
                      name="clipboard-outline"
                      size={20}
                      color={SEGMENT_COLORS[viewingAction.targetSegment] || primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: onSurface }]} numberOfLines={1}>
                      {viewingAction.title}
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
                      Retention Action Details
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: `${outline}30` }]}
                  onPress={closeDetailsModal}
                >
                  <Ionicons name="close" size={18} color={onSurface} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ flexShrink: 1 }}
              >
                <View style={[styles.detailRow, { borderBottomColor: `${outline}30` }]}>
                  <Text style={[styles.detailLabel, { color: onSurfaceVariant }]}>Target Segment</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: SEGMENT_COLORS[viewingAction.targetSegment] || onSurface },
                    ]}
                  >
                    {viewingAction.targetSegment}
                  </Text>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: `${outline}30` }]}>
                  <Text style={[styles.detailLabel, { color: onSurfaceVariant }]}>Priority</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: PRIORITY_THEMES[viewingAction.priority]?.text || onSurface },
                    ]}
                  >
                    {viewingAction.priority}
                  </Text>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: `${outline}30` }]}>
                  <Text style={[styles.detailLabel, { color: onSurfaceVariant }]}>Status</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: STATUS_THEMES[resolveActionStatus(viewingAction)]?.text || onSurface },
                    ]}
                  >
                    {resolveActionStatus(viewingAction)}
                  </Text>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: `${outline}30` }]}>
                  <Text style={[styles.detailLabel, { color: onSurfaceVariant }]}>Start Date</Text>
                  <Text style={[styles.detailValue, { color: onSurface }]}>
                    {formatDateDisplay(viewingAction.startDate) || 'Not specified'}
                  </Text>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: `${outline}30` }]}>
                  <Text style={[styles.detailLabel, { color: onSurfaceVariant }]}>End / Due Date</Text>
                  <Text style={[styles.detailValue, { color: onSurface }]}>
                    {formatDateDisplay(viewingAction.endDate || viewingAction.dueDate) || 'None set'}
                  </Text>
                </View>

                {viewingAction.createdByName ? (
                  <View style={[styles.detailRow, { borderBottomColor: `${outline}30` }]}>
                    <Text style={[styles.detailLabel, { color: onSurfaceVariant }]}>Created By</Text>
                    <Text style={[styles.detailValue, { color: onSurface }]}>
                      {viewingAction.createdByName}
                    </Text>
                  </View>
                ) : null}

                <View style={[styles.detailRow, { borderBottomColor: `${outline}30` }]}>
                  <Text style={[styles.detailLabel, { color: onSurfaceVariant }]}>Created At</Text>
                  <Text style={[styles.detailValue, { color: onSurface }]}>
                    {formatDateDisplay(viewingAction.createdAt)}
                  </Text>
                </View>

                {viewingAction.description ? (
                  <View
                    style={[
                      styles.detailDescBox,
                      { backgroundColor: `${outline}10`, borderColor: `${outline}30` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: onSurfaceVariant, marginBottom: 4 },
                      ]}
                    >
                      Description & Action Plan:
                    </Text>
                    <Text style={[styles.detailDescText, { color: onSurface }]}>
                      {viewingAction.description}
                    </Text>
                  </View>
                ) : null}

                {/* Footer Controls */}
                <View style={styles.modalFooterRow}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { backgroundColor: '#fee2e2' }]}
                    onPress={() => {
                      const toDelete = viewingAction;
                      handleDeleteAction(toDelete);
                    }}
                  >
                    <Text style={[styles.cancelBtnText, { color: '#dc2626' }]}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: primary }]}
                    onPress={() => {
                      const toEdit = viewingAction;
                      setViewingAction(null);
                      setReturnToRetentionPopup(true);
                      openEditModal(toEdit);
                    }}
                  >
                    <Ionicons name="pencil" size={15} color="#ffffff" />
                    <Text style={styles.submitBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

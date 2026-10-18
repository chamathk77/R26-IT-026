export type RetentionActionSegment =
  | 'VIP / Loyal'
  | 'Regular'
  | 'Occasional'
  | 'At Risk / Lapsed';

export type RetentionActionPriority = 'Low' | 'Medium' | 'High';

export type RetentionActionStatus = 'Planned' | 'In Progress' | 'Completed';

export interface RetentionAction {
  _id: string;
  shopId: string;
  branchId: string;
  title: string;
  description?: string;
  targetSegment: RetentionActionSegment;
  priority: RetentionActionPriority;
  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
  status: RetentionActionStatus;
  createdBy?: string | null;
  createdByName?: string;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRetentionActionPayload {
  title: string;
  description?: string;
  targetSegment: RetentionActionSegment;
  priority?: RetentionActionPriority;
  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
  status?: RetentionActionStatus;
}

export interface UpdateRetentionActionPayload {
  title?: string;
  description?: string;
  targetSegment?: RetentionActionSegment;
  priority?: RetentionActionPriority;
  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
  status?: RetentionActionStatus;
}

export interface GetRetentionActionsResponse {
  success: boolean;
  shopId?: string;
  branchId?: string;
  count: number;
  data: RetentionAction[];
  message?: string;
}

export interface SingleRetentionActionResponse {
  success: boolean;
  data: RetentionAction;
  message?: string;
}

export interface DeleteRetentionActionResponse {
  success: boolean;
  message: string;
  data: { id: string };
}

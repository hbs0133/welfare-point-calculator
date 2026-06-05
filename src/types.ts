export type CategoryKey = "club" | "exercise" | "bookEducationOffice";

export type PeriodFilter = "all" | "week" | "month" | "threeMonths";

export type CategoryFilter = CategoryKey | "all";

export type Expense = {
  id: string;
  category: CategoryKey;
  amount: number;
  memo: string;
  date: string;
};

export type ProfileSummary = {
  userId: string;
  email: string;
  displayName: string;
};

export type SplitRecipientInput = ProfileSummary & {
  amount: number;
};

export type ExpenseInput = Omit<Expense, "id"> & {
  split?: {
    recipients: SplitRecipientInput[];
    requesterAmount: number;
  };
};

export type SplitRequestStatus = "pending" | "accepted" | "rejected";

export type ReceivedSplitRequest = {
  recipientId: string;
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  category: CategoryKey;
  totalAmount: number;
  amount: number;
  perPersonAmount: number;
  participantCount: number;
  memo: string;
  date: string;
  createdAt: string;
};

export type SentSplitRecipient = ProfileSummary & {
  recipientRowId: string;
  amount: number;
  status: SplitRequestStatus;
  respondedAt: string | null;
};

export type SentSplitRequest = {
  requestId: string;
  category: CategoryKey;
  totalAmount: number;
  perPersonAmount: number;
  participantCount: number;
  memo: string;
  date: string;
  requesterExpenseId: string | null;
  createdAt: string;
  recipients: SentSplitRecipient[];
};

export type CategorySummary = {
  key: CategoryKey;
  label: string;
  limit: number;
  used: number;
  remaining: number;
  usageRate: number;
  isExceeded: boolean;
};

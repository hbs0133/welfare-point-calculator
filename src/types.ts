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

export type ExpenseInput = Omit<Expense, "id"> & {
  split?: {
    recipients: ProfileSummary[];
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
  perPersonAmount: number;
  participantCount: number;
  memo: string;
  date: string;
  createdAt: string;
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

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

export type CategorySummary = {
  key: CategoryKey;
  label: string;
  limit: number;
  used: number;
  remaining: number;
  usageRate: number;
  isExceeded: boolean;
};

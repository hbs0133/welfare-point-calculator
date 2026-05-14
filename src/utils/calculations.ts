import { ANNUAL_LIMIT, CATEGORY_KEYS, CATEGORY_LABELS, CATEGORY_LIMIT } from "../constants";
import type { CategoryFilter, CategoryKey, CategorySummary, Expense, PeriodFilter } from "../types";

export const getCategoryUsedMap = (expenses: Expense[]) => {
  const usedMap = CATEGORY_KEYS.reduce<Record<CategoryKey, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<CategoryKey, number>);

  for (const expense of expenses) {
    usedMap[expense.category] += expense.amount;
  }

  return usedMap;
};

export const getTotalUsed = (expenses: Expense[]) =>
  expenses.reduce((sum, expense) => sum + expense.amount, 0);

export const getCategorySummaries = (expenses: Expense[]): CategorySummary[] => {
  const usedMap = getCategoryUsedMap(expenses);

  return CATEGORY_KEYS.map((key) => {
    const used = usedMap[key];
    const remaining = CATEGORY_LIMIT - used;

    return {
      key,
      label: CATEGORY_LABELS[key],
      limit: CATEGORY_LIMIT,
      used,
      remaining,
      usageRate: Math.min((used / CATEGORY_LIMIT) * 100, 100),
      isExceeded: used > CATEGORY_LIMIT,
    };
  });
};

export const getPointSummary = (expenses: Expense[]) => {
  const totalUsed = getTotalUsed(expenses);
  const totalRemaining = ANNUAL_LIMIT - totalUsed;
  const categorySummaries = getCategorySummaries(expenses);

  return {
    totalUsed,
    totalRemaining,
    totalUsageRate: Math.min((totalUsed / ANNUAL_LIMIT) * 100, 100),
    isTotalExceeded: totalUsed > ANNUAL_LIMIT,
    categorySummaries,
    exceededCategories: categorySummaries.filter((summary) => summary.isExceeded),
  };
};

export const sortExpensesByLatest = (expenses: Expense[]) =>
  [...expenses].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    return dateDiff || b.id.localeCompare(a.id);
  });

const getDateOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseExpenseDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getPeriodStartDate = (period: PeriodFilter, today = new Date()) => {
  const currentDate = getDateOnly(today);

  if (period === "week") {
    const weekStartDate = new Date(currentDate);
    weekStartDate.setDate(currentDate.getDate() - 6);
    return weekStartDate;
  }

  if (period === "month") {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }

  if (period === "threeMonths") {
    const threeMonthsAgo = new Date(currentDate);
    threeMonthsAgo.setMonth(currentDate.getMonth() - 3);
    return threeMonthsAgo;
  }

  return null;
};

export const filterExpenses = (
  expenses: Expense[],
  period: PeriodFilter,
  category: CategoryFilter,
) => {
  const periodStartDate = getPeriodStartDate(period);
  const today = getDateOnly(new Date());

  return expenses.filter((expense) => {
    const expenseDate = parseExpenseDate(expense.date);
    const isInPeriod =
      !periodStartDate || (expenseDate >= periodStartDate && expenseDate <= today);
    const isInCategory = category === "all" || expense.category === category;

    return isInPeriod && isInCategory;
  });
};

export const getProjectedWarnings = (
  expenses: Expense[],
  category: CategoryKey,
  amount: number,
) => {
  const totalAfterAdd = getTotalUsed(expenses) + amount;
  const categoryUsedAfterAdd = getCategoryUsedMap(expenses)[category] + amount;

  return {
    willExceedTotal: totalAfterAdd > ANNUAL_LIMIT,
    willExceedCategory: categoryUsedAfterAdd > CATEGORY_LIMIT,
  };
};

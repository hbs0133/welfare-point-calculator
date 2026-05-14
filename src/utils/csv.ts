import { CATEGORY_LABELS } from "../constants";
import type { CategoryKey, Expense } from "../types";
import { createExpenseId } from "./expenseId";
import { parseAmountInput } from "./format";

const CSV_HEADERS = ["id", "date", "category", "categoryLabel", "amount", "memo"];

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as CategoryKey[];

const escapeCsvValue = (value: string | number) => {
  const normalizedValue = String(value).replace(/\r?\n/g, " ");
  return `"${normalizedValue.replace(/"/g, '""')}"`;
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let currentValue = "";
  let isInQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && isInQuotes && nextChar === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      isInQuotes = !isInQuotes;
      continue;
    }

    if (char === "," && !isInQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  values.push(currentValue);
  return values;
};

const getCategoryFromCsv = (categoryValue: string, labelValue: string) => {
  const trimmedCategory = categoryValue.trim() as CategoryKey;
  if (CATEGORY_KEYS.includes(trimmedCategory)) {
    return trimmedCategory;
  }

  const trimmedLabel = labelValue.trim();
  return CATEGORY_KEYS.find((key) => CATEGORY_LABELS[key] === trimmedLabel) ?? null;
};

const isValidDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

export const createExpensesCsv = (expenses: Expense[]) => {
  const rows = expenses.map((expense) =>
    [
      expense.id,
      expense.date,
      expense.category,
      CATEGORY_LABELS[expense.category],
      expense.amount,
      expense.memo,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [CSV_HEADERS.join(","), ...rows].join("\r\n");
};

export const parseExpensesCsv = (csvText: string) => {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("CSV에 사용 내역이 없습니다.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const getIndex = (name: string) => headers.indexOf(name);
  const idIndex = getIndex("id");
  const dateIndex = getIndex("date");
  const categoryIndex = getIndex("category");
  const categoryLabelIndex = getIndex("categoryLabel");
  const amountIndex = getIndex("amount");
  const memoIndex = getIndex("memo");

  if (dateIndex < 0 || amountIndex < 0 || (categoryIndex < 0 && categoryLabelIndex < 0)) {
    throw new Error("CSV 형식이 올바르지 않습니다.");
  }

  const expenses: Expense[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const date = values[dateIndex]?.trim() ?? "";
    const category = getCategoryFromCsv(
      categoryIndex >= 0 ? values[categoryIndex] ?? "" : "",
      categoryLabelIndex >= 0 ? values[categoryLabelIndex] ?? "" : "",
    );
    const amount = parseAmountInput(values[amountIndex] ?? "");

    if (!isValidDate(date) || !category || amount <= 0) {
      continue;
    }

    expenses.push({
      id: idIndex >= 0 && values[idIndex]?.trim() ? values[idIndex].trim() : createExpenseId(),
      date,
      category,
      amount,
      memo: memoIndex >= 0 ? values[memoIndex]?.trim() ?? "" : "",
    });
  }

  if (expenses.length === 0) {
    throw new Error("불러올 수 있는 사용 내역이 없습니다.");
  }

  return expenses;
};

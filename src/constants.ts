import type { CategoryKey } from "./types";

export const ANNUAL_LIMIT = 1_200_000;
export const CATEGORY_LIMIT = 600_000;
export const STORAGE_KEY = "welfare-point-calculator-expenses";

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  club: "동호회",
  exercise: "운동",
  bookEducationOffice: "도서대여/교육/사무용품",
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as CategoryKey[];

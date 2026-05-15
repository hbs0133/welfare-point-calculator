import { createClient } from "@supabase/supabase-js";
import type { CategoryKey, Expense } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
);

export const EXPENSE_SELECT_COLUMNS =
  "id,user_id,category,amount,memo,date,created_at,updated_at";

export type ExpenseRow = {
  id: string;
  user_id: string;
  category: CategoryKey;
  amount: number;
  memo: string | null;
  date: string;
  created_at: string;
  updated_at: string;
};

export const mapExpenseRow = (row: ExpenseRow): Expense => ({
  id: row.id,
  category: row.category,
  amount: row.amount,
  memo: row.memo ?? "",
  date: row.date,
});

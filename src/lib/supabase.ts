import { createClient } from "@supabase/supabase-js";
import type { CategoryKey, Expense, ProfileSummary, SplitRequestStatus } from "../types";
import { getEmailLocalPart } from "../utils/companyEmail";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
);

export const EXPENSE_SELECT_COLUMNS =
  "id,user_id,category,amount,memo,date,created_at,updated_at";

export const PROFILE_SELECT_COLUMNS = "user_id,email,display_name,created_at,updated_at";

export const SPLIT_REQUEST_SELECT_COLUMNS =
  "id,requester_id,requester_expense_id,category,total_amount,per_person_amount,participant_count,memo,date,created_at,updated_at";

export const SPLIT_REQUEST_RECIPIENT_SELECT_COLUMNS =
  "id,request_id,recipient_id,amount,status,accepted_expense_id,created_at,responded_at";

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

export type ProfileRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type SplitRequestRow = {
  id: string;
  requester_id: string;
  requester_expense_id: string | null;
  category: CategoryKey;
  total_amount: number;
  per_person_amount: number;
  participant_count: number;
  memo: string | null;
  date: string;
  created_at: string;
  updated_at: string;
};

export type SplitRequestRecipientRow = {
  id: string;
  request_id: string;
  recipient_id: string;
  amount: number;
  status: SplitRequestStatus;
  accepted_expense_id: string | null;
  created_at: string;
  responded_at: string | null;
};

export const mapExpenseRow = (row: ExpenseRow): Expense => ({
  id: row.id,
  category: row.category,
  amount: row.amount,
  memo: row.memo ?? "",
  date: row.date,
});

export const mapProfileRow = (row: ProfileRow): ProfileSummary => ({
  userId: row.user_id,
  email: row.email,
  displayName: row.display_name?.trim() || getEmailLocalPart(row.email),
});

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { CategoryCard } from "./components/CategoryCard";
import { CategoryDetail } from "./components/CategoryDetail";
import { ExpenseForm } from "./components/ExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { SummaryCard } from "./components/SummaryCard";
import { STORAGE_KEY } from "./constants";
import {
  EXPENSE_SELECT_COLUMNS,
  isSupabaseConfigured,
  mapExpenseRow,
  supabase,
} from "./lib/supabase";
import type { CategoryKey, Expense } from "./types";
import { getPointSummary } from "./utils/calculations";
import asoosoftLogo from "./assets/asoosoft-logo.svg";

const loadLocalExpenses = (): Expense[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Expense[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 이전 로컬 데이터가 깨져 있어도 로그인 화면은 정상 진입할 수 있게 둔다.
    return [];
  }
};

const getSyncErrorMessage = (fallback: string, error: unknown) =>
  error instanceof Error ? error.message : fallback;

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isExpensesLoading, setIsExpensesLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncErrorMessage, setSyncErrorMessage] = useState("");
  const [localBackupCount, setLocalBackupCount] = useState(() => loadLocalExpenses().length);

  const userId = session?.user.id ?? null;
  const userEmail = session?.user.email ?? "";

  const pointSummary = useMemo(() => getPointSummary(expenses), [expenses]);
  const selectedCategorySummary = useMemo(
    () =>
      pointSummary.categorySummaries.find((summary) => summary.key === selectedCategory) ?? null,
    [pointSummary.categorySummaries, selectedCategory],
  );

  const fetchExpenses = useCallback(async (currentUserId: string) => {
    setIsExpensesLoading(true);
    setSyncErrorMessage("");

    const { data, error } = await supabase
      .from("expenses")
      .select(EXPENSE_SELECT_COLUMNS)
      .eq("user_id", currentUserId);

    setIsExpensesLoading(false);

    if (error) {
      throw error;
    }

    setExpenses((data ?? []).map(mapExpenseRow));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        setExpenses([]);
        setSelectedCategory(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    fetchExpenses(userId).catch((error) => {
      setIsExpensesLoading(false);
      setSyncErrorMessage(getSyncErrorMessage("사용 내역을 불러오지 못했습니다.", error));
    });
  }, [fetchExpenses, userId]);

  const addExpense = async (expense: Omit<Expense, "id">) => {
    if (!userId) {
      setSyncErrorMessage("로그인이 필요합니다.");
      return false;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        category: expense.category,
        amount: expense.amount,
        memo: expense.memo,
        date: expense.date,
      })
      .select(EXPENSE_SELECT_COLUMNS)
      .single();

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("사용 내역을 저장하지 못했습니다.", error));
      return false;
    }

    setExpenses((currentExpenses) => [...currentExpenses, mapExpenseRow(data)]);
    setSyncErrorMessage("");
    setSyncMessage("사용 내역을 저장했습니다.");
    return true;
  };

  const deleteExpense = async (id: string) => {
    if (!userId) {
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("사용 내역을 삭제하지 못했습니다.", error));
      return;
    }

    setExpenses((currentExpenses) => currentExpenses.filter((expense) => expense.id !== id));
    setSyncErrorMessage("");
    setSyncMessage("사용 내역을 삭제했습니다.");
  };

  const updateExpense = async (updatedExpense: Expense) => {
    if (!userId) {
      setSyncErrorMessage("로그인이 필요합니다.");
      return false;
    }

    const { data, error } = await supabase
      .from("expenses")
      .update({
        category: updatedExpense.category,
        amount: updatedExpense.amount,
        memo: updatedExpense.memo,
        date: updatedExpense.date,
      })
      .eq("id", updatedExpense.id)
      .eq("user_id", userId)
      .select(EXPENSE_SELECT_COLUMNS)
      .single();

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("사용 내역을 수정하지 못했습니다.", error));
      return false;
    }

    setExpenses((currentExpenses) =>
      currentExpenses.map((expense) =>
        expense.id === updatedExpense.id ? mapExpenseRow(data) : expense,
      ),
    );
    setSyncErrorMessage("");
    setSyncMessage("사용 내역을 수정했습니다.");
    return true;
  };

  const replaceExpenses = async (nextExpenses: Expense[]) => {
    if (!userId) {
      setSyncErrorMessage("로그인이 필요합니다.");
      return false;
    }

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("기존 사용 내역을 정리하지 못했습니다.", deleteError));
      return false;
    }

    if (nextExpenses.length === 0) {
      setExpenses([]);
      setSyncErrorMessage("");
      setSyncMessage("사용 내역을 초기화했습니다.");
      return true;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert(
        nextExpenses.map((expense) => ({
          user_id: userId,
          category: expense.category,
          amount: expense.amount,
          memo: expense.memo,
          date: expense.date,
        })),
      )
      .select(EXPENSE_SELECT_COLUMNS);

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("CSV 데이터를 불러오지 못했습니다.", error));
      return false;
    }

    setExpenses((data ?? []).map(mapExpenseRow));
    setSyncErrorMessage("");
    setSyncMessage(`${nextExpenses.length}건을 불러왔습니다.`);
    return true;
  };

  const importExpenses = (importedExpenses: Expense[]) => replaceExpenses(importedExpenses);

  const resetExpenses = async () => {
    if (!window.confirm("모든 사용 내역을 초기화할까요?")) {
      return;
    }

    await replaceExpenses([]);
  };

  const migrateLocalExpenses = async () => {
    if (!userId) {
      return;
    }

    const localExpenses = loadLocalExpenses();
    if (localExpenses.length === 0) {
      setLocalBackupCount(0);
      return;
    }

    const shouldMigrate = window.confirm(
      `이 브라우저에 남아 있는 로컬 데이터 ${localExpenses.length}건을 현재 계정으로 가져올까요?`,
    );

    if (!shouldMigrate) {
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert(
        localExpenses.map((expense) => ({
          user_id: userId,
          category: expense.category,
          amount: expense.amount,
          memo: expense.memo,
          date: expense.date,
        })),
      )
      .select(EXPENSE_SELECT_COLUMNS);

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("로컬 데이터를 가져오지 못했습니다.", error));
      return;
    }

    setExpenses((currentExpenses) => [
      ...currentExpenses,
      ...(data ?? []).map(mapExpenseRow),
    ]);
    localStorage.removeItem(STORAGE_KEY);
    setLocalBackupCount(0);
    setSyncErrorMessage("");
    setSyncMessage(`${localExpenses.length}건의 로컬 데이터를 가져왔습니다.`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const renderHeaderActions = () => {
    if (!session) {
      return <div className="header-chip">로그인 필요</div>;
    }

    return (
      <div className="header-actions">
        <span className="header-chip">{userEmail}</span>
        <button className="secondary-button" type="button" onClick={signOut}>
          로그아웃
        </button>
      </div>
    );
  };

  if (isAuthLoading) {
    return (
      <main className="app-shell">
        <header className="app-header">
          <div className="brand-heading">
            <img className="brand-logo" src={asoosoftLogo} alt="AsooSoft" />
            <h1 className="sr-only">AsooSoft Welfare Points</h1>
            <p className="header-description">계정 정보를 확인하고 있습니다.</p>
          </div>
        </header>
        <div className="empty-state">잠시만 기다려주세요.</div>
      </main>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="app-shell">
        <header className="app-header">
          <div className="brand-heading">
            <img className="brand-logo" src={asoosoftLogo} alt="AsooSoft" />
            <h1 className="sr-only">AsooSoft Welfare Points</h1>
            <p className="header-description">Supabase 연결 정보가 필요합니다.</p>
          </div>
        </header>
        <div className="empty-state">
          VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정한 뒤 다시 실행해주세요.
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-heading">
          <img className="brand-logo" src={asoosoftLogo} alt="AsooSoft" />
          <h1 className="sr-only">AsooSoft Welfare Points</h1>
          <p className="header-description">계정별로 복지 포인트 사용 내역을 안전하게 관리하세요.</p>
        </div>
        {renderHeaderActions()}
      </header>

      {!session ? (
        <AuthPanel />
      ) : (
        <>
          {(syncMessage || syncErrorMessage || localBackupCount > 0) && (
            <section className="notice-panel" aria-live="polite">
              {syncMessage && <p className="success-text">{syncMessage}</p>}
              {syncErrorMessage && <p className="warning-text">{syncErrorMessage}</p>}
              {localBackupCount > 0 && (
                <button className="secondary-button" type="button" onClick={migrateLocalExpenses}>
                  기존 로컬 데이터 {localBackupCount}건 가져오기
                </button>
              )}
            </section>
          )}

          <div className="dashboard-layout">
            <aside className="entry-column">
              <ExpenseForm expenses={expenses} onAddExpense={addExpense} />
            </aside>

            <section className="overview-column" aria-label="복지 포인트 현황">
              <SummaryCard
                totalUsed={pointSummary.totalUsed}
                totalRemaining={pointSummary.totalRemaining}
                totalUsageRate={pointSummary.totalUsageRate}
                isTotalExceeded={pointSummary.isTotalExceeded}
              />

              <section className="category-grid" aria-label="항목별 포인트 현황">
                {pointSummary.categorySummaries.map((summary) => (
                  <CategoryCard
                    key={summary.key}
                    summary={summary}
                    isSelected={selectedCategory === summary.key}
                    onSelect={() =>
                      setSelectedCategory((currentCategory) =>
                        currentCategory === summary.key ? null : summary.key,
                      )
                    }
                  />
                ))}
              </section>
            </section>
          </div>

          <section className="history-section">
            {isExpensesLoading ? (
              <div className="empty-state">사용 내역을 불러오는 중입니다.</div>
            ) : (
              <ExpenseList
                expenses={expenses}
                onDeleteExpense={deleteExpense}
                onImportExpenses={importExpenses}
                onReset={resetExpenses}
                onUpdateExpense={updateExpense}
              />
            )}
          </section>

          {selectedCategorySummary && (
            <CategoryDetail
              summary={selectedCategorySummary}
              expenses={expenses}
              onClose={() => setSelectedCategory(null)}
            />
          )}
        </>
      )}
    </main>
  );
}

export default App;

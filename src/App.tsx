import { useEffect, useMemo, useState } from "react";
import { CategoryCard } from "./components/CategoryCard";
import { CategoryDetail } from "./components/CategoryDetail";
import { ExpenseForm } from "./components/ExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { SummaryCard } from "./components/SummaryCard";
import { STORAGE_KEY } from "./constants";
import type { CategoryKey, Expense } from "./types";
import { getPointSummary } from "./utils/calculations";
import { createExpenseId } from "./utils/expenseId";
import asoosoftLogo from "./assets/asoosoft-logo.svg";

const loadExpenses = (): Expense[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Expense[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 저장된 값이 깨져도 앱은 빈 목록으로 정상 진입하도록 둔다.
    return [];
  }
};

function App() {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);

  const pointSummary = useMemo(() => getPointSummary(expenses), [expenses]);
  const selectedCategorySummary = useMemo(
    () =>
      pointSummary.categorySummaries.find((summary) => summary.key === selectedCategory) ?? null,
    [pointSummary.categorySummaries, selectedCategory],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const addExpense = (expense: Omit<Expense, "id">) => {
    setExpenses((currentExpenses) => [
      ...currentExpenses,
      {
        ...expense,
        id: createExpenseId(),
      },
    ]);
  };

  const deleteExpense = (id: string) => {
    setExpenses((currentExpenses) => currentExpenses.filter((expense) => expense.id !== id));
  };

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses((currentExpenses) =>
      currentExpenses.map((expense) =>
        expense.id === updatedExpense.id ? updatedExpense : expense,
      ),
    );
  };

  const importExpenses = (importedExpenses: Expense[]) => {
    setExpenses(importedExpenses);
  };

  const resetExpenses = () => {
    if (window.confirm("모든 사용 내역을 초기화할까요?")) {
      setExpenses([]);
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-heading">
          <img className="brand-logo" src={asoosoftLogo} alt="AsooSoft" />
          <h1 className="sr-only">복지 포인트 현황</h1>
          <p className="header-description">사내 복지 포인트 사용 현황을 한눈에 확인하세요.</p>
        </div>
        <div className="header-chip">2026 복지 예산</div>
      </header>

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
        <ExpenseList
          expenses={expenses}
          onDeleteExpense={deleteExpense}
          onImportExpenses={importExpenses}
          onReset={resetExpenses}
          onUpdateExpense={updateExpense}
        />
      </section>

      {selectedCategorySummary && (
        <CategoryDetail
          summary={selectedCategorySummary}
          expenses={expenses}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </main>
  );
}

export default App;

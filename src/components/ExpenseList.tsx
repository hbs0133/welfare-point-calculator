import { ChangeEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_LABELS } from "../constants";
import type { CategoryFilter, Expense, PeriodFilter } from "../types";
import { filterExpenses, getTotalUsed, sortExpensesByLatest } from "../utils/calculations";
import { createExpensesCsv, parseExpensesCsv } from "../utils/csv";
import { formatWon, getTodayISO } from "../utils/format";
import { ExpenseForm } from "./ExpenseForm";

type ExpenseListProps = {
  expenses: Expense[];
  onDeleteExpense: (id: string) => boolean | void | Promise<boolean | void>;
  onImportExpenses: (expenses: Expense[]) => boolean | void | Promise<boolean | void>;
  onReset: () => boolean | void | Promise<boolean | void>;
  onUpdateExpense: (expense: Expense) => boolean | void | Promise<boolean | void>;
};

const PERIOD_FILTERS: { key: PeriodFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "week", label: "최근 1주" },
  { key: "month", label: "이번 달" },
  { key: "threeMonths", label: "최근 3개월" },
];

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "전체" },
  ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    key: key as CategoryFilter,
    label,
  })),
];

export function ExpenseList({
  expenses,
  onDeleteExpense,
  onImportExpenses,
  onReset,
  onUpdateExpense,
}: ExpenseListProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredExpenses = useMemo(
    () => filterExpenses(expenses, periodFilter, categoryFilter),
    [categoryFilter, expenses, periodFilter],
  );

  const sortedExpenses = useMemo(() => sortExpensesByLatest(filteredExpenses), [filteredExpenses]);
  const filteredTotalUsed = useMemo(() => getTotalUsed(filteredExpenses), [filteredExpenses]);

  const closeDeleteDialog = () => {
    if (!isDeleting) {
      setDeleteTarget(null);
    }
  };

  const closeResetDialog = () => {
    if (!isResetting) {
      setIsResetDialogOpen(false);
    }
  };

  useLayoutEffect(() => {
    if (!deleteTarget && !editTarget && !isResetDialogOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting && !isResetting) {
        setDeleteTarget(null);
        setEditTarget(null);
        setIsResetDialogOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteTarget, editTarget, isDeleting, isResetDialogOpen, isResetting]);

  const startEdit = (expense: Expense) => {
    setEditTarget(expense);
  };

  const cancelEdit = () => {
    setEditTarget(null);
  };

  const confirmDelete = (expense: Expense) => {
    setDeleteTarget(expense);
  };

  const deleteExpense = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      const wasDeleted = await onDeleteExpense(deleteTarget.id);

      if (wasDeleted === false) {
        return;
      }

      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetExpenses = async () => {
    setIsResetting(true);
    try {
      const wasReset = await onReset();

      if (wasReset === false) {
        return;
      }

      setIsResetDialogOpen(false);
      cancelEdit();
    } finally {
      setIsResetting(false);
    }
  };

  const downloadCsv = () => {
    const csv = createExpensesCsv(sortExpensesByLatest(expenses));
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `asoosoft-welfare-points-${getTodayISO()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const requestCsvImport = () => {
    fileInputRef.current?.click();
  };

  const importCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const importedExpenses = parseExpensesCsv(String(reader.result ?? ""));
        const shouldImport =
          expenses.length === 0 ||
          window.confirm("현재 사용 내역을 CSV 파일 내용으로 교체할까요?");

        if (!shouldImport) {
          return;
        }

        const wasImported = await onImportExpenses(importedExpenses);
        if (wasImported === false) {
          return;
        }

        cancelEdit();
        window.alert(`${importedExpenses.length}건을 불러왔습니다.`);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "CSV를 불러오지 못했습니다.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <section className="tool-panel">
      <div className="section-title">
        <div>
          <h2>사용 내역</h2>
          <p className="section-subtitle">
            {sortedExpenses.length}건 · {formatWon(filteredTotalUsed)}
          </p>
        </div>
        <div className="list-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={downloadCsv}
            disabled={expenses.length === 0}
          >
            CSV 내려받기
          </button>
          <button className="secondary-button" type="button" onClick={requestCsvImport}>
            CSV 불러오기
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setIsResetDialogOpen(true)}
            disabled={expenses.length === 0}
          >
            전체 초기화
          </button>
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={importCsv}
          />
        </div>
      </div>

      <div className="filter-panel" aria-label="사용 내역 필터">
        <div className="filter-group">
          <span>기간</span>
          <div className="filter-buttons">
            {PERIOD_FILTERS.map((filter) => (
              <button
                key={filter.key}
                className={`filter-button ${periodFilter === filter.key ? "is-active" : ""}`}
                type="button"
                onClick={() => setPeriodFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span>항목</span>
          <div className="filter-buttons">
            {CATEGORY_FILTERS.map((filter) => (
              <button
                key={filter.key}
                className={`filter-button ${categoryFilter === filter.key ? "is-active" : ""}`}
                type="button"
                onClick={() => setCategoryFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sortedExpenses.length === 0 ? (
        <div className="empty-state">
          {expenses.length === 0 ? "아직 등록된 사용 내역이 없습니다." : "조건에 맞는 내역이 없습니다."}
        </div>
      ) : (
        <div className="expense-table-wrap">
          <table className="expense-table">
            <colgroup>
              <col className="date-col" />
              <col className="category-col" />
              <col className="amount-col" />
              <col className="memo-col" />
              <col className="action-col" />
            </colgroup>
            <thead>
              <tr>
                <th>날짜</th>
                <th>항목</th>
                <th>금액</th>
                <th>메모</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>
                    <span className={`category-pill ${expense.category}`}>
                      {CATEGORY_LABELS[expense.category]}
                    </span>
                  </td>
                  <td className="amount-cell">{formatWon(expense.amount)}</td>
                  <td>{expense.memo || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="mini-button"
                        type="button"
                        onClick={() => startEdit(expense)}
                      >
                        수정
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => confirmDelete(expense)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sortedExpenses.length > 0 && (
        <div className="expense-card-list" aria-label="모바일 사용 내역">
          {sortedExpenses.map((expense) => (
            <article className="expense-mobile-card" key={expense.id}>
              <div className="expense-mobile-card__top">
                <div>
                  <span>{expense.date}</span>
                  <strong>{formatWon(expense.amount)}</strong>
                </div>
                <span className={`category-pill ${expense.category}`}>
                  {CATEGORY_LABELS[expense.category]}
                </span>
              </div>
              <p>{expense.memo || "-"}</p>
              <div className="row-actions">
                <button
                  className="mini-button"
                  type="button"
                  onClick={() => startEdit(expense)}
                >
                  수정
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => confirmDelete(expense)}
                >
                  삭제
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editTarget && (
        <div
          className="modal-backdrop add-expense-backdrop"
          role="presentation"
          onMouseDown={cancelEdit}
        >
          <div
            className="expense-form-modal"
            role="dialog"
            aria-label="사용 내역 수정"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <ExpenseForm
              expenses={expenses}
              initialExpense={editTarget}
              isModal
              mode="edit"
              onClose={cancelEdit}
              onSaved={cancelEdit}
              onUpdateExpense={onUpdateExpense}
            />
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeDeleteDialog}>
          <section
            className="confirm-dialog"
            role="dialog"
            aria-label="사용 내역 삭제 확인"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="confirm-dialog__header">
              <h2>사용 내역을 삭제할까요?</h2>
              <p>삭제한 내역은 다시 복구할 수 없습니다.</p>
            </div>

            <div className="confirm-dialog__summary">
              <div>
                <span>날짜</span>
                <strong>{deleteTarget.date}</strong>
              </div>
              <div>
                <span>항목</span>
                <strong>{CATEGORY_LABELS[deleteTarget.category]}</strong>
              </div>
              <div>
                <span>금액</span>
                <strong>{formatWon(deleteTarget.amount)}</strong>
              </div>
              <div>
                <span>메모</span>
                <strong>{deleteTarget.memo || "-"}</strong>
              </div>
            </div>

            <div className="confirm-dialog__actions">
              <button
                className="secondary-button"
                type="button"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                className="ghost-button confirm-dialog__delete"
                type="button"
                onClick={deleteExpense}
                disabled={isDeleting}
              >
                {isDeleting ? "삭제 중" : "삭제"}
              </button>
            </div>
          </section>
        </div>
      )}
      {isResetDialogOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeResetDialog}>
          <section
            className="confirm-dialog"
            role="dialog"
            aria-label="전체 사용 내역 초기화 확인"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="confirm-dialog__header">
              <h2>전체 사용 내역을 초기화할까요?</h2>
              <p>현재 계정의 모든 사용 내역이 삭제되며 다시 복구할 수 없습니다.</p>
            </div>

            <div className="confirm-dialog__summary">
              <div>
                <span>삭제 대상</span>
                <strong>{expenses.length}건</strong>
              </div>
              <div>
                <span>전체 사용 금액</span>
                <strong>{formatWon(getTotalUsed(expenses))}</strong>
              </div>
            </div>

            <div className="confirm-dialog__actions">
              <button
                className="secondary-button"
                type="button"
                onClick={closeResetDialog}
                disabled={isResetting}
              >
                취소
              </button>
              <button
                className="ghost-button confirm-dialog__delete"
                type="button"
                onClick={resetExpenses}
                disabled={isResetting}
              >
                {isResetting ? "초기화 중" : "전체 초기화"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

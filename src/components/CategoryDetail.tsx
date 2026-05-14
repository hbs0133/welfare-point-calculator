import { useLayoutEffect } from "react";
import { CATEGORY_LABELS } from "../constants";
import type { CategorySummary, Expense } from "../types";
import { sortExpensesByLatest } from "../utils/calculations";
import { formatWon } from "../utils/format";

type CategoryDetailProps = {
  summary: CategorySummary;
  expenses: Expense[];
  onClose: () => void;
};

export function CategoryDetail({ summary, expenses, onClose }: CategoryDetailProps) {
  const categoryExpenses = sortExpensesByLatest(
    expenses.filter((expense) => expense.category === summary.key),
  );

  useLayoutEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
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
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`category-detail ${summary.isExceeded ? "is-danger" : ""}`}
        role="dialog"
        aria-label={`${summary.label} 상세`}
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="section-title">
          <div>
            <h2>{summary.label} 상세</h2>
            <p className="section-subtitle">
              {categoryExpenses.length}건 · {formatWon(summary.used)}
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="detail-summary-grid">
          <div>
            <span>사용 금액</span>
            <strong>{formatWon(summary.used)}</strong>
          </div>
          <div>
            <span>잔여 한도</span>
          <strong className={summary.remaining < 0 ? "negative" : ""}>
            {formatWon(summary.remaining)}
          </strong>
        </div>
      </div>

        {categoryExpenses.length === 0 ? (
          <div className="empty-state">{CATEGORY_LABELS[summary.key]} 사용 내역이 없습니다.</div>
        ) : (
          <div className="detail-list">
            {categoryExpenses.map((expense) => (
              <div className="detail-item" key={expense.id}>
                <div>
                  <span>{expense.date}</span>
                  <strong>{expense.memo || CATEGORY_LABELS[expense.category]}</strong>
                </div>
                <strong>{formatWon(expense.amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

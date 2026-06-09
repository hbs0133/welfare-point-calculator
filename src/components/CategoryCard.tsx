import type { KeyboardEvent } from "react";
import type { CategorySummary } from "../types";
import { getUsageStatus } from "../utils/calculations";
import { formatWon } from "../utils/format";

type CategoryCardProps = {
  summary: CategorySummary;
  isSelected: boolean;
  onSelect: () => void;
};

export function CategoryCard({ summary, isSelected, onSelect }: CategoryCardProps) {
  const status = getUsageStatus(summary.usageRate);
  const displayLabel =
    summary.key === "bookEducationOffice" ? "도서대여/교육 사무용품" : summary.label;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <article
      className={`category-card category-card--${summary.key} ${
        summary.isExceeded ? "is-danger" : ""
      } ${
        isSelected ? "is-selected" : ""
      }`}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="category-card__header">
        <div>
          <h2>{displayLabel}</h2>
          <span className={`status-pill ${status.tone}`}>
            {status.label}
          </span>
        </div>
        <strong>{Math.round(summary.usageRate)}%</strong>
      </div>

      <div className="progress-track">
        <div
          className={`progress-fill ${summary.isExceeded ? "danger" : "category"}`}
          style={{ width: `${summary.usageRate}%` }}
        />
      </div>

      <dl className="category-card__stats">
        <div>
          <dt>사용</dt>
          <dd>{formatWon(summary.used)}</dd>
        </div>
        <div>
          <dt>잔여</dt>
          <dd className={summary.remaining < 0 ? "negative" : ""}>
            {formatWon(summary.remaining)}
          </dd>
        </div>
        <div>
          <dt>한도</dt>
          <dd>{formatWon(summary.limit)}</dd>
        </div>
      </dl>

      {summary.isExceeded && <p className="warning-text">항목 한도를 초과했습니다.</p>}
    </article>
  );
}

import { ANNUAL_LIMIT } from "../constants";
import { formatWon } from "../utils/format";

type SummaryCardProps = {
  totalUsed: number;
  totalRemaining: number;
  totalUsageRate: number;
  isTotalExceeded: boolean;
};

export function SummaryCard({
  totalUsed,
  totalRemaining,
  totalUsageRate,
  isTotalExceeded,
}: SummaryCardProps) {
  const usageTone =
    isTotalExceeded || totalUsageRate >= 90
      ? "danger"
      : totalUsageRate >= 70
        ? "warning"
        : "theme";

  return (
    <section className={`summary-card ${isTotalExceeded ? "is-danger" : ""}`}>
      <div className="summary-card__headline">
        <div className="summary-card__topline">
          <p className="eyebrow">전체 잔여 포인트</p>
          <span className={`status-pill ${isTotalExceeded ? "danger" : "good"}`}>
            {isTotalExceeded ? "초과" : "정상"}
          </span>
        </div>
        <strong className={`remaining-total ${totalRemaining < 0 ? "negative" : ""}`}>
          {formatWon(totalRemaining)}
        </strong>
      </div>

      <div className="summary-stats" aria-label="전체 포인트 요약">
        <div>
          <span>전체 한도</span>
          <strong>{formatWon(ANNUAL_LIMIT)}</strong>
        </div>
        <div>
          <span>사용 금액</span>
          <strong>{formatWon(totalUsed)}</strong>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-meta">
          <span>전체 사용률</span>
          <strong className={`usage-rate-text ${usageTone}`}>{Math.round(totalUsageRate)}%</strong>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill ${usageTone}`}
            style={{ width: `${totalUsageRate}%` }}
          />
        </div>
      </div>

      {isTotalExceeded && (
        <p className="warning-text">전체 한도 1,200,000원을 초과했습니다.</p>
      )}
    </section>
  );
}

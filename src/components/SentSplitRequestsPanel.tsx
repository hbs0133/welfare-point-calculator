import { useLayoutEffect, useState } from "react";
import { CATEGORY_LABELS } from "../constants";
import type { SentSplitRequest, SplitRequestStatus } from "../types";
import { formatWon } from "../utils/format";

type SentSplitRequestsPanelProps = {
  isLoading: boolean;
  requests: SentSplitRequest[];
  onCancel: (request: SentSplitRequest) => Promise<boolean | void> | boolean | void;
};

const STATUS_LABELS: Record<SplitRequestStatus, string> = {
  pending: "대기",
  accepted: "수락",
  rejected: "거절",
};

export function SentSplitRequestsPanel({
  isLoading,
  requests,
  onCancel,
}: SentSplitRequestsPanelProps) {
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SentSplitRequest | null>(null);

  useLayoutEffect(() => {
    if (!cancelTarget) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !workingId) {
        setCancelTarget(null);
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
  }, [cancelTarget, workingId]);

  if (!isLoading && requests.length === 0) {
    return null;
  }

  const closeCancelDialog = () => {
    if (!workingId) {
      setCancelTarget(null);
    }
  };

  const cancelRequest = async () => {
    if (!cancelTarget) {
      return;
    }

    const request = cancelTarget;
    setWorkingId(request.requestId);
    try {
      const wasCanceled = await onCancel(request);
      if (wasCanceled !== false) {
        setCancelTarget(null);
      }
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="tool-panel split-requests-panel">
      <div className="section-title">
        <div>
          <h2>보낸 1/N 요청</h2>
          <p className="section-subtitle">
            {isLoading ? "요청 상태를 확인하는 중입니다." : `${requests.length}건`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state">보낸 요청을 불러오는 중입니다.</div>
      ) : (
        <div className="split-request-list">
          {requests.map((request) => {
            const pendingCount = request.recipients.filter(
              (recipient) => recipient.status === "pending",
            ).length;
            const acceptedCount = request.recipients.filter(
              (recipient) => recipient.status === "accepted",
            ).length;
            const rejectedCount = request.recipients.filter(
              (recipient) => recipient.status === "rejected",
            ).length;
            const canCancel = acceptedCount === 0;

            return (
              <article className="split-request-item" key={request.requestId}>
                <div className="split-request-main">
                  <div>
                    <span className={`category-pill ${request.category}`}>
                      {CATEGORY_LABELS[request.category]}
                    </span>
                    <h3>{formatWon(request.perPersonAmount)} 요청</h3>
                  </div>
                  <strong>
                    {request.recipients.length}명에게 요청
                    <span>{request.date}</span>
                  </strong>
                </div>

                <div className="split-request-meta">
                  <span>총 {formatWon(request.totalAmount)}</span>
                  <span>{request.participantCount}명 1/N</span>
                  <span>대기 {pendingCount}</span>
                  <span>수락 {acceptedCount}</span>
                  <span>거절 {rejectedCount}</span>
                  {request.memo && <span>{request.memo}</span>}
                </div>

                <div className="sent-recipient-list" aria-label="요청 대상 상태">
                  {request.recipients.map((recipient) => (
                    <div className="sent-recipient-item" key={recipient.recipientRowId}>
                      <div>
                        <strong>{recipient.displayName}</strong>
                        <span>{recipient.email}</span>
                      </div>
                      <span className={`request-status ${recipient.status}`}>
                        {STATUS_LABELS[recipient.status]}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="split-request-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setCancelTarget(request)}
                    disabled={!canCancel || workingId === request.requestId}
                    title={canCancel ? "요청 취소" : "이미 수락한 동료가 있어 취소할 수 없습니다."}
                  >
                    요청 취소
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {cancelTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeCancelDialog}>
          <section
            className="confirm-dialog"
            role="dialog"
            aria-label="1/N 요청 취소 확인"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="confirm-dialog__header">
              <h2>보낸 1/N 요청을 취소할까요?</h2>
              <p>요청과 내 몫으로 저장된 사용 내역이 함께 삭제됩니다.</p>
            </div>

            <div className="confirm-dialog__summary">
              <div>
                <span>항목</span>
                <strong>{CATEGORY_LABELS[cancelTarget.category]}</strong>
              </div>
              <div>
                <span>총 금액</span>
                <strong>{formatWon(cancelTarget.totalAmount)}</strong>
              </div>
              <div>
                <span>요청 대상</span>
                <strong>
                  {cancelTarget.recipients
                    .map((recipient) => recipient.displayName)
                    .join(", ")}
                </strong>
              </div>
            </div>

            <div className="confirm-dialog__actions">
              <button
                className="secondary-button"
                type="button"
                onClick={closeCancelDialog}
                disabled={Boolean(workingId)}
              >
                취소
              </button>
              <button
                className="ghost-button confirm-dialog__delete"
                type="button"
                onClick={cancelRequest}
                disabled={Boolean(workingId)}
              >
                {workingId ? "취소 중" : "요청 취소"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

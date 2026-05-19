import { useLayoutEffect, useState } from "react";
import { CATEGORY_LABELS } from "../constants";
import type { ReceivedSplitRequest } from "../types";
import { formatWon } from "../utils/format";

type SplitRequestNotificationDialogProps = {
  isLoading: boolean;
  requests: ReceivedSplitRequest[];
  onAccept: (request: ReceivedSplitRequest) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
  onReject: (request: ReceivedSplitRequest) => Promise<boolean | void> | boolean | void;
};

export function SplitRequestNotificationDialog({
  isLoading,
  requests,
  onAccept,
  onClose,
  onReject,
}: SplitRequestNotificationDialogProps) {
  const [workingId, setWorkingId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !workingId) {
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
  }, [onClose, workingId]);

  const runAction = async (
    request: ReceivedSplitRequest,
    action: (request: ReceivedSplitRequest) => Promise<boolean | void> | boolean | void,
  ) => {
    setWorkingId(request.recipientId);
    try {
      await action(request);
    } finally {
      setWorkingId(null);
    }
  };

  const requestCount = requests.length;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="confirm-dialog notification-dialog"
        role="dialog"
        aria-label="1/N 요청 알림"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog__header notification-dialog__header">
          <div>
            <span className="notification-dialog__eyebrow">1/N 요청</span>
            <h2>받은 요청 알림</h2>
            <p>
              {requestCount > 0
                ? `${requestCount}건의 요청을 확인할 수 있습니다.`
                : "새로 받은 1/N 요청이 없습니다."}
            </p>
          </div>
          <button
            className="notification-dialog__close"
            type="button"
            onClick={onClose}
            disabled={Boolean(workingId)}
            aria-label="알림 닫기"
          />
        </div>

        {isLoading ? (
          <div className="empty-state notification-dialog__empty">
            받은 요청을 불러오는 중입니다.
          </div>
        ) : requestCount === 0 ? (
          <div className="empty-state notification-dialog__empty">
            처리할 1/N 요청이 없습니다.
          </div>
        ) : (
          <div className="notification-request-list">
            {requests.map((request) => (
              <article className="notification-request-card" key={request.recipientId}>
                <div className="notification-request-card__top">
                  <span className={`category-pill ${request.category}`}>
                    {CATEGORY_LABELS[request.category]}
                  </span>
                  <strong>{formatWon(request.perPersonAmount)}</strong>
                </div>

                <div className="notification-request-card__sender">
                  <div>
                    <strong>{request.requesterName}</strong>
                    <span>{request.requesterEmail}</span>
                  </div>
                  <time dateTime={request.date}>{request.date}</time>
                </div>

                <div className="notification-request-meta">
                  <span>총 {formatWon(request.totalAmount)}</span>
                  <span>{request.participantCount}명 1/N</span>
                  {request.memo && <span>{request.memo}</span>}
                </div>

                <div className="notification-request-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => runAction(request, onReject)}
                    disabled={workingId === request.recipientId}
                  >
                    거절
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => runAction(request, onAccept)}
                    disabled={workingId === request.recipientId}
                  >
                    {workingId === request.recipientId ? "처리 중" : "수락"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

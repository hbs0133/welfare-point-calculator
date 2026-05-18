import { useLayoutEffect, useState } from "react";
import { CATEGORY_LABELS } from "../constants";
import type { ReceivedSplitRequest, SentSplitRequest, SplitRequestStatus } from "../types";
import { formatWon } from "../utils/format";

type SplitRequestCenterProps = {
  isExpanded: boolean;
  isReceivedLoading: boolean;
  isSentLoading: boolean;
  receivedRequests: ReceivedSplitRequest[];
  sentRequests: SentSplitRequest[];
  onAccept: (request: ReceivedSplitRequest) => Promise<boolean | void> | boolean | void;
  onCancel: (request: SentSplitRequest) => Promise<boolean | void> | boolean | void;
  onReject: (request: ReceivedSplitRequest) => Promise<boolean | void> | boolean | void;
  onToggle: () => void;
};

const STATUS_LABELS: Record<SplitRequestStatus, string> = {
  pending: "대기",
  accepted: "수락",
  rejected: "거절",
};

export function SplitRequestCenter({
  isExpanded,
  isReceivedLoading,
  isSentLoading,
  receivedRequests,
  sentRequests,
  onAccept,
  onCancel,
  onReject,
  onToggle,
}: SplitRequestCenterProps) {
  const [receivedWorkingId, setReceivedWorkingId] = useState<string | null>(null);
  const [sentWorkingId, setSentWorkingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SentSplitRequest | null>(null);

  const isLoading = isReceivedLoading || isSentLoading;
  const receivedCount = receivedRequests.length;
  const sentCount = sentRequests.length;
  const sentPendingCount = sentRequests.reduce(
    (total, request) =>
      total + request.recipients.filter((recipient) => recipient.status === "pending").length,
    0,
  );

  useLayoutEffect(() => {
    if (!cancelTarget) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sentWorkingId) {
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
  }, [cancelTarget, sentWorkingId]);

  const runReceivedAction = async (
    request: ReceivedSplitRequest,
    action: (request: ReceivedSplitRequest) => Promise<boolean | void> | boolean | void,
  ) => {
    setReceivedWorkingId(request.recipientId);
    try {
      await action(request);
    } finally {
      setReceivedWorkingId(null);
    }
  };

  const closeCancelDialog = () => {
    if (!sentWorkingId) {
      setCancelTarget(null);
    }
  };

  const cancelRequest = async () => {
    if (!cancelTarget) {
      return;
    }

    const request = cancelTarget;
    setSentWorkingId(request.requestId);
    try {
      const wasCanceled = await onCancel(request);
      if (wasCanceled !== false) {
        setCancelTarget(null);
      }
    } finally {
      setSentWorkingId(null);
    }
  };

  return (
    <section className={`tool-panel split-request-center ${isExpanded ? "is-open" : ""}`}>
      <div className="section-title split-request-center__header">
        <div>
          <h2>1/N 요청</h2>
          <p className="section-subtitle">
            {receivedCount > 0
              ? `받은 요청이 ${receivedCount}건 있습니다.`
              : sentCount > 0
                ? `보낸 요청 ${sentCount}건을 확인할 수 있습니다.`
                : "받거나 보낸 요청이 없습니다."}
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={onToggle}>
          {isExpanded ? "접기" : "펼치기"}
        </button>
      </div>

      <div className="request-center-summary" aria-label="1/N 요청 요약">
        <span className={receivedCount > 0 ? "has-alert" : ""}>받은 요청 {receivedCount}</span>
        <span>보낸 요청 {sentCount}</span>
        <span>보낸 대기 {sentPendingCount}</span>
      </div>

      {isExpanded && (
        <div className="request-center-body">
          <section className="request-subsection">
            <div className="request-subsection__title">
              <h3>받은 요청</h3>
              <span>{isReceivedLoading ? "확인 중" : `${receivedCount}건`}</span>
            </div>

            {isReceivedLoading ? (
              <div className="empty-state">받은 요청을 불러오는 중입니다.</div>
            ) : receivedRequests.length === 0 ? (
              <div className="empty-state">받은 1/N 요청이 없습니다.</div>
            ) : (
              <div className="split-request-list">
                {receivedRequests.map((request) => (
                  <article className="split-request-item" key={request.recipientId}>
                    <div className="split-request-main">
                      <div>
                        <span className={`category-pill ${request.category}`}>
                          {CATEGORY_LABELS[request.category]}
                        </span>
                        <h3>{formatWon(request.perPersonAmount)} 차감 요청</h3>
                      </div>
                      <strong>
                        {request.requesterName}
                        <span>{request.requesterEmail}</span>
                      </strong>
                    </div>

                    <div className="split-request-meta">
                      <span>{request.date}</span>
                      <span>총 {formatWon(request.totalAmount)}</span>
                      <span>{request.participantCount}명 1/N</span>
                      {request.memo && <span>{request.memo}</span>}
                    </div>

                    <div className="split-request-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => runReceivedAction(request, onReject)}
                        disabled={receivedWorkingId === request.recipientId}
                      >
                        거절
                      </button>
                      <button
                        className="primary-button split-request-accept"
                        type="button"
                        onClick={() => runReceivedAction(request, onAccept)}
                        disabled={receivedWorkingId === request.recipientId}
                      >
                        {receivedWorkingId === request.recipientId ? "처리 중" : "수락"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="request-subsection">
            <div className="request-subsection__title">
              <h3>보낸 요청</h3>
              <span>{isSentLoading ? "확인 중" : `${sentCount}건`}</span>
            </div>

            {isSentLoading ? (
              <div className="empty-state">보낸 요청을 불러오는 중입니다.</div>
            ) : sentRequests.length === 0 ? (
              <div className="empty-state">보낸 1/N 요청이 없습니다.</div>
            ) : (
              <div className="split-request-list">
                {sentRequests.map((request) => {
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
                          disabled={!canCancel || sentWorkingId === request.requestId}
                          title={
                            canCancel
                              ? "요청 취소"
                              : "이미 수락한 동료가 있어 취소할 수 없습니다."
                          }
                        >
                          요청 취소
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
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
                disabled={Boolean(sentWorkingId)}
              >
                취소
              </button>
              <button
                className="ghost-button confirm-dialog__delete"
                type="button"
                onClick={cancelRequest}
                disabled={Boolean(sentWorkingId)}
              >
                {sentWorkingId ? "취소 중" : "요청 취소"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

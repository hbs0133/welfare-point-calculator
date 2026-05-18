import { useState } from "react";
import { CATEGORY_LABELS } from "../constants";
import type { ReceivedSplitRequest } from "../types";
import { formatWon } from "../utils/format";

type SplitRequestsPanelProps = {
  isLoading: boolean;
  requests: ReceivedSplitRequest[];
  onAccept: (request: ReceivedSplitRequest) => Promise<boolean | void> | boolean | void;
  onReject: (request: ReceivedSplitRequest) => Promise<boolean | void> | boolean | void;
};

export function SplitRequestsPanel({
  isLoading,
  requests,
  onAccept,
  onReject,
}: SplitRequestsPanelProps) {
  const [workingId, setWorkingId] = useState<string | null>(null);

  if (!isLoading && requests.length === 0) {
    return null;
  }

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

  return (
    <section className="tool-panel split-requests-panel">
      <div className="section-title">
        <div>
          <h2>받은 1/N 요청</h2>
          <p className="section-subtitle">
            {isLoading ? "요청을 확인하는 중입니다." : `${requests.length}건 대기 중`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state">요청을 불러오는 중입니다.</div>
      ) : (
        <div className="split-request-list">
          {requests.map((request) => (
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
                  onClick={() => runAction(request, onReject)}
                  disabled={workingId === request.recipientId}
                >
                  거절
                </button>
                <button
                  className="primary-button split-request-accept"
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
  );
}

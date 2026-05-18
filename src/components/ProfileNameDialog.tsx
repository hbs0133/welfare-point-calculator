import { FormEvent, useLayoutEffect, useState } from "react";

type ProfileNameDialogProps = {
  email: string;
  initialName: string;
  isSaving: boolean;
  onSave: (displayName: string) => Promise<boolean | void> | boolean | void;
};

export function ProfileNameDialog({
  email,
  initialName,
  isSaving,
  onSave,
}: ProfileNameDialogProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [errorMessage, setErrorMessage] = useState("");

  useLayoutEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  const submitName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextName = displayName.trim();
    if (!nextName) {
      setErrorMessage("이름을 입력해주세요.");
      return;
    }

    const wasSaved = await onSave(nextName);
    if (wasSaved === false) {
      setErrorMessage("이름을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setErrorMessage("");
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog profile-dialog" role="dialog" aria-modal="true">
        <div className="confirm-dialog__header">
          <h2>이름을 등록해주세요</h2>
          <p>1/N 요청에서 동료들이 이름으로 찾을 수 있도록 한 번만 입력하면 됩니다.</p>
        </div>

        <form className="profile-dialog__form" onSubmit={submitName}>
          <label className="field">
            <span>계정</span>
            <input type="text" value={email} disabled />
          </label>
          <label className="field">
            <span>이름</span>
            <input
              type="text"
              autoComplete="name"
              placeholder="예: 홍길동"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoFocus
            />
          </label>

          <div className="form-messages" aria-live="polite">
            {errorMessage && <p className="warning-text">{errorMessage}</p>}
          </div>

          <div className="confirm-dialog__actions">
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? "저장 중" : "저장"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

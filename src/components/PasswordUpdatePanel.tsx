import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";

type PasswordUpdatePanelProps = {
  onComplete: () => void;
};

export function PasswordUpdatePanel({ onComplete }: PasswordUpdatePanelProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("비밀번호가 변경되었습니다. 잠시 후 화면이 이동됩니다.");
    window.setTimeout(onComplete, 900);
  };

  return (
    <section className="auth-layout">
      <div className="auth-card">
        <div className="auth-copy">
          <h2>새 비밀번호 설정</h2>
          <p>앞으로 사용할 새 비밀번호를 입력해주세요.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>새 비밀번호</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="6자 이상"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <label className="field">
            <span>새 비밀번호 확인</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="한 번 더 입력"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
            />
          </label>

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "변경 중" : "비밀번호 변경"}
          </button>
        </form>

        <div className="form-messages" aria-live="polite">
          {message && <p className="success-text">{message}</p>}
          {errorMessage && <p className="warning-text">{errorMessage}</p>}
        </div>
      </div>
    </section>
  );
}

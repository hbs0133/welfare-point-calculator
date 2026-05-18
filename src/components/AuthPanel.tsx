import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";
import { COMPANY_EMAIL_DOMAIN, isCompanyEmail, normalizeEmail } from "../utils/companyEmail";

type AuthMode = "signIn" | "signUp" | "resetPassword";
const AUTH_COPY: Record<
  AuthMode,
  {
    title: string;
    description: string;
    button: string;
    success: string;
  }
> = {
  signIn: {
    title: "로그인",
    description: "회사 이메일과 비밀번호로 접속하세요.",
    button: "로그인",
    success: "로그인되었습니다.",
  },
  signUp: {
    title: "계정 만들기",
    description: "처음 사용하는 아수인이라면 회사 이메일로 계정을 만들 수 있어요.",
    button: "가입하기",
    success: "인증 메일을 보냈습니다. 회사 메일함에서 인증을 완료해주세요.",
  },
  resetPassword: {
    title: "비밀번호 재설정",
    description: "회사 이메일로 비밀번호 재설정 링크를 보내드립니다.",
    button: "재설정 메일 보내기",
    success: "비밀번호 재설정 메일을 보냈습니다. 회사 메일함을 확인해주세요.",
  },
};

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = AUTH_COPY[mode];
  const shouldShowName = mode === "signUp";
  const shouldShowPassword = mode !== "resetPassword";

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage("");
    setErrorMessage("");
    setPassword("");
    setDisplayName("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setErrorMessage("회사 이메일을 입력해주세요.");
      return;
    }

    if (shouldShowPassword && !password) {
      setErrorMessage("회사 이메일과 비밀번호를 입력해주세요.");
      return;
    }

    if (shouldShowName && !displayName.trim()) {
      setErrorMessage("이름을 입력해주세요.");
      return;
    }

    if (!isCompanyEmail(normalizedEmail)) {
      setErrorMessage(`${COMPANY_EMAIL_DOMAIN} 회사 이메일만 사용할 수 있어요.`);
      return;
    }

    setIsSubmitting(true);

    const { error } =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })
        : mode === "signUp"
          ? await supabase.auth.signUp({
              email: normalizedEmail,
              password,
              options: {
                data: {
                  display_name: displayName.trim(),
                },
                emailRedirectTo: window.location.origin,
              },
            })
          : await supabase.auth.resetPasswordForEmail(normalizedEmail, {
              redirectTo: window.location.origin,
            });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage(copy.success);
  };

  return (
    <section className="auth-layout">
      <div className="auth-card">
        {mode !== "resetPassword" ? (
          <div className="auth-tabs" aria-label="인증 방식">
            <button
              className={`auth-tab ${mode === "signIn" ? "is-active" : ""}`}
              type="button"
              onClick={() => switchMode("signIn")}
            >
              로그인
            </button>
            <button
              className={`auth-tab ${mode === "signUp" ? "is-active" : ""}`}
              type="button"
              onClick={() => switchMode("signUp")}
            >
              회원가입
            </button>
          </div>
        ) : (
          <button className="auth-back-button" type="button" onClick={() => switchMode("signIn")}>
            로그인으로 돌아가기
          </button>
        )}

        <div className="auth-copy">
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {shouldShowName && (
            <label className="field">
              <span>이름</span>
              <input
                type="text"
                autoComplete="name"
                placeholder="예: 홍길동"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
          )}

          <label className="field">
            <span>회사 이메일</span>
            <input
              type="email"
              autoComplete="email"
              placeholder={`name${COMPANY_EMAIL_DOMAIN}`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <p className="auth-domain-note">{COMPANY_EMAIL_DOMAIN} 회사 이메일만 사용할 수 있어요.</p>

          {shouldShowPassword && (
            <label className="field">
              <span>비밀번호</span>
              <input
                type="password"
                autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                minLength={6}
                placeholder="6자 이상"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "처리 중" : copy.button}
          </button>
        </form>

        {mode === "signIn" && (
          <div className="auth-helper">
            <button className="link-button" type="button" onClick={() => switchMode("resetPassword")}>
              비밀번호를 잊으셨나요?
            </button>
          </div>
        )}

        <div className="form-messages" aria-live="polite">
          {message && <p className="success-text">{message}</p>}
          {errorMessage && <p className="warning-text">{errorMessage}</p>}
        </div>
      </div>
    </section>
  );
}

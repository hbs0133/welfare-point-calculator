import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";
import { createAuthEmail, isValidLoginId, normalizeLoginId } from "../utils/authIdentity";

type AuthMode = "signIn" | "signUp";

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
    description: "회사에서 사용할 아이디와 비밀번호로 접속하세요.",
    button: "로그인",
    success: "로그인되었습니다.",
  },
  signUp: {
    title: "계정 만들기",
    description: "처음 사용하는 동료라면 아이디로 계정을 만들 수 있어요.",
    button: "가입하기",
    success: "가입이 완료되었습니다. 이제 로그인할 수 있어요.",
  },
};

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = AUTH_COPY[mode];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const normalizedLoginId = normalizeLoginId(loginId);

    if (!normalizedLoginId || !password) {
      setErrorMessage("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    if (!isValidLoginId(normalizedLoginId)) {
      setErrorMessage("아이디는 영문, 숫자, 점, 밑줄, 하이픈 조합으로 3~30자까지 사용할 수 있어요.");
      return;
    }

    setIsSubmitting(true);

    const authEmail = createAuthEmail(normalizedLoginId);

    const { error } =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
          })
        : await supabase.auth.signUp({
            email: authEmail,
            password,
            options: {
              data: {
                loginId: normalizedLoginId,
              },
            },
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
        <div className="auth-tabs" aria-label="인증 방식">
          <button
            className={`auth-tab ${mode === "signIn" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("signIn")}
          >
            로그인
          </button>
          <button
            className={`auth-tab ${mode === "signUp" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("signUp")}
          >
            회원가입
          </button>
        </div>

        <div className="auth-copy">
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>아이디</span>
            <input
              type="text"
              autoComplete="username"
              placeholder="hbs0133"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
            />
          </label>

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

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "처리 중" : copy.button}
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

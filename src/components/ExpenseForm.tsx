import { FormEvent, useMemo, useState } from "react";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "../constants";
import type { CategoryKey, Expense, ExpenseInput } from "../types";
import { getProjectedWarnings } from "../utils/calculations";
import {
  isCompanyEmail,
  normalizeEmail,
  parseCompanyEmailList,
} from "../utils/companyEmail";
import { formatNumber, formatWon, getTodayISO, parseAmountInput } from "../utils/format";
import { DatePicker } from "./DatePicker";

type ExpenseFormProps = {
  currentUserEmail: string;
  expenses: Expense[];
  onAddExpense: (expense: ExpenseInput) => boolean | void | Promise<boolean | void>;
};

export function ExpenseForm({ currentUserEmail, expenses, onAddExpense }: ExpenseFormProps) {
  const [category, setCategory] = useState<CategoryKey>("club");
  const [amountInput, setAmountInput] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(getTodayISO());
  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [recipientsInput, setRecipientsInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const amount = parseAmountInput(amountInput);
  const currentEmail = normalizeEmail(currentUserEmail);
  const recipientEmails = useMemo(
    () => parseCompanyEmailList(recipientsInput).filter((email) => email !== currentEmail),
    [currentEmail, recipientsInput],
  );
  const participantCount = isSplitEnabled ? recipientEmails.length + 1 : 1;
  const splitAmount =
    isSplitEnabled && recipientEmails.length > 0 && amount % participantCount === 0
      ? amount / participantCount
      : amount;

  const projectedWarnings = useMemo(
    () => getProjectedWarnings(expenses, category, splitAmount),
    [category, expenses, splitAmount],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!amount) {
      setErrorMessage("사용 금액을 입력해주세요.");
      return;
    }

    if (!date) {
      setErrorMessage("날짜를 선택해주세요.");
      return;
    }

    if (isSplitEnabled) {
      if (recipientEmails.length === 0) {
        setErrorMessage("1/N 요청을 받을 동료 이메일이나 아이디를 입력해주세요.");
        return;
      }

      const invalidEmails = recipientEmails.filter((email) => !isCompanyEmail(email));
      if (invalidEmails.length > 0) {
        setErrorMessage("@asoosoft.net 회사 이메일만 요청할 수 있어요.");
        return;
      }

      if (amount % participantCount !== 0) {
        setErrorMessage(`${participantCount}명으로 나누어떨어지는 금액을 입력해주세요.`);
        return;
      }
    }

    const wasSaved = await onAddExpense({
      category,
      amount,
      memo: memo.trim(),
      date,
      split: isSplitEnabled
        ? {
            recipientEmails,
          }
        : undefined,
    });

    if (wasSaved === false) {
      return;
    }

    setAmountInput("");
    setMemo("");
    setDate(getTodayISO());
    setIsSplitEnabled(false);
    setRecipientsInput("");
    setErrorMessage("");
  };

  return (
    <section className="tool-panel">
      <div className="section-title">
        <h2>사용 내역 추가</h2>
      </div>

      <form className="expense-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>항목</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryKey)}
          >
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>사용 금액</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={amountInput ? formatNumber(amount) : ""}
            onChange={(event) => setAmountInput(String(parseAmountInput(event.target.value)))}
          />
        </label>

        <label className="field">
          <span>메모</span>
          <input
            type="text"
            placeholder="예: 헬스장 5월 이용권"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />
        </label>

        <label className="field">
          <span>날짜</span>
          <DatePicker value={date} onChange={setDate} />
        </label>

        <label className="split-toggle">
          <input
            type="checkbox"
            checked={isSplitEnabled}
            onChange={(event) => setIsSplitEnabled(event.target.checked)}
          />
          <span>1/N 요청으로 나눠 차감</span>
        </label>

        {isSplitEnabled && (
          <div className="split-panel">
            <label className="field">
              <span>요청 받을 동료</span>
              <textarea
                rows={3}
                placeholder="hbs0133 또는 name@asoosoft.net&#10;쉼표, 공백, 줄바꿈으로 여러 명 입력"
                value={recipientsInput}
                onChange={(event) => setRecipientsInput(event.target.value)}
              />
            </label>
            <p className="split-helper">
              나 포함 {participantCount}명
              {amount > 0 && recipientEmails.length > 0 && amount % participantCount === 0
                ? ` · 1인 ${formatWon(splitAmount)}`
                : " · 나누어떨어지는 금액을 입력해주세요"}
            </p>
          </div>
        )}

        <button className="primary-button" type="submit">
          + 추가
        </button>
      </form>

      <div className="form-messages" aria-live="polite">
        {errorMessage && <p className="warning-text">{errorMessage}</p>}
        {amount > 0 && projectedWarnings.willExceedTotal && (
          <p className="warning-text">추가 후 전체 한도를 초과합니다.</p>
        )}
        {amount > 0 && projectedWarnings.willExceedCategory && (
          <p className="warning-text">추가 후 선택 항목 한도를 초과합니다.</p>
        )}
      </div>
    </section>
  );
}

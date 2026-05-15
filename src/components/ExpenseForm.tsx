import { FormEvent, useMemo, useState } from "react";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "../constants";
import type { CategoryKey, Expense } from "../types";
import { getProjectedWarnings } from "../utils/calculations";
import { formatNumber, getTodayISO, parseAmountInput } from "../utils/format";
import { DatePicker } from "./DatePicker";

type ExpenseFormProps = {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, "id">) => boolean | void | Promise<boolean | void>;
};

export function ExpenseForm({ expenses, onAddExpense }: ExpenseFormProps) {
  const [category, setCategory] = useState<CategoryKey>("club");
  const [amountInput, setAmountInput] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(getTodayISO());
  const [errorMessage, setErrorMessage] = useState("");

  const amount = parseAmountInput(amountInput);

  const projectedWarnings = useMemo(
    () => getProjectedWarnings(expenses, category, amount),
    [amount, category, expenses],
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

    const wasSaved = await onAddExpense({
      category,
      amount,
      memo: memo.trim(),
      date,
    });

    if (wasSaved === false) {
      return;
    }

    setAmountInput("");
    setMemo("");
    setDate(getTodayISO());
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

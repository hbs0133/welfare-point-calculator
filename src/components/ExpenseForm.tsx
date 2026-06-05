import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "../constants";
import type {
  CategoryKey,
  Expense,
  ExpenseInput,
  ProfileSummary,
  SplitRecipientInput,
} from "../types";
import { getProjectedWarnings } from "../utils/calculations";
import {
  getEmailLocalPart,
  isCompanyEmail,
  normalizeEmail,
} from "../utils/companyEmail";
import { formatNumber, formatWon, getTodayISO, parseAmountInput } from "../utils/format";
import { DatePicker } from "./DatePicker";

type ExpenseFormProps = {
  currentUserId?: string;
  currentUserEmail?: string;
  expenses: Expense[];
  initialExpense?: Expense;
  isModal?: boolean;
  mode?: "create" | "edit";
  profiles?: ProfileSummary[];
  onRefreshProfiles?: () => Promise<void> | void;
  onAddExpense?: (expense: ExpenseInput) => boolean | void | Promise<boolean | void>;
  onClose?: () => void;
  onSaved?: () => void;
  onUpdateExpense?: (expense: Expense) => boolean | void | Promise<boolean | void>;
};

export function ExpenseForm({
  currentUserId,
  currentUserEmail,
  expenses,
  initialExpense,
  isModal = false,
  mode = "create",
  profiles,
  onRefreshProfiles,
  onAddExpense,
  onClose,
  onSaved,
  onUpdateExpense,
}: ExpenseFormProps) {
  const isEditMode = mode === "edit" && Boolean(initialExpense);
  const [category, setCategory] = useState<CategoryKey>(initialExpense?.category ?? "club");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [amountInput, setAmountInput] = useState(
    initialExpense ? String(initialExpense.amount) : "",
  );
  const [memo, setMemo] = useState(initialExpense?.memo ?? "");
  const [date, setDate] = useState(initialExpense?.date ?? getTodayISO());
  const [splitRecipients, setSplitRecipients] = useState<SplitRecipientInput[]>([]);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [isDirectoryDialogOpen, setIsDirectoryDialogOpen] = useState(false);
  const [splitSearchInput, setSplitSearchInput] = useState("");
  const [directorySearchInput, setDirectorySearchInput] = useState("");
  const [directorySelectedIds, setDirectorySelectedIds] = useState<string[]>([]);
  const [splitDialogError, setSplitDialogError] = useState("");
  const [pendingExpense, setPendingExpense] = useState<ExpenseInput | null>(null);
  const [isConfirmingAdd, setIsConfirmingAdd] = useState(false);
  const [confirmErrorMessage, setConfirmErrorMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  const amount = parseAmountInput(amountInput);
  const currentEmail = normalizeEmail(currentUserEmail ?? "");
  const availableProfiles = useMemo(
    () =>
      (profiles ?? []).filter(
        (profile) =>
          profile.userId !== currentUserId && normalizeEmail(profile.email) !== currentEmail,
      ),
    [currentEmail, currentUserId, profiles],
  );
  const splitRecipientTotal = splitRecipients.reduce(
    (total, recipient) => total + recipient.amount,
    0,
  );
  const participantCount = splitRecipients.length > 0 ? splitRecipients.length + 1 : 1;
  const splitRequesterAmount =
    splitRecipients.length > 0 ? amount - splitRecipientTotal : amount;
  const projectedAmount =
    splitRecipients.length > 0 ? Math.max(splitRequesterAmount, 0) : amount;
  const pendingRequesterAmount =
    pendingExpense?.split?.requesterAmount ?? pendingExpense?.amount ?? 0;
  const pendingRecipientTotal =
    pendingExpense?.split?.recipients.reduce(
      (total, recipient) => total + recipient.amount,
      0,
    ) ?? 0;
  const splitSummaryText =
    splitRecipients.length === 0
      ? "동료 이름, 아이디, 이메일로 요청 대상을 추가할 수 있어요."
      : amount <= 0
        ? "금액 입력 후 각자 금액을 설정할 수 있어요."
        : splitRequesterAmount <= 0
          ? "요청 금액 합계가 총 금액보다 작아야 해요."
          : `나 포함 ${participantCount}명 · 내 차감 ${formatWon(splitRequesterAmount)}`;
  const directoryProfiles = useMemo(() => {
    const keyword = directorySearchInput.trim().toLowerCase();

    if (!keyword) {
      return availableProfiles;
    }

    return availableProfiles.filter((profile) => {
      const localPart = getEmailLocalPart(profile.email).toLowerCase();
      const displayName = profile.displayName.trim().toLowerCase();
      const email = normalizeEmail(profile.email);

      return (
        displayName.includes(keyword) ||
        localPart.includes(keyword) ||
        email.includes(keyword)
      );
    });
  }, [availableProfiles, directorySearchInput]);

  const warningBaseExpenses = useMemo(
    () =>
      isEditMode && initialExpense
        ? expenses.filter((expense) => expense.id !== initialExpense.id)
        : expenses,
    [expenses, initialExpense, isEditMode],
  );
  const projectedWarnings = useMemo(
    () => getProjectedWarnings(warningBaseExpenses, category, projectedAmount),
    [category, projectedAmount, warningBaseExpenses],
  );

  useEffect(() => {
    if (!initialExpense) {
      return;
    }

    setCategory(initialExpense.category);
    setAmountInput(String(initialExpense.amount));
    setMemo(initialExpense.memo);
    setDate(initialExpense.date);
    setSplitRecipients([]);
    setErrorMessage("");
    setConfirmErrorMessage("");
    setPendingExpense(null);
  }, [initialExpense]);

  useLayoutEffect(() => {
    if (!isCategoryMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        event.target instanceof Node &&
        !categoryMenuRef.current?.contains(event.target)
      ) {
        setIsCategoryMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCategoryMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCategoryMenuOpen]);

  useLayoutEffect(() => {
    if (!isSplitDialogOpen && !pendingExpense) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isConfirmingAdd) {
        if (isDirectoryDialogOpen) {
          setIsDirectoryDialogOpen(false);
          return;
        }

        setIsSplitDialogOpen(false);
        setPendingExpense(null);
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
  }, [isConfirmingAdd, isDirectoryDialogOpen, isSplitDialogOpen, pendingExpense]);

  const openSplitDialog = () => {
    setSplitDialogError("");
    setIsSplitDialogOpen(true);
    Promise.resolve(onRefreshProfiles?.()).catch(() => {
      setSplitDialogError("동료 목록을 새로 불러오지 못했습니다.");
    });
  };

  const openDirectoryDialog = () => {
    setDirectorySelectedIds(splitRecipients.map((recipient) => recipient.userId));
    setDirectorySearchInput("");
    setIsDirectoryDialogOpen(true);
    Promise.resolve(onRefreshProfiles?.()).catch(() => {
      setSplitDialogError("동료 목록을 새로 불러오지 못했습니다.");
    });
  };

  const findProfile = (query: string) => {
    const keyword = query.trim().toLowerCase();
    const normalizedEmail = normalizeEmail(query);

    if (!keyword) {
      setSplitDialogError("이름, 아이디, 회사 이메일 중 하나를 입력해주세요.");
      return null;
    }

    const selectedIds = new Set(splitRecipients.map((profile) => profile.userId));
    const candidates = availableProfiles.filter((profile) => !selectedIds.has(profile.userId));
    const exactMatches = candidates.filter((profile) => {
      const localPart = getEmailLocalPart(profile.email).toLowerCase();
      const displayName = profile.displayName.trim().toLowerCase();

      return (
        normalizeEmail(profile.email) === normalizedEmail ||
        localPart === keyword ||
        displayName === keyword
      );
    });

    if (exactMatches.length === 1) {
      return exactMatches[0];
    }

    if (exactMatches.length > 1) {
      setSplitDialogError("동명이인이 있어요. 회사 이메일이나 아이디로 더 정확히 입력해주세요.");
      return null;
    }

    const partialMatches = candidates.filter((profile) => {
      const localPart = getEmailLocalPart(profile.email).toLowerCase();
      const displayName = profile.displayName.trim().toLowerCase();

      return localPart.includes(keyword) || displayName.includes(keyword);
    });

    if (partialMatches.length === 1) {
      return partialMatches[0];
    }

    if (partialMatches.length > 1) {
      setSplitDialogError("검색 결과가 여러 명이에요. 이름을 더 입력하거나 이메일로 찾아주세요.");
      return null;
    }

    setSplitDialogError("가입되어 있고 이름을 등록한 동료만 요청할 수 있어요.");
    return null;
  };

  const getDefaultSplitAmount = (recipientCount: number) => {
    if (amount <= 0) {
      return 0;
    }

    return Math.floor(amount / (recipientCount + 1));
  };

  const areSplitAmountsEven = (recipients: SplitRecipientInput[]) => {
    const evenAmount = getDefaultSplitAmount(recipients.length);

    return recipients.every((recipient) => recipient.amount === evenAmount);
  };

  const toSplitRecipient = (
    profile: ProfileSummary,
    recipientCount: number,
  ): SplitRecipientInput => ({
    ...profile,
    amount: getDefaultSplitAmount(recipientCount),
  });

  const updateSplitRecipientAmount = (userId: string, nextInput: string) => {
    const nextAmount = parseAmountInput(nextInput);

    setSplitRecipients((currentRecipients) =>
      currentRecipients.map((recipient) =>
        recipient.userId === userId
          ? {
              ...recipient,
              amount: nextAmount,
            }
          : recipient,
      ),
    );
  };

  const distributeSplitAmountsEvenly = () => {
    setSplitRecipients((currentRecipients) => {
      const evenAmount = getDefaultSplitAmount(currentRecipients.length);

      return currentRecipients.map((recipient) => ({
        ...recipient,
        amount: evenAmount,
      }));
    });
    setSplitDialogError("");
  };

  const addSplitRecipient = () => {
    const nextProfile = findProfile(splitSearchInput);

    if (!nextProfile) {
      return;
    }

    setSplitRecipients((currentRecipients) => {
      const shouldRebalance = areSplitAmountsEven(currentRecipients);
      const nextRecipients = [
        ...currentRecipients,
        toSplitRecipient(nextProfile, currentRecipients.length + 1),
      ];

      if (!shouldRebalance) {
        return nextRecipients;
      }

      const evenAmount = getDefaultSplitAmount(nextRecipients.length);
      return nextRecipients.map((recipient) => ({
        ...recipient,
        amount: evenAmount,
      }));
    });
    setSplitSearchInput("");
    setSplitDialogError("");
  };

  const removeSplitRecipient = (userId: string) => {
    setSplitRecipients((currentRecipients) =>
      currentRecipients.filter((recipient) => recipient.userId !== userId),
    );
  };

  const toggleDirectoryRecipient = (userId: string) => {
    setDirectorySelectedIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((currentId) => currentId !== userId)
        : [...currentIds, userId],
    );
  };

  const applyDirectorySelection = () => {
    const selectedIdSet = new Set(directorySelectedIds);
    const currentRecipientMap = new Map(
      splitRecipients.map((recipient) => [recipient.userId, recipient]),
    );
    const selectedProfiles = availableProfiles.filter((profile) =>
      selectedIdSet.has(profile.userId),
    );
    const shouldRebalance = areSplitAmountsEven(splitRecipients);
    const nextRecipients = selectedProfiles.map(
      (profile) =>
        currentRecipientMap.get(profile.userId) ??
        toSplitRecipient(profile, selectedProfiles.length),
    );

    setSplitRecipients(
      shouldRebalance
        ? nextRecipients.map((recipient) => ({
            ...recipient,
            amount: getDefaultSplitAmount(nextRecipients.length),
          }))
        : nextRecipients,
    );
    setIsDirectoryDialogOpen(false);
    setSplitDialogError("");
  };

  const closeAddConfirmDialog = () => {
    if (!isConfirmingAdd) {
      setPendingExpense(null);
      setConfirmErrorMessage("");
    }
  };

  const resetForm = () => {
    setAmountInput("");
    setMemo("");
    setDate(getTodayISO());
    setSplitRecipients([]);
    setErrorMessage("");
  };

  const confirmAddExpense = async () => {
    if (!pendingExpense) {
      return;
    }

    setIsConfirmingAdd(true);
    setConfirmErrorMessage("");
    try {
      const wasSaved =
        isEditMode && initialExpense
          ? await onUpdateExpense?.({
              ...initialExpense,
              category: pendingExpense.category,
              amount: pendingExpense.amount,
              memo: pendingExpense.memo,
              date: pendingExpense.date,
            })
          : await onAddExpense?.(pendingExpense);

      if (wasSaved === false) {
        setConfirmErrorMessage("저장하지 못했습니다. 화면 안내를 확인한 뒤 다시 시도해주세요.");
        return;
      }

      setPendingExpense(null);
      resetForm();
      onSaved?.();
    } finally {
      setIsConfirmingAdd(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!amount) {
      setErrorMessage("사용 금액을 입력해주세요.");
      return;
    }

    if (!date) {
      setErrorMessage("날짜를 선택해주세요.");
      return;
    }

    if (!isEditMode && splitRecipients.length > 0) {
      const invalidEmails = splitRecipients.filter((profile) => !isCompanyEmail(profile.email));
      if (invalidEmails.length > 0) {
        setErrorMessage("@asoosoft.net 회사 이메일만 요청할 수 있어요.");
        return;
      }

      if (splitRecipients.some((recipient) => recipient.amount <= 0)) {
        setErrorMessage("각 동료에게 요청할 금액을 1원 이상으로 입력해주세요.");
        return;
      }

      if (splitRecipientTotal >= amount) {
        setErrorMessage("요청 금액 합계는 총 금액보다 작아야 해요. 내 차감 금액도 1원 이상이어야 합니다.");
        return;
      }
    }

    setPendingExpense({
      category,
      amount,
      memo: memo.trim(),
      date,
      split: !isEditMode && splitRecipients.length > 0
        ? {
            recipients: splitRecipients,
            requesterAmount: splitRequesterAmount,
          }
        : undefined,
    });
    setConfirmErrorMessage("");
  };

  return (
    <section className={`tool-panel expense-form-panel ${isModal ? "is-modal" : ""}`}>
      <div className="section-title expense-form-title">
        <div>
          <h2>{isEditMode ? "사용 내역 수정" : "사용 내역 추가"}</h2>
          <p className="section-subtitle">
            {isEditMode ? "등록된 사용 내역을 수정합니다." : "새 사용 내역"}
          </p>
        </div>
        {onClose && (
          <button
            className="modal-close-button"
            type="button"
            aria-label={isEditMode ? "사용 내역 수정 닫기" : "사용 내역 추가 닫기"}
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>

      <form className="expense-form" onSubmit={handleSubmit}>
        <div className="field category-select-field" ref={categoryMenuRef}>
          <span id="expense-category-label">항목</span>
          <button
            className={`category-select-trigger ${isCategoryMenuOpen ? "is-open" : ""}`}
            type="button"
            aria-expanded={isCategoryMenuOpen}
            aria-haspopup="listbox"
            aria-labelledby="expense-category-label"
            onClick={() => setIsCategoryMenuOpen((isOpen) => !isOpen)}
          >
            <span className={`category-select-dot ${category}`} aria-hidden="true" />
            <span>{CATEGORY_LABELS[category]}</span>
            <span className="category-select-chevron" aria-hidden="true" />
          </button>

          {isCategoryMenuOpen && (
            <div
              className="category-select-menu"
              role="listbox"
              aria-labelledby="expense-category-label"
            >
              {CATEGORY_KEYS.map((key) => {
                const isSelected = category === key;

                return (
                  <button
                    className={`category-select-option ${isSelected ? "is-selected" : ""}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    key={key}
                    onClick={() => {
                      setCategory(key);
                      setIsCategoryMenuOpen(false);
                    }}
                  >
                    <span className={`category-select-dot ${key}`} aria-hidden="true" />
                    <span>{CATEGORY_LABELS[key]}</span>
                    {isSelected && <span className="category-select-check">선택</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
          <DatePicker value={date} onChange={setDate} popoverPlacement="top" />
        </label>

        {!isEditMode && (
          <div className="split-config-card">
            <div>
              <strong>1/N 요청</strong>
              <p>{splitSummaryText}</p>
            </div>
            <div className="split-config-actions">
              {splitRecipients.length > 0 && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setSplitRecipients([])}
                >
                  해제
                </button>
              )}
              <button className="secondary-button" type="button" onClick={openSplitDialog}>
                {splitRecipients.length > 0 ? "수정" : "설정"}
              </button>
            </div>
          </div>
        )}

        {!isEditMode && splitRecipients.length > 0 && (
          <div className="split-selected-list" aria-label="선택된 1/N 요청 대상">
            {splitRecipients.map((recipient) => (
              <span className="split-recipient-chip" key={recipient.userId}>
                {recipient.displayName}
                {recipient.amount > 0 && ` · ${formatWon(recipient.amount)}`}
              </span>
            ))}
          </div>
        )}

        <button className="primary-button" type="submit">
          {isEditMode ? "수정" : "+ 추가"}
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

      {isSplitDialogOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setIsSplitDialogOpen(false)}
        >
          <section
            className="confirm-dialog split-dialog"
            role="dialog"
            aria-label="1/N 요청 대상 설정"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="confirm-dialog__header">
              <h2>1/N 요청 대상 설정</h2>
              <p>동료 이름, 아이디, 회사 이메일 중 하나를 입력해 요청 대상을 추가하세요.</p>
            </div>

            <div className="split-search-row">
              <input
                type="text"
                placeholder="예: 홍길동, hbs0133, name@asoosoft.net"
                value={splitSearchInput}
                onChange={(event) => setSplitSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSplitRecipient();
                  }
                }}
                autoFocus
              />
              <button className="secondary-button" type="button" onClick={addSplitRecipient}>
                추가하기
              </button>
              <button className="secondary-button" type="button" onClick={openDirectoryDialog}>
                목록 보기
              </button>
            </div>

            {splitDialogError && <p className="warning-text">{splitDialogError}</p>}

            {splitRecipients.length > 0 && (
              <div className="split-dialog-tools">
                <div>
                  <span>요청 합계</span>
                  <strong>{formatWon(splitRecipientTotal)}</strong>
                </div>
                <div>
                  <span>내 차감</span>
                  <strong className={splitRequesterAmount <= 0 ? "negative" : ""}>
                    {formatWon(splitRequesterAmount)}
                  </strong>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={distributeSplitAmountsEvenly}
                  disabled={amount <= 0}
                >
                  균등 배분
                </button>
              </div>
            )}

            <div className="split-dialog-list">
              {splitRecipients.length === 0 ? (
                <div className="empty-state">아직 추가한 동료가 없습니다.</div>
              ) : (
                splitRecipients.map((recipient) => (
                  <div className="split-dialog-item" key={recipient.userId}>
                    <div className="split-dialog-profile">
                      <strong>{recipient.displayName}</strong>
                      <span>{recipient.email}</span>
                    </div>
                    <label className="split-amount-field">
                      <span>요청 금액</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={recipient.amount ? formatNumber(recipient.amount) : ""}
                        placeholder="0"
                        onChange={(event) =>
                          updateSplitRecipientAmount(recipient.userId, event.target.value)
                        }
                      />
                    </label>
                    <button
                      className="mini-button"
                      type="button"
                      onClick={() => removeSplitRecipient(recipient.userId)}
                    >
                      제거
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="split-dialog-summary">
              <span>나 포함 {participantCount}명</span>
              <strong>
                {splitRecipients.length === 0
                  ? "금액 입력 후 요청 대상 추가"
                  : `내 차감 ${formatWon(splitRequesterAmount)}`}
              </strong>
            </div>

            {confirmErrorMessage && <p className="warning-text">{confirmErrorMessage}</p>}

            <div className="confirm-dialog__actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsSplitDialogOpen(false)}
              >
                확인
              </button>
            </div>

            {isDirectoryDialogOpen && (
              <div
                className="modal-backdrop nested-modal-backdrop"
                role="presentation"
                onMouseDown={() => setIsDirectoryDialogOpen(false)}
              >
                <section
                  className="confirm-dialog directory-dialog"
                  role="dialog"
                  aria-label="가입된 동료 목록"
                  aria-modal="true"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="confirm-dialog__header">
                    <h2>가입된 동료 목록</h2>
                    <p>체크한 동료를 1/N 요청 대상에 추가합니다.</p>
                  </div>

                  <input
                    className="directory-search-input"
                    type="text"
                    placeholder="이름, 아이디, 이메일 검색"
                    value={directorySearchInput}
                    onChange={(event) => setDirectorySearchInput(event.target.value)}
                    autoFocus
                  />

                  <div className="directory-list">
                    {directoryProfiles.length === 0 ? (
                      <div className="empty-state">조건에 맞는 동료가 없습니다.</div>
                    ) : (
                      directoryProfiles.map((profile) => (
                        <label className="directory-item" key={profile.userId}>
                          <input
                            type="checkbox"
                            checked={directorySelectedIds.includes(profile.userId)}
                            onChange={() => toggleDirectoryRecipient(profile.userId)}
                          />
                          <span>
                            <strong>{profile.displayName}</strong>
                            <small>{profile.email}</small>
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  <div className="directory-footer">
                    <span>{directorySelectedIds.length}명 선택</span>
                    <div className="confirm-dialog__actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setIsDirectoryDialogOpen(false)}
                      >
                        취소
                      </button>
                      <button className="primary-button" type="button" onClick={applyDirectorySelection}>
                        추가
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </section>
        </div>
      )}

      {pendingExpense && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeAddConfirmDialog}>
          <section
            className="confirm-dialog"
            role="dialog"
            aria-label={isEditMode ? "사용 내역 수정 확인" : "사용 내역 추가 확인"}
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="confirm-dialog__header">
              <h2>{isEditMode ? "사용 내역을 수정할까요?" : "사용 내역을 추가할까요?"}</h2>
              <p>
                {isEditMode
                  ? "아래 내용으로 포인트 사용 내역을 수정합니다."
                  : "아래 내용으로 포인트 사용 내역을 저장합니다."}
              </p>
            </div>

            <div className="confirm-dialog__summary">
              <div>
                <span>날짜</span>
                <strong>{pendingExpense.date}</strong>
              </div>
              <div>
                <span>항목</span>
                <strong>{CATEGORY_LABELS[pendingExpense.category]}</strong>
              </div>
              <div>
                <span>{pendingExpense.split ? "총 금액" : "금액"}</span>
                <strong>{formatWon(pendingExpense.amount)}</strong>
              </div>
              {pendingExpense.split && (
                <>
                  <div>
                    <span>요청 대상</span>
                    <strong>
                      {pendingExpense.split.recipients
                        .map(
                          (recipient) =>
                            `${recipient.displayName} ${formatWon(recipient.amount)}`,
                        )
                        .join(", ")}
                    </strong>
                  </div>
                  <div>
                    <span>요청 합계</span>
                    <strong>{formatWon(pendingRecipientTotal)}</strong>
                  </div>
                  <div>
                    <span>본인 차감</span>
                    <strong>{formatWon(pendingRequesterAmount)}</strong>
                  </div>
                </>
              )}
              <div>
                <span>메모</span>
                <strong>{pendingExpense.memo || "-"}</strong>
              </div>
            </div>

            <div className="confirm-dialog__actions">
              <button
                className="secondary-button"
                type="button"
                onClick={closeAddConfirmDialog}
                disabled={isConfirmingAdd}
              >
                취소
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={confirmAddExpense}
                disabled={isConfirmingAdd}
              >
                {isConfirmingAdd ? "저장 중" : isEditMode ? "수정" : "추가"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

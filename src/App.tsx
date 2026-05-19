import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { CategoryCard } from "./components/CategoryCard";
import { CategoryDetail } from "./components/CategoryDetail";
import { ExpenseForm } from "./components/ExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { PasswordUpdatePanel } from "./components/PasswordUpdatePanel";
import { ProfileNameDialog } from "./components/ProfileNameDialog";
import { SplitRequestNotificationDialog } from "./components/SplitRequestNotificationDialog";
import { SummaryCard } from "./components/SummaryCard";
import { STORAGE_KEY } from "./constants";
import {
  EXPENSE_SELECT_COLUMNS,
  PROFILE_SELECT_COLUMNS,
  ProfileRow,
  isSupabaseConfigured,
  mapExpenseRow,
  mapProfileRow,
  SPLIT_REQUEST_RECIPIENT_SELECT_COLUMNS,
  SPLIT_REQUEST_SELECT_COLUMNS,
  SplitRequestRecipientRow,
  SplitRequestRow,
  supabase,
} from "./lib/supabase";
import type {
  CategoryKey,
  Expense,
  ExpenseInput,
  ProfileSummary,
  ReceivedSplitRequest,
  SentSplitRequest,
  SentSplitRecipient,
} from "./types";
import { getPointSummary } from "./utils/calculations";
import { getEmailLocalPart, isCompanyEmail, normalizeEmail } from "./utils/companyEmail";
import asoosoftLogo from "./assets/asoosoft-logo.svg";

const loadLocalExpenses = (): Expense[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Expense[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 이전 로컬 데이터가 깨져 있어도 로그인 화면은 정상 진입할 수 있게 둔다.
    return [];
  }
};

const HIDDEN_SENT_SPLIT_REQUESTS_KEY = "welfare-point-hidden-sent-split-requests";

const getHiddenSentSplitRequestsKey = (userId: string) =>
  `${HIDDEN_SENT_SPLIT_REQUESTS_KEY}:${userId}`;

const loadHiddenSentSplitRequestIds = (userId: string) => {
  const raw = localStorage.getItem(getHiddenSentSplitRequestsKey(userId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((requestId): requestId is string => typeof requestId === "string")
      : [];
  } catch {
    return [];
  }
};

const saveHiddenSentSplitRequestIds = (userId: string, requestIds: string[]) => {
  localStorage.setItem(getHiddenSentSplitRequestsKey(userId), JSON.stringify(requestIds));
};

const getSyncErrorMessage = (fallback: string, error: unknown) =>
  error instanceof Error ? error.message : fallback;

const isPasswordRecoveryUrl = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";
};

const getSessionDisplayName = (activeSession: Session | null) => {
  const metadata = activeSession?.user.user_metadata;
  const displayName =
    typeof metadata?.display_name === "string"
      ? metadata.display_name
      : typeof metadata?.name === "string"
        ? metadata.name
        : "";

  return displayName.trim();
};

const shouldAskProfileName = (profile: ProfileRow | null, email: string) => {
  const displayName = profile?.display_name?.trim() ?? "";

  return !displayName || displayName === getEmailLocalPart(email);
};

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isExpensesLoading, setIsExpensesLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncErrorMessage, setSyncErrorMessage] = useState("");
  const [localBackupCount, setLocalBackupCount] = useState(() => loadLocalExpenses().length);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isPasswordRecoveryUrl);
  const [splitRequests, setSplitRequests] = useState<ReceivedSplitRequest[]>([]);
  const [isSplitRequestsLoading, setIsSplitRequestsLoading] = useState(false);
  const [sentSplitRequests, setSentSplitRequests] = useState<SentSplitRequest[]>([]);
  const [isSentSplitRequestsLoading, setIsSentSplitRequestsLoading] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<ProfileRow | null>(null);
  const [profileDirectory, setProfileDirectory] = useState<ProfileSummary[]>([]);
  const [isProfileNameSaving, setIsProfileNameSaving] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [hiddenSentSplitRequestIds, setHiddenSentSplitRequestIds] = useState<string[]>([]);

  const userId = session?.user.id ?? null;
  const userEmail = session?.user.email ?? "";
  const sessionDisplayName = getSessionDisplayName(session);
  const isProfileNameRequired = Boolean(
    session &&
      !isPasswordRecovery &&
      currentProfile &&
      shouldAskProfileName(currentProfile, userEmail),
  );

  const pointSummary = useMemo(() => getPointSummary(expenses), [expenses]);
  const selectedCategorySummary = useMemo(
    () =>
      pointSummary.categorySummaries.find((summary) => summary.key === selectedCategory) ?? null,
    [pointSummary.categorySummaries, selectedCategory],
  );

  const pendingRequestCount = splitRequests.length;
  const hiddenSentSplitRequestIdSet = useMemo(
    () => new Set(hiddenSentSplitRequestIds),
    [hiddenSentSplitRequestIds],
  );

  useEffect(() => {
    if (!syncMessage && !syncErrorMessage) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setSyncMessage("");
        setSyncErrorMessage("");
      },
      syncErrorMessage ? 6000 : 3500,
    );

    return () => window.clearTimeout(timer);
  }, [syncMessage, syncErrorMessage]);

  useLayoutEffect(() => {
    if (!isExpenseFormOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpenseFormOpen(false);
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
  }, [isExpenseFormOpen]);

  const fetchExpenses = useCallback(async (currentUserId: string) => {
    setIsExpensesLoading(true);
    setSyncErrorMessage("");

    const { data, error } = await supabase
      .from("expenses")
      .select(EXPENSE_SELECT_COLUMNS)
      .eq("user_id", currentUserId);

    setIsExpensesLoading(false);

    if (error) {
      throw error;
    }

    setExpenses((data ?? []).map(mapExpenseRow));
  }, []);

  const syncProfile = useCallback(
    async (currentUserId: string, email: string, displayName = "") => {
      const normalizedEmail = normalizeEmail(email);
      const nextDisplayName = displayName.trim();

      if (!normalizedEmail) {
        return null;
      }

      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_COLUMNS)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingProfile) {
        const updatePayload: { email: string; display_name?: string } = {
          email: normalizedEmail,
        };

        if (nextDisplayName) {
          updatePayload.display_name = nextDisplayName;
        }

        const { data, error } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("user_id", currentUserId)
          .select(PROFILE_SELECT_COLUMNS)
          .single();

        if (error) {
          throw error;
        }

        setCurrentProfile(data as ProfileRow);
        return data as ProfileRow;
      }

      const { data, error } = await supabase
        .from("profiles")
        .insert({
          user_id: currentUserId,
          email: normalizedEmail,
          display_name: nextDisplayName || null,
        })
        .select(PROFILE_SELECT_COLUMNS)
        .single();

      if (error) {
        throw error;
      }

      setCurrentProfile(data as ProfileRow);
      return data as ProfileRow;
    },
    [],
  );

  const fetchProfileDirectory = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_COLUMNS)
      .order("display_name", { ascending: true, nullsFirst: false });

    if (error) {
      throw error;
    }

    setProfileDirectory(((data ?? []) as ProfileRow[]).map(mapProfileRow));
  }, []);

  const fetchReceivedSplitRequests = useCallback(
    async (currentUserId: string, options: { silent?: boolean } = {}) => {
      const shouldShowLoading = !options.silent;

      if (shouldShowLoading) {
        setIsSplitRequestsLoading(true);
      }

      try {
        const { data: recipientRows, error: recipientsError } = await supabase
          .from("split_request_recipients")
          .select(SPLIT_REQUEST_RECIPIENT_SELECT_COLUMNS)
          .eq("recipient_id", currentUserId)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (recipientsError) {
          throw recipientsError;
        }

        const recipients = (recipientRows ?? []) as SplitRequestRecipientRow[];
        const requestIds = recipients.map((recipient) => recipient.request_id);

        if (requestIds.length === 0) {
          setSplitRequests([]);
          return;
        }

        const { data: requestRows, error: requestsError } = await supabase
          .from("split_requests")
          .select(SPLIT_REQUEST_SELECT_COLUMNS)
          .in("id", requestIds);

        if (requestsError) {
          throw requestsError;
        }

        const requests = (requestRows ?? []) as SplitRequestRow[];
        if (requests.length === 0) {
          setSplitRequests([]);
          return;
        }

        const requesterIds = Array.from(new Set(requests.map((request) => request.requester_id)));
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select(PROFILE_SELECT_COLUMNS)
          .in("user_id", requesterIds);

        if (profilesError) {
          throw profilesError;
        }

        const requestMap = new Map(requests.map((request) => [request.id, request]));
        const profileMap = new Map(
          ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.user_id, profile]),
        );

        setSplitRequests(
          recipients
            .map((recipient) => {
              const request = requestMap.get(recipient.request_id);
              if (!request) {
                return null;
              }

              const requesterProfile = profileMap.get(request.requester_id);
              const requesterEmail = requesterProfile?.email ?? "";

              return {
                recipientId: recipient.id,
                requestId: request.id,
                requesterName:
                  requesterProfile?.display_name?.trim() ||
                  (requesterEmail ? getEmailLocalPart(requesterEmail) : "알 수 없는 요청자"),
                requesterEmail: requesterEmail || "알 수 없는 요청자",
                category: request.category,
                totalAmount: request.total_amount,
                perPersonAmount: request.per_person_amount,
                participantCount: request.participant_count,
                memo: request.memo ?? "",
                date: request.date,
                createdAt: request.created_at,
              };
            })
            .filter((request): request is ReceivedSplitRequest => Boolean(request)),
        );
      } finally {
        if (shouldShowLoading) {
          setIsSplitRequestsLoading(false);
        }
      }
    },
    [],
  );

  const fetchSentSplitRequests = useCallback(
    async (currentUserId: string, options: { silent?: boolean } = {}) => {
      const shouldShowLoading = !options.silent;

      if (shouldShowLoading) {
        setIsSentSplitRequestsLoading(true);
      }

      try {
        const { data: requestRows, error: requestsError } = await supabase
          .from("split_requests")
          .select(SPLIT_REQUEST_SELECT_COLUMNS)
          .eq("requester_id", currentUserId)
          .order("created_at", { ascending: false });

        if (requestsError) {
          throw requestsError;
        }

        const requests = ((requestRows ?? []) as SplitRequestRow[]).filter(
          (request) => !hiddenSentSplitRequestIdSet.has(request.id),
        );
        const requestIds = requests.map((request) => request.id);

        if (requestIds.length === 0) {
          setSentSplitRequests([]);
          return;
        }

        const { data: recipientRows, error: recipientsError } = await supabase
          .from("split_request_recipients")
          .select(SPLIT_REQUEST_RECIPIENT_SELECT_COLUMNS)
          .in("request_id", requestIds)
          .order("created_at", { ascending: true });

        if (recipientsError) {
          throw recipientsError;
        }

        const recipients = (recipientRows ?? []) as SplitRequestRecipientRow[];
        const recipientIds = Array.from(new Set(recipients.map((recipient) => recipient.recipient_id)));
        const { data: profileRows, error: profilesError } =
          recipientIds.length > 0
            ? await supabase
                .from("profiles")
                .select(PROFILE_SELECT_COLUMNS)
                .in("user_id", recipientIds)
            : { data: [], error: null };

        if (profilesError) {
          throw profilesError;
        }

        const profileMap = new Map(
          ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.user_id, profile]),
        );
        const recipientsByRequestId = recipients.reduce(
          (map, recipient) => {
            const currentRecipients = map.get(recipient.request_id) ?? [];
            currentRecipients.push(recipient);
            map.set(recipient.request_id, currentRecipients);
            return map;
          },
          new Map<string, SplitRequestRecipientRow[]>(),
        );

        setSentSplitRequests(
          requests.map((request) => {
            const requestRecipients: SentSplitRecipient[] =
              recipientsByRequestId.get(request.id)?.map((recipient) => {
                const profile = profileMap.get(recipient.recipient_id);
                const email = profile?.email ?? "";

                return {
                  userId: recipient.recipient_id,
                  email: email || "알 수 없는 동료",
                  displayName:
                    profile?.display_name?.trim() ||
                    (email ? getEmailLocalPart(email) : "알 수 없는 동료"),
                  recipientRowId: recipient.id,
                  amount: recipient.amount,
                  status: recipient.status,
                  respondedAt: recipient.responded_at,
                };
              }) ?? [];

            return {
              requestId: request.id,
              category: request.category,
              totalAmount: request.total_amount,
              perPersonAmount: request.per_person_amount,
              participantCount: request.participant_count,
              memo: request.memo ?? "",
              date: request.date,
              requesterExpenseId: request.requester_expense_id,
              createdAt: request.created_at,
              recipients: requestRecipients,
            };
          }),
        );
      } finally {
        if (shouldShowLoading) {
          setIsSentSplitRequestsLoading(false);
        }
      }
    },
    [hiddenSentSplitRequestIdSet],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setIsPasswordRecovery(Boolean(data.session) && isPasswordRecoveryUrl());
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }

      if (!nextSession) {
        setExpenses([]);
        setSplitRequests([]);
        setSentSplitRequests([]);
        setCurrentProfile(null);
        setProfileDirectory([]);
        setSelectedCategory(null);
        setIsPasswordRecovery(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setHiddenSentSplitRequestIds(userId ? loadHiddenSentSplitRequestIds(userId) : []);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    fetchExpenses(userId).catch((error) => {
      setIsExpensesLoading(false);
      setSyncErrorMessage(getSyncErrorMessage("사용 내역을 불러오지 못했습니다.", error));
    });
  }, [fetchExpenses, userId]);

  useEffect(() => {
    if (!userId || !userEmail) {
      return;
    }

    syncProfile(userId, userEmail, sessionDisplayName)
      .then(() => fetchProfileDirectory())
      .catch((error) => {
        setSyncErrorMessage(getSyncErrorMessage("프로필을 동기화하지 못했습니다.", error));
      });
  }, [fetchProfileDirectory, sessionDisplayName, syncProfile, userEmail, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadSplitRequests = (silent = false) => {
      fetchReceivedSplitRequests(userId, { silent }).catch((error) => {
        setIsSplitRequestsLoading(false);
        setSyncErrorMessage(getSyncErrorMessage("1/N 요청을 불러오지 못했습니다.", error));
      });
      fetchSentSplitRequests(userId, { silent }).catch((error) => {
        setIsSentSplitRequestsLoading(false);
        setSyncErrorMessage(getSyncErrorMessage("보낸 1/N 요청을 불러오지 못했습니다.", error));
      });
    };

    loadSplitRequests();
    const channel = supabase
      .channel(`split-request-recipients:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "split_request_recipients",
        },
        () => loadSplitRequests(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "split_requests",
          filter: `requester_id=eq.${userId}`,
        },
        () => loadSplitRequests(true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchReceivedSplitRequests, fetchSentSplitRequests, userId]);

  const addExpense = async (expense: ExpenseInput) => {
    if (!userId) {
      setSyncErrorMessage("로그인이 필요합니다.");
      return false;
    }

    const splitRecipients = Array.from(
      new Map(
        (expense.split?.recipients ?? [])
          .filter((recipient) => recipient.userId !== userId)
          .map((recipient) => [recipient.userId, recipient]),
      ).values(),
    );

    if (expense.split && splitRecipients.length === 0) {
      setSyncMessage("");
      setSyncErrorMessage("1/N 요청을 받을 동료를 입력해주세요.");
      return false;
    }

    if (splitRecipients.length > 0) {
      try {
        await syncProfile(userId, userEmail, sessionDisplayName);
      } catch (error) {
        setSyncMessage("");
        setSyncErrorMessage(getSyncErrorMessage("프로필을 동기화하지 못했습니다.", error));
        return false;
      }

      const invalidEmails = splitRecipients
        .map((recipient) => recipient.email)
        .filter((email) => !isCompanyEmail(email));
      if (invalidEmails.length > 0) {
        setSyncMessage("");
        setSyncErrorMessage("@asoosoft.net 회사 이메일만 요청할 수 있어요.");
        return false;
      }

      const participantCount = splitRecipients.length + 1;
      if (expense.amount % participantCount !== 0) {
        setSyncMessage("");
        setSyncErrorMessage(`${participantCount}명으로 나누어떨어지는 금액을 입력해주세요.`);
        return false;
      }

      const perPersonAmount = expense.amount / participantCount;
      const recipientIds = splitRecipients.map((recipient) => recipient.userId);
      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_COLUMNS)
        .in("user_id", recipientIds);

      if (profilesError) {
        setSyncMessage("");
        setSyncErrorMessage(getSyncErrorMessage("동료 정보를 찾지 못했습니다.", profilesError));
        return false;
      }

      const profiles = (profileRows ?? []) as ProfileRow[];
      const foundUserIdSet = new Set(profiles.map((profile) => profile.user_id));
      const missingRecipients = splitRecipients.filter(
        (recipient) => !foundUserIdSet.has(recipient.userId),
      );

      if (missingRecipients.length > 0) {
        setSyncMessage("");
        setSyncErrorMessage(
          `가입한 동료만 요청할 수 있어요: ${missingRecipients
            .map((recipient) => recipient.displayName)
            .join(", ")}`,
        );
        return false;
      }

      const { data: requestRow, error: requestError } = await supabase
        .from("split_requests")
        .insert({
          requester_id: userId,
          category: expense.category,
          total_amount: expense.amount,
          per_person_amount: perPersonAmount,
          participant_count: participantCount,
          memo: expense.memo,
          date: expense.date,
        })
        .select(SPLIT_REQUEST_SELECT_COLUMNS)
        .single();

      if (requestError) {
        setSyncMessage("");
        setSyncErrorMessage(getSyncErrorMessage("1/N 요청을 만들지 못했습니다.", requestError));
        return false;
      }

      const request = requestRow as SplitRequestRow;
      const cleanupSplitRequest = async () => {
        await supabase
          .from("split_requests")
          .delete()
          .eq("id", request.id)
          .eq("requester_id", userId);
      };

      const { error: recipientsError } = await supabase
        .from("split_request_recipients")
        .insert(
          profiles.map((profile) => ({
            request_id: request.id,
            recipient_id: profile.user_id,
            amount: perPersonAmount,
          })),
        );

      if (recipientsError) {
        await cleanupSplitRequest();
        setSyncMessage("");
        setSyncErrorMessage(getSyncErrorMessage("1/N 요청 대상을 저장하지 못했습니다.", recipientsError));
        return false;
      }

      const requesterLabel =
        currentProfile?.display_name?.trim() || getEmailLocalPart(userEmail) || userEmail;
      const ownMemo = expense.memo
        ? `${expense.memo} (${requesterLabel} 1/N)`
        : `${requesterLabel} 1/N`;
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: userId,
          category: expense.category,
          amount: perPersonAmount,
          memo: ownMemo,
          date: expense.date,
        })
        .select(EXPENSE_SELECT_COLUMNS)
        .single();

      if (error) {
        await cleanupSplitRequest();
        setSyncMessage("");
        setSyncErrorMessage(getSyncErrorMessage("내 1/N 사용 내역을 저장하지 못했습니다.", error));
        return false;
      }

      await supabase
        .from("split_requests")
        .update({
          requester_expense_id: data.id,
        })
        .eq("id", request.id)
        .eq("requester_id", userId);

      setExpenses((currentExpenses) => [...currentExpenses, mapExpenseRow(data)]);
      void fetchSentSplitRequests(userId, { silent: true });
      setSyncErrorMessage("");
      setSyncMessage(
        `1/N 요청을 보냈습니다. 나 포함 ${participantCount}명, 1인 ${perPersonAmount.toLocaleString()}원입니다.`,
      );
      return true;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        category: expense.category,
        amount: expense.amount,
        memo: expense.memo,
        date: expense.date,
      })
      .select(EXPENSE_SELECT_COLUMNS)
      .single();

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("사용 내역을 저장하지 못했습니다.", error));
      return false;
    }

    setExpenses((currentExpenses) => [...currentExpenses, mapExpenseRow(data)]);
    setSyncErrorMessage("");
    setSyncMessage("사용 내역을 저장했습니다.");
    return true;
  };

  const deleteExpense = async (id: string) => {
    if (!userId) {
      return false;
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("사용 내역을 삭제하지 못했습니다.", error));
      return false;
    }

    setExpenses((currentExpenses) => currentExpenses.filter((expense) => expense.id !== id));
    setSyncErrorMessage("");
    setSyncMessage("사용 내역을 삭제했습니다.");
    return true;
  };

  const updateExpense = async (updatedExpense: Expense) => {
    if (!userId) {
      setSyncErrorMessage("로그인이 필요합니다.");
      return false;
    }

    const { data, error } = await supabase
      .from("expenses")
      .update({
        category: updatedExpense.category,
        amount: updatedExpense.amount,
        memo: updatedExpense.memo,
        date: updatedExpense.date,
      })
      .eq("id", updatedExpense.id)
      .eq("user_id", userId)
      .select(EXPENSE_SELECT_COLUMNS)
      .single();

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("사용 내역을 수정하지 못했습니다.", error));
      return false;
    }

    setExpenses((currentExpenses) =>
      currentExpenses.map((expense) =>
        expense.id === updatedExpense.id ? mapExpenseRow(data) : expense,
      ),
    );
    setSyncErrorMessage("");
    setSyncMessage("사용 내역을 수정했습니다.");
    return true;
  };

  const replaceExpenses = async (nextExpenses: Expense[]) => {
    if (!userId) {
      setSyncErrorMessage("로그인이 필요합니다.");
      return false;
    }

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("기존 사용 내역을 정리하지 못했습니다.", deleteError));
      return false;
    }

    if (nextExpenses.length === 0) {
      setExpenses([]);
      setSyncErrorMessage("");
      setSyncMessage("사용 내역을 초기화했습니다.");
      return true;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert(
        nextExpenses.map((expense) => ({
          user_id: userId,
          category: expense.category,
          amount: expense.amount,
          memo: expense.memo,
          date: expense.date,
        })),
      )
      .select(EXPENSE_SELECT_COLUMNS);

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("CSV 데이터를 불러오지 못했습니다.", error));
      return false;
    }

    setExpenses((data ?? []).map(mapExpenseRow));
    setSyncErrorMessage("");
    setSyncMessage(`${nextExpenses.length}건을 불러왔습니다.`);
    return true;
  };

  const importExpenses = (importedExpenses: Expense[]) => replaceExpenses(importedExpenses);

  const resetExpenses = () => replaceExpenses([]);

  const acceptSplitRequest = async (request: ReceivedSplitRequest) => {
    if (!userId) {
      setSyncErrorMessage("로그인이 필요합니다.");
      return false;
    }

    const respondedAt = new Date().toISOString();
    const { data: updatedRecipient, error: statusError } = await supabase
      .from("split_request_recipients")
      .update({
        status: "accepted",
        responded_at: respondedAt,
      })
      .eq("id", request.recipientId)
      .eq("recipient_id", userId)
      .eq("status", "pending")
      .select(SPLIT_REQUEST_RECIPIENT_SELECT_COLUMNS)
      .maybeSingle();

    if (statusError || !updatedRecipient) {
      setSyncMessage("");
      setSyncErrorMessage(
        getSyncErrorMessage("1/N 요청을 수락하지 못했습니다.", statusError),
      );
      return false;
    }

    const requesterLabel =
      request.requesterName.trim() ||
      (request.requesterEmail ? getEmailLocalPart(request.requesterEmail) : "요청자");
    const requestMemo = request.memo
      ? `${request.memo} (${requesterLabel} 1/N)`
      : `${requesterLabel} 1/N`;
    const { data: expenseRow, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        category: request.category,
        amount: request.perPersonAmount,
        memo: requestMemo,
        date: request.date,
      })
      .select(EXPENSE_SELECT_COLUMNS)
      .single();

    if (expenseError) {
      await supabase
        .from("split_request_recipients")
        .update({
          status: "pending",
          responded_at: null,
        })
        .eq("id", request.recipientId)
        .eq("recipient_id", userId);
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("사용 내역을 추가하지 못했습니다.", expenseError));
      return false;
    }

    await supabase
      .from("split_request_recipients")
      .update({
        accepted_expense_id: expenseRow.id,
      })
      .eq("id", request.recipientId)
      .eq("recipient_id", userId);

    setExpenses((currentExpenses) => [...currentExpenses, mapExpenseRow(expenseRow)]);
    setSplitRequests((currentRequests) =>
      currentRequests.filter((currentRequest) => currentRequest.recipientId !== request.recipientId),
    );
    setSyncErrorMessage("");
    setSyncMessage("1/N 요청을 수락하고 사용 내역에 추가했습니다.");
    return true;
  };

  const rejectSplitRequest = async (request: ReceivedSplitRequest) => {
    if (!userId) {
      setSyncErrorMessage("로그인이 필요합니다.");
      return false;
    }

    const { error } = await supabase
      .from("split_request_recipients")
      .update({
        status: "rejected",
        responded_at: new Date().toISOString(),
      })
      .eq("id", request.recipientId)
      .eq("recipient_id", userId)
      .eq("status", "pending");

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("1/N 요청을 거절하지 못했습니다.", error));
      return false;
    }

    setSplitRequests((currentRequests) =>
      currentRequests.filter((currentRequest) => currentRequest.recipientId !== request.recipientId),
    );
    setSyncErrorMessage("");
    setSyncMessage("1/N 요청을 거절했습니다.");
    return true;
  };

  const cancelSentSplitRequest = async (request: SentSplitRequest) => {
    if (!userId) {
      setSyncErrorMessage("로그인이 필요합니다.");
      return false;
    }

    const acceptedCount = request.recipients.filter(
      (recipient) => recipient.status === "accepted",
    ).length;

    if (acceptedCount > 0) {
      setSyncMessage("");
      setSyncErrorMessage("이미 수락한 동료가 있는 1/N 요청은 취소할 수 없습니다.");
      return false;
    }

    const { error: requestError } = await supabase
      .from("split_requests")
      .delete()
      .eq("id", request.requestId)
      .eq("requester_id", userId);

    if (requestError) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("1/N 요청을 취소하지 못했습니다.", requestError));
      return false;
    }

    if (request.requesterExpenseId) {
      const { error: expenseError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", request.requesterExpenseId)
        .eq("user_id", userId);

      if (expenseError) {
        setSyncMessage("");
        setSyncErrorMessage(
          getSyncErrorMessage("1/N 요청은 취소했지만 내 사용 내역을 삭제하지 못했습니다.", expenseError),
        );
        void fetchSentSplitRequests(userId, { silent: true });
        return false;
      }

      setExpenses((currentExpenses) =>
        currentExpenses.filter((expense) => expense.id !== request.requesterExpenseId),
      );
    }

    setSentSplitRequests((currentRequests) =>
      currentRequests.filter((currentRequest) => currentRequest.requestId !== request.requestId),
    );
    setSyncErrorMessage("");
    setSyncMessage("보낸 1/N 요청을 취소했습니다.");
    return true;
  };

  const dismissSentSplitRequest = (request: SentSplitRequest) => {
    if (!userId) {
      return;
    }

    setHiddenSentSplitRequestIds((currentIds) => {
      const nextIds = currentIds.includes(request.requestId)
        ? currentIds
        : [...currentIds, request.requestId];
      saveHiddenSentSplitRequestIds(userId, nextIds);
      return nextIds;
    });
    setSentSplitRequests((currentRequests) =>
      currentRequests.filter((currentRequest) => currentRequest.requestId !== request.requestId),
    );
    setSyncErrorMessage("");
    setSyncMessage("보낸 요청을 목록에서 숨겼습니다.");
  };

  const saveProfileName = async (displayName: string) => {
    if (!userId || !userEmail) {
      setSyncErrorMessage("로그인이 필요합니다.");
      return false;
    }

    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) {
      setSyncErrorMessage("이름을 입력해주세요.");
      return false;
    }

    setIsProfileNameSaving(true);
    try {
      const profile = await syncProfile(userId, userEmail, nextDisplayName);
      await supabase.auth.updateUser({
        data: {
          display_name: nextDisplayName,
        },
      });

      if (profile) {
        setCurrentProfile(profile);
      }

      await fetchProfileDirectory();
      setSyncErrorMessage("");
      setSyncMessage("이름을 저장했습니다.");
      return true;
    } catch (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("이름을 저장하지 못했습니다.", error));
      return false;
    } finally {
      setIsProfileNameSaving(false);
    }
  };

  const migrateLocalExpenses = async () => {
    if (!userId) {
      return;
    }

    const localExpenses = loadLocalExpenses();
    if (localExpenses.length === 0) {
      setLocalBackupCount(0);
      return;
    }

    const shouldMigrate = window.confirm(
      `이 브라우저에 남아 있는 로컬 데이터 ${localExpenses.length}건을 현재 계정으로 가져올까요?`,
    );

    if (!shouldMigrate) {
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert(
        localExpenses.map((expense) => ({
          user_id: userId,
          category: expense.category,
          amount: expense.amount,
          memo: expense.memo,
          date: expense.date,
        })),
      )
      .select(EXPENSE_SELECT_COLUMNS);

    if (error) {
      setSyncMessage("");
      setSyncErrorMessage(getSyncErrorMessage("로컬 데이터를 가져오지 못했습니다.", error));
      return;
    }

    setExpenses((currentExpenses) => [
      ...currentExpenses,
      ...(data ?? []).map(mapExpenseRow),
    ]);
    localStorage.removeItem(STORAGE_KEY);
    setLocalBackupCount(0);
    setSyncErrorMessage("");
    setSyncMessage(`${localExpenses.length}건의 로컬 데이터를 가져왔습니다.`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const renderHeaderActions = () => {
    if (!session) {
      return <div className="header-chip">로그인 필요</div>;
    }

    const displayName = currentProfile?.display_name?.trim();
    const headerLabel =
      displayName && displayName !== getEmailLocalPart(userEmail)
        ? `${displayName} · ${userEmail}`
        : userEmail;

    return (
      <div className="header-action-stack">
        <div className="header-actions">
          <span className="header-chip user-chip" title={userEmail}>
            {headerLabel}
          </span>
          <button
            className={`notification-button ${pendingRequestCount > 0 ? "has-alert" : ""}`}
            type="button"
            onClick={() => setIsNotificationDialogOpen(true)}
            aria-label={
              pendingRequestCount > 0
                ? `받은 1/N 요청 ${pendingRequestCount}건 확인`
                : "1/N 요청 알림 확인"
            }
            title={
              pendingRequestCount > 0
                ? `받은 1/N 요청이 ${pendingRequestCount}건 있습니다.`
                : "새로 받은 1/N 요청이 없습니다."
            }
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path
                d="M18 9.5a6 6 0 0 0-12 0c0 6-2.5 7-2.5 7h17S18 15.5 18 9.5Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M9.5 20a2.8 2.8 0 0 0 5 0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
            {pendingRequestCount > 0 && (
              <span className="notification-count-badge">
                {pendingRequestCount > 99 ? "99+" : pendingRequestCount}
              </span>
            )}
          </button>
          <button className="secondary-button" type="button" onClick={signOut}>
            로그아웃
          </button>
        </div>
        <div className="header-quick-actions">
          <a
            className="approval-shortcut"
            href="https://office.hiworks.com/asoosoft.onhiworks.com/approval/document/box/all"
            target="_blank"
            rel="noreferrer"
        >
          하이웍스 전자결재 바로가기
        </a>
        </div>
      </div>
    );
  };

  if (isAuthLoading) {
    return (
      <main className="app-shell">
        <header className="app-header">
          <div className="brand-heading">
            <img className="brand-logo" src={asoosoftLogo} alt="AsooSoft" />
            <h1 className="sr-only">AsooSoft Welfare Points</h1>
            <p className="header-description">계정 정보를 확인하고 있습니다.</p>
          </div>
        </header>
        <div className="empty-state">잠시만 기다려주세요.</div>
      </main>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="app-shell">
        <header className="app-header">
          <div className="brand-heading">
            <img className="brand-logo" src={asoosoftLogo} alt="AsooSoft" />
            <h1 className="sr-only">AsooSoft Welfare Points</h1>
            <p className="header-description">Supabase 연결 정보가 필요합니다.</p>
          </div>
        </header>
        <div className="empty-state">
          VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정한 뒤 다시 실행해주세요.
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-heading">
          <img className="brand-logo" src={asoosoftLogo} alt="AsooSoft" />
          <h1 className="sr-only">AsooSoft Welfare Points</h1>
          <p className="header-description">복지 포인트 사용 내역을 간편하게 관리하세요.</p>
        </div>
        {renderHeaderActions()}
      </header>

      {!session ? (
        <AuthPanel />
      ) : isPasswordRecovery ? (
        <PasswordUpdatePanel onComplete={() => setIsPasswordRecovery(false)} />
      ) : (
        <>
          {(syncMessage || syncErrorMessage || localBackupCount > 0) && (
            <div className="toast-stack" aria-live="polite">
              {syncMessage && (
                <div className="toast-message is-success">
                  <p>{syncMessage}</p>
                </div>
              )}
              {syncErrorMessage && (
                <div className="toast-message is-danger">
                  <p>{syncErrorMessage}</p>
                </div>
              )}
              {localBackupCount > 0 && (
                <div className="toast-message is-action">
                  <p>기존 로컬 데이터 {localBackupCount}건이 있습니다.</p>
                  <button className="secondary-button" type="button" onClick={migrateLocalExpenses}>
                    가져오기
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="dashboard-stack">
            <SummaryCard
              totalUsed={pointSummary.totalUsed}
              totalRemaining={pointSummary.totalRemaining}
              totalUsageRate={pointSummary.totalUsageRate}
              isTotalExceeded={pointSummary.isTotalExceeded}
            />

            <section className="category-section" aria-label="항목별 포인트 현황">
              <div className="section-title compact">
                <div>
                  <h2>항목별 한도</h2>
                  <p className="section-subtitle">600,000원 기준</p>
                </div>
              </div>

              <section className="category-grid" aria-label="항목별 포인트 카드">
                {pointSummary.categorySummaries.map((summary) => (
                  <CategoryCard
                    key={summary.key}
                    summary={summary}
                    isSelected={selectedCategory === summary.key}
                    onSelect={() =>
                      setSelectedCategory((currentCategory) =>
                        currentCategory === summary.key ? null : summary.key,
                      )
                    }
                  />
                ))}
              </section>
            </section>
          </div>

          <section className="history-section">
            {isExpensesLoading ? (
              <div className="empty-state">사용 내역을 불러오는 중입니다.</div>
            ) : (
              <ExpenseList
                expenses={expenses}
                onDeleteExpense={deleteExpense}
                onImportExpenses={importExpenses}
                onReset={resetExpenses}
                onUpdateExpense={updateExpense}
              />
            )}
          </section>

          {!isExpenseFormOpen && !isNotificationDialogOpen && (
            <button
              className="floating-add-button"
              type="button"
              onClick={() => setIsExpenseFormOpen(true)}
              aria-label="사용 내역 추가"
              title="사용 내역 추가"
            >
              +
            </button>
          )}

          {isExpenseFormOpen && (
            <div
              className="modal-backdrop add-expense-backdrop"
              role="presentation"
              onMouseDown={() => setIsExpenseFormOpen(false)}
            >
              <div
                className="expense-form-modal"
                role="dialog"
                aria-label="사용 내역 추가"
                aria-modal="true"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <ExpenseForm
                  currentUserId={userId ?? ""}
                  currentUserEmail={userEmail}
                  expenses={expenses}
                  isModal
                  profiles={profileDirectory}
                  onRefreshProfiles={fetchProfileDirectory}
                  onAddExpense={addExpense}
                  onClose={() => setIsExpenseFormOpen(false)}
                  onSaved={() => setIsExpenseFormOpen(false)}
                />
              </div>
            </div>
          )}

          {isNotificationDialogOpen && (
            <SplitRequestNotificationDialog
              isLoading={isSplitRequestsLoading}
              requests={splitRequests}
              onAccept={acceptSplitRequest}
              onClose={() => setIsNotificationDialogOpen(false)}
              onReject={rejectSplitRequest}
            />
          )}

          {selectedCategorySummary && (
            <CategoryDetail
              summary={selectedCategorySummary}
              expenses={expenses}
              onClose={() => setSelectedCategory(null)}
            />
          )}

          {isProfileNameRequired && (
            <ProfileNameDialog
              email={userEmail}
              initialName={currentProfile?.display_name?.trim() ?? ""}
              isSaving={isProfileNameSaving}
              onSave={saveProfileName}
            />
          )}
        </>
      )}
    </main>
  );
}

export default App;

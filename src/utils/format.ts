export const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;

export const formatNumber = (value: number) => value.toLocaleString("ko-KR");

export const parseAmountInput = (value: string) => {
  const onlyDigits = value.replace(/[^\d]/g, "");
  return onlyDigits ? Number(onlyDigits) : 0;
};

export const getTodayISO = () => new Date().toISOString().slice(0, 10);

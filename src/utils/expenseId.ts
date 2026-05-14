export const createExpenseId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${Date.now()}-${crypto.randomUUID()}`;
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

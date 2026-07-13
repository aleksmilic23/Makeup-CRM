// Payment details shown on invoices. Sourced from .env.local (git-ignored) rather
// than a committed file, since these are bank account/routing numbers.
// Only import this from server components / route handlers — never expose it to the client.
export const paymentInfo = {
  bankName: process.env.BANK_NAME ?? "",
  accountName: process.env.BANK_ACCOUNT_NAME ?? "",
  accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "",
  routingNumber: process.env.BANK_ROUTING_NUMBER ?? "",
  otherMethods: process.env.PAYMENT_OTHER_METHODS ?? "",
};

export function hasPaymentInfo(): boolean {
  return Boolean(
    paymentInfo.bankName ||
      paymentInfo.accountNumber ||
      paymentInfo.otherMethods
  );
}

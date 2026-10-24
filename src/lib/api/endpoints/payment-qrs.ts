import type { Http } from "../http";
import type { PaymentQr, PaymentQrInput } from "../types";

export const paymentQrs = (http: Http) => ({
  /** any role — phones keep these to show offline; in the order added */
  list: () => http.get<PaymentQr[]>("/payment-qrs"),
  /** OWNER/ADMIN — up to 10 */
  create: (input: PaymentQrInput) =>
    http.post<PaymentQr>("/payment-qrs", input),
  /** OWNER/ADMIN — rename or replace the QR */
  update: (id: string, input: Partial<PaymentQrInput>) =>
    http.patch<PaymentQr>(`/payment-qrs/${id}`, input),
  /** OWNER/ADMIN */
  remove: (id: string) => http.delete<{ id: string }>(`/payment-qrs/${id}`),
});

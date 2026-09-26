import type { PaymentMethod, SaleReceipt } from "@/lib/api/types";
import type { LocalSale } from "@/lib/offline/db";
import { twoDp } from "@/lib/trip/money";

// Everything a receipt shows — built the same way on the phone and the admin side.
export type ReceiptData = {
  code: string;
  issuedAt: string;
  workerName: string;
  buyerName: string;
  chickenCount: number;
  totalKilo: string;
  pricePerKilo: string | null;
  amount: string;
  paymentMethod: PaymentMethod;
};

// From the phone-made id, so the phone (offline) and the server agree on it.
export const receiptCode = (clientId: string) =>
  `MF-${clientId.slice(0, 8).toUpperCase()}`;

// Receipts are the business's papers: always in its own time (Manila), not
// the viewer's, so the phone and an owner abroad print the same time.
const BUSINESS_TIME_ZONE = "Asia/Manila";

// "Sep 26, 2026 · 2:41 PM"
export function receiptDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  });
  const time = d.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  });
  return `${date} · ${time}`;
}

// sale numbers are padded to 2 decimals ("10.5" → "10.50")
export function receiptFromLocalSale(
  sale: LocalSale,
  buyers: Map<string, string>,
  workerName: string,
): ReceiptData {
  return {
    code: receiptCode(sale.clientId),
    issuedAt: sale.createdAtClient,
    workerName,
    // an archived buyer is no longer on the phone
    buyerName: sale.buyerId ? (buyers.get(sale.buyerId) ?? "Buyer") : "Walk-in",
    chickenCount: sale.chickenCount,
    totalKilo: twoDp(sale.totalKilo),
    pricePerKilo: sale.pricePerKilo ? twoDp(sale.pricePerKilo) : null,
    amount: twoDp(sale.amount),
    paymentMethod: sale.paymentMethod,
  };
}

export function receiptFromServer(r: SaleReceipt): ReceiptData {
  return {
    code: receiptCode(r.clientId),
    issuedAt: r.createdAtClient,
    workerName: r.workerName,
    buyerName: r.buyerName ?? "Walk-in",
    chickenCount: r.chickenCount,
    totalKilo: twoDp(r.totalKilo),
    pricePerKilo: r.pricePerKilo ? twoDp(r.pricePerKilo) : null,
    amount: twoDp(r.amount),
    paymentMethod: r.paymentMethod,
  };
}

// one calendar day's sales on this phone, newest first
export function salesOfDay(sales: LocalSale[], day: Date): LocalSale[] {
  const key = day.toDateString();
  return sales
    .filter((s) => new Date(s.createdAtClient).toDateString() === key)
    .sort((a, b) => b.createdAtClient.localeCompare(a.createdAtClient));
}

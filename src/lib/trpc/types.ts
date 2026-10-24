import type { TRPCClient } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";

// Every type the screens use, read off the server's procedures: change the
// server and these follow. Decimals arrive as strings ("60.25"), dates as
// ISO strings, exactly as on the wire.

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
/** what screens and the sync engine call */
export type ApiClient = TRPCClient<AppRouter>;
type I = RouterInputs;
type O = RouterOutputs;

export type {
  ActionType,
  BuyerRequestStatus,
  PaymentMethod,
  Role,
  SyncStatus,
} from "@/server/generated/prisma/enums";
import type { Role } from "@/server/generated/prisma/enums";

// ---- auth (cookies, not tRPC) ----
export type SessionUser = { id: string; name: string; role: Role };
export type Tokens = { accessToken: string; refreshToken: string };
export type { RefreshedTokens } from "@/server/auth/session";

// ---- users ----
export type User = O["users"]["list"][number];
export type CreateUserInput = I["users"]["create"];
export type UpdateUserInput = Omit<I["users"]["update"], "id">;

// ---- price ----
export type Price = NonNullable<O["prices"]["current"]>;

// ---- reference data ----
export type Plantation = O["plantations"]["list"][number];
export type PlantationInput = I["plantations"]["create"];
export type Buyer = O["buyers"]["list"][number];
export type BuyerInput = I["buyers"]["create"];
/** removing a buyer/plantation: deleted when unused, archived when it has history */
export type RemoveResult = O["buyers"]["remove"];

/** waiting new-buyer requests, oldest first (owner/admin) */
export type PendingBuyerRequest = O["buyerRequests"]["pending"][number];
/** the caller's own requests, for the phone */
export type MyBuyerRequest = O["buyerRequests"]["mine"][number];

// ---- payment QR codes ----
export type PaymentQr = O["paymentQrs"]["list"][number];
export type PaymentQrInput = I["paymentQrs"]["create"];

// ---- field records ----
export type Trip = O["trips"]["mine"][number];
export type Pickup = O["pickups"]["list"][number];
export type Sale = O["sales"]["list"][number];
/** buyerName null = walk-in */
export type SaleReceipt = O["sales"]["receipt"];
export type Recount = O["recounts"]["list"][number];
export type Expense = O["expenses"]["mine"][number];
export type ExpenseWithWorker = O["expenses"]["list"][number];
export type ActivityLog = O["activityLogs"]["list"][number];

// ---- create inputs ----
export type CreateTripInput = I["trips"]["start"];
export type EndTripInput = Omit<I["trips"]["end"], "id">;
export type CreatePickupInput = I["pickups"]["create"];
export type CreateSaleInput = I["sales"]["create"];
export type CreateRecountInput = I["recounts"]["create"];
export type CreateExpenseInput = I["expenses"]["create"];
export type CreateActivityLogInput = I["activityLogs"]["create"];

// ---- sync ----
export type SyncBatch = I["sync"]["push"];
export type CreateBuyerRequestInput = NonNullable<
  SyncBatch["buyerRequests"]
>[number];
export type SyncResults = O["sync"]["push"];
export type SyncResult = SyncResults["sales"][number];

// ---- reports ----
/** Calendar days (YYYY-MM-DD) in the report time zone; both ends inclusive; default last 7 days. */
export type ReportRange = NonNullable<I["reports"]["workers"]>;
export type DailyReportQuery = NonNullable<I["reports"]["daily"]>;
export type DailyReport = O["reports"]["daily"];
export type WorkerReport = O["reports"]["workers"];
export type DiscrepancyReport = O["reports"]["discrepancies"];
export type TripDetail = O["reports"]["trip"];
type Day = DailyReport["days"][number];
export type StockSums = Day["pickups"];
export type SaleSums = Day["sales"];
export type ExpenseSums = Day["expenses"];
/** a new buyer a worker typed on a sale, as shown next to the sale */
export type BuyerRequestRef = NonNullable<
  TripDetail["sales"][number]["buyerRequest"]
>;

// ---- owner dashboard ----
export type OpenTrip = O["reports"]["openTrips"][number];
export type TripsPage = O["reports"]["trips"];
export type TripListItem = TripsPage["items"][number];
export type ProblemsPage = O["reports"]["problems"];
export type Problem = ProblemsPage["items"][number];
export type RecountProblem = Extract<Problem, { kind: "recount" }>;
export type SaleProblem = Extract<Problem, { kind: "sale" }>;
export type ProblemKind = Problem["kind"];

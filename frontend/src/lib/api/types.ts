// Mirrors backend/prisma/schema.prisma and the Nest DTOs.
// Decimals arrive as strings ("60.25"); dates as ISO strings.

export type Role = "OWNER" | "ADMIN" | "WORKER";
export type PaymentMethod = "CASH" | "QR";
export type SyncStatus = "SYNCED" | "CONFLICT";
export type ActionType =
  | "PICKUP_STARTED"
  | "SALE_RECORDED"
  | "RECOUNT_PERFORMED"
  | "TRIP_ENDED"
  | "EXPENSE_RECORDED";

type Decimal = string;
type IsoDate = string;
type Ref = { id: string; name: string };

// ---- auth / users ----
export type SessionUser = { id: string; name: string; role: Role };
export type Tokens = { accessToken: string; refreshToken: string };
/** refreshToken is null inside the backend's grace window: keep the current one */
export type RefreshedTokens = {
  accessToken: string;
  refreshToken: string | null;
};
export type LoginResponse = Tokens & { user: SessionUser };
export type LoginInput = { phone: string; password: string };

export type User = {
  id: string;
  name: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: IsoDate;
};
export type RegisterInput = { phone: string; password: string; name: string };
export type CreateUserInput = RegisterInput & { role: Role };

// ---- price ----
export type Price = {
  id: string;
  pricePerKilo: Decimal;
  createdAt: IsoDate;
  setBy: Ref;
};

// ---- reference data ----
export type Plantation = {
  id: string;
  name: string;
  address: string | null;
  createdAt: IsoDate;
};
export type PlantationInput = { name: string; address?: string };

export type Buyer = {
  id: string;
  name: string;
  location: string | null;
  notes: string | null;
  createdAt: IsoDate;
};
export type BuyerInput = { name: string; location?: string; notes?: string };

// ---- field records (all carry an offline-generated clientId) ----
type Synced = {
  id: string;
  clientId: string;
  createdAtClient: IsoDate;
  syncedAt: IsoDate;
};

export type Trip = {
  id: string;
  clientId: string;
  workerId: string;
  startedAt: IsoDate;
  endedAt: IsoDate | null;
  createdAtClient: IsoDate;
  syncedAt: IsoDate;
};
export type Pickup = Synced & {
  tripId: string;
  plantationId: string;
  chickenCount: number;
  totalKilo: Decimal;
};
export type Sale = Synced & {
  tripId: string;
  buyerId: string | null;
  chickenCount: number;
  totalKilo: Decimal;
  amount: Decimal;
  paymentMethod: PaymentMethod;
  /** charged / owner's price the phone had; null on sales from older app versions */
  pricePerKilo: Decimal | null;
  listPricePerKilo: Decimal | null;
  syncStatus: SyncStatus;
  conflictReason: string | null;
};
export type Recount = Synced & {
  tripId: string;
  countedChicken: number;
  countedKilo: Decimal;
  expectedChicken: number;
  expectedKilo: Decimal;
  discrepancyFlagged: boolean;
};
export type Expense = Synced & {
  workerId: string;
  tripId: string | null;
  description: string;
  amount: Decimal;
};
export type ExpenseWithWorker = Expense & { worker: Ref };
export type ActivityLog = Synced & {
  workerId: string;
  tripId: string | null;
  actionType: ActionType;
  payload: Record<string, unknown>;
};

// ---- create inputs ----
type ClientStamp = { clientId: string; createdAtClient: IsoDate };
type Logged = ClientStamp & { activityLogClientId: string };

export type CreateTripInput = ClientStamp & { startedAt: IsoDate };
export type EndTripInput = { endedAt: IsoDate };
export type CreatePickupInput = Logged & {
  tripId: string;
  plantationId: string;
  chickenCount: number;
  totalKilo: Decimal;
};
export type CreateSaleInput = Logged & {
  tripId: string;
  buyerId?: string;
  chickenCount: number;
  totalKilo: Decimal;
  amount: Decimal;
  pricePerKilo?: Decimal;
  listPricePerKilo?: Decimal;
  paymentMethod?: PaymentMethod;
};
export type CreateRecountInput = Logged & {
  tripId: string;
  countedChicken: number;
  countedKilo: Decimal;
};
export type CreateExpenseInput = Logged & {
  tripId?: string;
  description: string;
  amount: Decimal;
};
export type CreateActivityLogInput = ClientStamp & {
  tripId?: string;
  actionType: ActionType;
  payload: Record<string, unknown>;
};

// ---- sync ----
export type SyncBatch = {
  trips?: CreateTripInput[];
  tripEndings?: (EndTripInput & { tripId: string })[];
  pickups?: CreatePickupInput[];
  sales?: CreateSaleInput[];
  recounts?: CreateRecountInput[];
  expenses?: CreateExpenseInput[];
};
export type SyncResult =
  | { clientId: string; status: "ok"; serverId: string }
  | { clientId: string; status: "error"; error: string };
export type SyncResults = Record<keyof Required<SyncBatch>, SyncResult[]>;

// ---- reports ----
/** Calendar days (YYYY-MM-DD) in the report timezone; both ends inclusive; default last 7 days. */
export type ReportRange = { from?: string; to?: string };
export type DailyReportQuery = ReportRange & { workerId?: string };
type RangeInfo = { from: string; to: string; timezone: string };

export type StockSums = { chicken: number; kilo: Decimal };
export type SaleSums = StockSums & {
  count: number;
  amount: Decimal;
  cash: Decimal;
  qr: Decimal;
  conflicts: number;
};
export type ExpenseSums = { count: number; amount: Decimal };

export type DailyReport = RangeInfo & {
  workerId: string | null;
  days: {
    day: string;
    pickups: StockSums;
    sales: SaleSums;
    expenses: ExpenseSums;
    net: Decimal;
  }[];
};
export type WorkerReport = RangeInfo & {
  workers: {
    worker: Ref & { isActive: boolean };
    trips: number;
    pickups: StockSums;
    sales: SaleSums;
    expenses: ExpenseSums;
    net: Decimal;
    flaggedRecounts: number;
  }[];
};
type TripRef = { id: string; startedAt: IsoDate; worker: Ref };
export type DiscrepancyReport = RangeInfo & {
  /** positive difference = more on hand than expected, negative = missing */
  recounts: (Recount & {
    trip: TripRef;
    chickenDifference: number;
    kiloDifference: Decimal;
  })[];
  conflictedSales: (Sale & { trip: TripRef; buyer: Ref | null })[];
  /** worker edited the owner's price */
  priceChangedSales: (Sale & { trip: TripRef; buyer: Ref | null })[];
};
export type TripDetail = Trip & {
  worker: Ref;
  pickups: (Pickup & { plantation: Ref })[];
  sales: (Sale & { buyer: Ref | null })[];
  recounts: Recount[];
  expenses: Expense[];
  totals: {
    pickedUp: StockSums;
    sold: StockSums;
    remaining: StockSums;
    sales: { amount: Decimal; cash: Decimal; qr: Decimal };
    expenses: Decimal;
    net: Decimal;
  };
};

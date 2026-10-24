import type { Http } from "../http";
import type { CreateExpenseInput, Expense, ExpenseWithWorker } from "../types";

export const expenses = (http: Http) => ({
  create: (input: CreateExpenseInput) => http.post<Expense>("/expenses", input),
  mine: () => http.get<Expense[]>("/expenses/me"),
  /** OWNER/ADMIN */
  list: () => http.get<ExpenseWithWorker[]>("/expenses"),
});

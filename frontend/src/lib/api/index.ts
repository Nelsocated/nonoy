import type { Http } from "./http";
import { activityLogs } from "./endpoints/activity-logs";
import { auth } from "./endpoints/auth";
import { buyers } from "./endpoints/buyers";
import { expenses } from "./endpoints/expenses";
import { pickups } from "./endpoints/pickups";
import { plantations } from "./endpoints/plantations";
import { paymentQrs } from "./endpoints/payment-qrs";
import { prices } from "./endpoints/prices";
import { recounts } from "./endpoints/recounts";
import { reports } from "./endpoints/reports";
import { sales } from "./endpoints/sales";
import { sync } from "./endpoints/sync";
import { trips } from "./endpoints/trips";
import { users } from "./endpoints/users";

export function createApi(http: Http) {
  return {
    auth: auth(http),
    users: users(http),
    buyers: buyers(http),
    plantations: plantations(http),
    prices: prices(http),
    paymentQrs: paymentQrs(http),
    trips: trips(http),
    pickups: pickups(http),
    sales: sales(http),
    recounts: recounts(http),
    expenses: expenses(http),
    activityLogs: activityLogs(http),
    reports: reports(http),
    sync: sync(http),
  };
}

export type Api = ReturnType<typeof createApi>;
export { ApiError } from "./http";
export type * from "./types";

import { describe, expect, it, vi } from "vitest";
import type { Http } from "../http";
import { buyerRequests } from "./buyer-requests";

const fakeHttp = () => ({ get: vi.fn(async () => []), post: vi.fn() });
const asHttp = (h: ReturnType<typeof fakeHttp>) => h as unknown as Http;

describe("buyer request endpoints", () => {
  it("lists waiting ones and the caller's own", async () => {
    const http = fakeHttp();
    const api = buyerRequests(asHttp(http));
    await api.pending();
    expect(http.get).toHaveBeenLastCalledWith("/buyer-requests");
    await api.mine();
    expect(http.get).toHaveBeenLastCalledWith("/buyer-requests/mine");
  });
  it("decides with POSTs", async () => {
    const http = fakeHttp();
    const api = buyerRequests(asHttp(http));
    await api.approve("r1", { name: "Nena", location: null });
    expect(http.post).toHaveBeenLastCalledWith("/buyer-requests/r1/approve", {
      name: "Nena",
      location: null,
    });
    await api.merge("r1", "b1");
    expect(http.post).toHaveBeenLastCalledWith("/buyer-requests/r1/merge", {
      buyerId: "b1",
    });
    await api.reject("r1");
    expect(http.post).toHaveBeenLastCalledWith("/buyer-requests/r1/reject");
  });
});

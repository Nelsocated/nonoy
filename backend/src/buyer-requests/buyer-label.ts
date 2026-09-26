// The buyer name a sale shows; null = walk-in. A new buyer the worker typed
// shows as "(waiting)" until the owner decides.
export function saleBuyerName(
  buyer: { name: string } | null,
  request: { name: string; status: string } | null,
): string | null {
  if (buyer) return buyer.name;
  if (request?.status === 'PENDING') return `${request.name} (waiting)`;
  return null;
}

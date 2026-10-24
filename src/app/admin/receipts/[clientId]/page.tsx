import { SaleReceiptScreen } from "@/components/admin/sale-receipt";

export default async function ReceiptPage(
  props: PageProps<"/admin/receipts/[clientId]">,
) {
  const { clientId } = await props.params;
  return <SaleReceiptScreen clientId={clientId} />;
}

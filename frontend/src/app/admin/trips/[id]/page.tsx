import { TripDetailScreen } from "@/components/admin/trip-detail";

export default async function TripPage(props: PageProps<"/admin/trips/[id]">) {
  const { id } = await props.params;
  return <TripDetailScreen id={id} />;
}

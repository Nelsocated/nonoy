import { TripDetailScreen } from "@/components/admin/trip-detail";
import { tripsBack } from "@/lib/admin/trips";

// ?back= is the trips list address the row was opened from
export default async function TripPage(props: PageProps<"/admin/trips/[id]">) {
  const [{ id }, { back }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  return (
    <TripDetailScreen
      id={id}
      backTo={tripsBack(typeof back === "string" ? back : null)}
    />
  );
}

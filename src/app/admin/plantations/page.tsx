"use client";

import {
  ReferencePage,
  type RefInput,
} from "@/components/admin/reference-page";
import { trpc } from "@/lib/trpc/browser";
import type { Plantation, PlantationInput } from "@/lib/trpc/types";

// null clears an optional field (the DTO's IsOptional lets it through)
const asInput = (i: RefInput) => i as unknown as PlantationInput;

export default function PlantationsPage() {
  return (
    <ReferencePage<Plantation>
      title="Plantations"
      intro="Where workers pick up chickens."
      singular="plantation"
      queryKey="plantations"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "address", label: "Address" },
      ]}
      subtitle={(p) => p.address}
      usesNoun="pickup"
      api={{
        list: (q) => trpc.plantations.list.query(q),
        create: (i) => trpc.plantations.create.mutate(asInput(i)),
        update: (id, i) =>
          trpc.plantations.update.mutate({ id, ...asInput(i) }),
        remove: (id) => trpc.plantations.remove.mutate({ id }),
        restore: (id) => trpc.plantations.restore.mutate({ id }),
      }}
    />
  );
}

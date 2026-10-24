"use client";

import {
  ReferencePage,
  type RefInput,
} from "@/components/admin/reference-page";
import { api } from "@/lib/api/browser";
import type { Plantation, PlantationInput } from "@/lib/api/types";

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
        list: api.plantations.list,
        create: (i) => api.plantations.create(asInput(i)),
        update: (id, i) => api.plantations.update(id, asInput(i)),
        remove: api.plantations.remove,
        restore: api.plantations.restore,
      }}
    />
  );
}

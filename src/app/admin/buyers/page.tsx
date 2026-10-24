"use client";

import {
  ReferencePage,
  type RefInput,
} from "@/components/admin/reference-page";
import { BuyerRequestsCard } from "@/components/admin/buyer-requests";
import { api } from "@/lib/api/browser";
import type { Buyer, BuyerInput } from "@/lib/api/types";

// null clears an optional field (the DTO's IsOptional lets it through)
const asInput = (i: RefInput) => i as unknown as BuyerInput;

export default function BuyersPage() {
  return (
    <ReferencePage<Buyer>
      title="Buyers"
      intro="Saved buyers workers can pick on a sale. Walk-in customers don't need one."
      singular="buyer"
      queryKey="buyers"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "location", label: "Location" },
        { key: "notes", label: "Notes", multiline: true },
      ]}
      subtitle={(b) => b.location}
      usesNoun="sale"
      top={<BuyerRequestsCard />}
      api={{
        list: api.buyers.list,
        create: (i) => api.buyers.create(asInput(i)),
        update: (id, i) => api.buyers.update(id, asInput(i)),
        remove: api.buyers.remove,
        restore: api.buyers.restore,
      }}
    />
  );
}

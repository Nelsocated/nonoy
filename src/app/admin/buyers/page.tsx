"use client";

import {
  ReferencePage,
  type RefInput,
} from "@/components/admin/reference-page";
import { BuyerRequestsCard } from "@/components/admin/buyer-requests";
import { trpc } from "@/lib/trpc/browser";
import type { Buyer, BuyerInput } from "@/lib/trpc/types";

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
        list: (q) => trpc.buyers.list.query(q),
        create: (i) => trpc.buyers.create.mutate(asInput(i)),
        update: (id, i) => trpc.buyers.update.mutate({ id, ...asInput(i) }),
        remove: (id) => trpc.buyers.remove.mutate({ id }),
        restore: (id) => trpc.buyers.restore.mutate({ id }),
      }}
    />
  );
}

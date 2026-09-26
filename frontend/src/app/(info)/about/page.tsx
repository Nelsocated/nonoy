import type { Metadata } from "next";
import Link from "next/link";
import { ContactCard } from "@/components/info/contact";
import { InfoPage } from "@/components/info/prose";

export const metadata: Metadata = { title: "About · Mang Frito" };

export default function AboutPage() {
  return (
    <InfoPage
      title="About Mang Frito"
      intro="The app Mang Frito's staff use to record chicken trips, pickups and sales — on the road, with or without signal."
    >
      <section>
        <h2>What it does</h2>
        <ul>
          <li>
            Workers record each trip on their phone: chickens picked up from
            plantations, sales to buyers (cash or QR), recounts and expenses.
          </li>
          <li>
            Everything is saved on the phone first and sent to the office when
            there&apos;s signal, so a trip never stops for a weak connection.
          </li>
          <li>
            The owner and admins see today&apos;s totals, who&apos;s out right
            now and anything that needs checking, and they manage the price, QR
            codes, buyers, plantations and staff accounts.
          </li>
          <li>Every sale gets a receipt the worker can show the buyer.</li>
        </ul>
      </section>

      <section>
        <h2>Who it&apos;s for</h2>
        <p>
          Mang Frito&apos;s workers, admins and owner. Accounts are made by the
          owner or an admin — there is no public sign-up.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about the app, your account or your data? Reach the owner:
        </p>
        <ContactCard />
      </section>

      <p className="text-muted-foreground">
        New here? Start with the <Link href="/help">Help</Link> page.
      </p>
    </InfoPage>
  );
}

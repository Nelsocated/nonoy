import type { Metadata } from "next";
import { CONTACT } from "@/components/info/contact";
import { InfoPage } from "@/components/info/prose";

export const metadata: Metadata = { title: "Help · Mang Frito" };

const card = "rounded-xl border bg-surface p-5 shadow-card";

export default function HelpPage() {
  return (
    <InfoPage
      title="Help"
      intro="Short how-tos for the phone app and the admin screens. This page also opens with no signal."
    >
      <section className={card}>
        <h2>For workers</h2>

        <h3>Start a trip</h3>
        <p>
          On Home, tap <strong>Start trip</strong>. Everything you record after
          that belongs to this trip until you end it.
        </p>

        <h3>Pickup</h3>
        <p>
          Tap <strong>Pickup</strong>, choose the plantation, then enter the
          number of chickens and the total kilos.
        </p>

        <h3>Sale</h3>
        <p>
          Tap <strong>Sale</strong>, choose the buyer (or Walk-in), enter
          chickens and kilos. The owner&apos;s price per kilo is filled in and
          the total is worked out for you. If you change the price, the owner
          will see it. Choose Cash or QR, then save.
        </p>

        <h3>Paid by QR</h3>
        <p>
          Choose QR on the sale form, then tap <strong>Show QR</strong>. The
          amount and the owner&apos;s payment QR fill the screen for the buyer
          to scan. If there are several QR codes, tap the one the buyer wants.
        </p>

        <h3>Receipts</h3>
        <p>
          A receipt opens after every sale. To show one again, tap{" "}
          <strong>Today · sales</strong> on Home and pick the sale.
        </p>

        <h3>Recount</h3>
        <p>
          Count what&apos;s left on the truck and enter it. After saving,
          you&apos;ll see whether it matches or how much is short or over.
        </p>

        <h3>Expense</h3>
        <p>
          Tap <strong>Expense</strong> for gas, food, toll or parking. Leave
          &quot;Part of this trip&quot; on when it belongs to the trip.
        </p>

        <h3>End trip</h3>
        <p>
          Tap <strong>End trip</strong> when you&apos;re done. You&apos;ll see
          the trip&apos;s totals first. A recount before ending is a good habit.
        </p>

        <h3>No signal?</h3>
        <p>
          Keep working. Everything is saved on your phone. The bar at the top
          shows how many records are waiting; they send by themselves when
          signal comes back. Open the <strong>Sync</strong> tab to see them or
          to send now. A record marked &quot;needs attention&quot; couldn&apos;t
          be saved by the office — tell the owner.
        </p>

        <h3>Logging out</h3>
        <p>
          If records are still waiting, you&apos;ll be warned. They stay on the
          phone and send the next time you log in on it. Logging out needs
          signal.
        </p>

        <h3>Forgot your password?</h3>
        <p>
          Ask the owner or an admin to set a new one for you. Tap the eye in the
          password box to check what you typed.
        </p>
      </section>

      <section className={card}>
        <h2>For the owner and admins</h2>

        <h3>Dashboard</h3>
        <p>
          Today&apos;s sales, kilos, expenses and net; who&apos;s out right now
          and when their phone last synced; and problems to check: recounts that
          didn&apos;t match, sales made after a trip ended, and sales where the
          price was changed. Open one to see the whole trip, then tap{" "}
          <strong>Checked</strong> (add a note if it helps). The dashboard
          refreshes every minute.
        </p>

        <h3>Price</h3>
        <p>
          Set the price per kilo. Phones get it at their next sync; the history
          shows who changed it and when.
        </p>

        <h3>QR codes</h3>
        <p>
          Add up to 10 payment QR codes from screenshots (GCash, Maya, bank).
          Only the code inside is saved, and workers&apos; phones keep them for
          offline use.
        </p>

        <h3>Buyers and plantations</h3>
        <p>
          Add and edit them. <strong>Remove</strong> deletes one that was never
          used, or archives it if it has history; archived ones can be restored.
        </p>

        <h3>Users</h3>
        <p>
          Add staff, fix a name or phone, reset a password (they&apos;re logged
          out everywhere) or deactivate an account.
        </p>

        <h3>Going out with the staff</h3>
        <p>
          Open <strong>Field</strong> in the menu to record your own trip with
          the same screens workers use.
        </p>
      </section>

      <section>
        <h2>Still stuck?</h2>
        <p>
          Call or text {CONTACT.name} at{" "}
          <a href={`tel:${CONTACT.tel}`}>{CONTACT.phone}</a> or email{" "}
          <a href={`mailto:${CONTACT.email}`} className="break-all">
            {CONTACT.email}
          </a>
          .
        </p>
      </section>
    </InfoPage>
  );
}

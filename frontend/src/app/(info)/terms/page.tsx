import type { Metadata } from "next";
import Link from "next/link";
import { ContactCard } from "@/components/info/contact";
import { InfoPage } from "@/components/info/prose";

export const metadata: Metadata = { title: "Terms · Mang Frito" };

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms of use"
      intro="The rules for using the Mang Frito app. By signing in, you agree to them."
      updated="September 26, 2026"
    >
      <section>
        <h2>Who may use it</h2>
        <p>
          Only Mang Frito staff with an account made by the owner or an admin.
          It&apos;s a work tool, not a public service.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>
            Your account is for you only — don&apos;t share it or your password.
          </li>
          <li>
            Tell the owner right away if you think someone else knows your
            password or has used your account.
          </li>
          <li>Log out when you&apos;re done on a phone other people use.</li>
        </ul>
      </section>

      <section>
        <h2>Recording honestly</h2>
        <ul>
          <li>
            Record trips, pickups, sales, recounts and expenses truthfully, when
            they happen.
          </li>
          <li>
            Only change the price on a sale when it was really sold at that
            price — changed prices are shown to the owner.
          </li>
          <li>
            Don&apos;t try to get around the app&apos;s checks, open other
            people&apos;s records, or break the app.
          </li>
        </ul>
      </section>

      <section>
        <h2>The records belong to the business</h2>
        <p>
          Everything recorded in the app is Mang Frito&apos;s business record.
          The owner and admins may review it, and records stay after an account
          is deactivated. How your personal information is handled is explained
          in the <Link href="/privacy">Privacy notice</Link>.
        </p>
      </section>

      <section>
        <h2>Accounts can be stopped</h2>
        <p>
          The owner or an admin can reset a password or deactivate an account at
          any time, for example when someone leaves or these terms are broken.
        </p>
      </section>

      <section>
        <h2>The app as it is</h2>
        <p>
          We work to keep the app running and your records safe, but it&apos;s
          provided as it is: signal, phones and servers can fail. Records saved
          on a phone are only safe with the office once they&apos;ve synced, so
          sync when you can and don&apos;t clear the browser&apos;s data while
          records are waiting. The app may change or get new features.
        </p>
      </section>

      <section>
        <h2>Law</h2>
        <p>These terms follow the laws of the Philippines.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If these terms change, the date at the top changes too, and big
          changes will be told to staff directly.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <ContactCard />
      </section>
    </InfoPage>
  );
}

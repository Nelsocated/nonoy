import type { Metadata } from "next";
import { ContactCard } from "@/components/info/contact";
import { InfoPage } from "@/components/info/prose";

export const metadata: Metadata = { title: "Privacy · Mang Frito" };

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy notice"
      intro="What the Mang Frito app keeps about you, why, and what you can ask for. Written with the Data Privacy Act of 2012 (Republic Act No. 10173) in mind."
      updated="September 26, 2026"
    >
      <section>
        <h2>Who is responsible</h2>
        <p>
          Mang Frito, owned by Nelson Lago Jr in Iloilo City, decides what the
          app collects and is responsible for it. The owner also handles privacy
          questions and requests (see Contact below).
        </p>
      </section>

      <section>
        <h2>What we keep</h2>
        <ul>
          <li>
            <strong>Your account:</strong> name, phone number, role (worker,
            admin or owner), whether the account is active, and your password —
            stored only in scrambled (hashed) form, so no one can read it.
          </li>
          <li>
            <strong>Your work records:</strong> trips, pickups, sales, recounts
            and expenses you record, with the time each was made and when it
            reached the office, plus a log of these actions.
          </li>
          <li>
            <strong>Checks by the owner or admins:</strong> who marked a problem
            as checked, when, and their note.
          </li>
          <li>
            <strong>Buyers and plantations:</strong> the names, locations and
            notes the business saves about them.
          </li>
        </ul>
        <p>
          The app doesn&apos;t use your location, camera, contacts or
          advertising trackers. The owner&apos;s QR screenshots are read in the
          browser and only the text inside the QR is saved.
        </p>
      </section>

      <section>
        <h2>On your phone</h2>
        <p>
          So you can work without signal, your records, the buyer and plantation
          lists, the price and the payment QR codes are kept on the phone until
          they are sent. Login cookies keep you signed in; they can&apos;t be
          read by other websites. Logging out clears the saved pages; records
          that haven&apos;t been sent yet stay on the phone so they aren&apos;t
          lost.
        </p>
      </section>

      <section>
        <h2>Why we keep it</h2>
        <ul>
          <li>
            To run the business: trips, stock, sales, receipts and pay-outs.
          </li>
          <li>
            To check the records are right (recounts, price changes, sales after
            a trip ended).
          </li>
          <li>To give you an account and keep it secure.</li>
        </ul>
        <p>
          We rely on your work arrangement with Mang Frito and the
          business&apos;s legitimate need to keep accurate records.
        </p>
      </section>

      <section>
        <h2>Who can see it</h2>
        <p>
          The owner and admins. Workers see their own trips only. The app runs
          on a hosting service whose servers are in Singapore; it stores the
          data for us and doesn&apos;t use it for anything else. We don&apos;t
          sell or share your information, except when the law requires it.
        </p>
      </section>

      <section>
        <h2>How long</h2>
        <p>
          Account details are kept while you work with Mang Frito. Sales and
          trip records are business records and are kept as long as the business
          needs them for its books and as the law requires. A deactivated
          account can&apos;t log in, but its past records stay.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>Under the Data Privacy Act you can ask to:</p>
        <ul>
          <li>know what information we have about you and see a copy;</li>
          <li>have wrong information corrected;</li>
          <li>
            object to, or have removed, information that isn&apos;t needed
            anymore (business records the law requires us to keep may stay);
          </li>
          <li>
            complain to the National Privacy Commission if you think your data
            was mishandled.
          </li>
        </ul>
        <p>Contact the owner and we&apos;ll answer as soon as we can.</p>
      </section>

      <section>
        <h2>Keeping it safe</h2>
        <p>
          Connections are encrypted, passwords are hashed, each person only sees
          what their role allows, and accounts can be deactivated at once.
          Please keep your password to yourself and log out on shared phones.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this notice changes, the date at the top changes too. Big changes
          will be told to staff directly.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <ContactCard />
      </section>
    </InfoPage>
  );
}

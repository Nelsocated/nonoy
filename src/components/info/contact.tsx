import { Mail, MapPin, Phone, User } from "lucide-react";

// Who to reach about the app or your data (the owner).
export const CONTACT = {
  business: "Mang Frito",
  name: "Nelson Lago Jr",
  phone: "(0998) 581 5934",
  tel: "+639985815934",
  email: "lagojrnelson@gmail.com",
  city: "Iloilo City, Iloilo",
};

export function ContactCard() {
  const row = "flex items-center gap-3 py-2";
  const icon = "size-5 shrink-0 text-primary";
  const link =
    "font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100";
  return (
    <address className="not-italic rounded-xl border bg-surface px-5 py-3 shadow-card">
      <p className="py-2 font-semibold">{CONTACT.business}</p>
      <p className={row}>
        <User aria-hidden className={icon} /> {CONTACT.name}, owner
      </p>
      <p className={row}>
        <Phone aria-hidden className={icon} />
        <a href={`tel:${CONTACT.tel}`} className={link}>
          {CONTACT.phone}
        </a>
      </p>
      <p className={row}>
        <Mail aria-hidden className={icon} />
        <a href={`mailto:${CONTACT.email}`} className={`${link} break-all`}>
          {CONTACT.email}
        </a>
      </p>
      <p className={row}>
        <MapPin aria-hidden className={icon} /> {CONTACT.city}
      </p>
    </address>
  );
}

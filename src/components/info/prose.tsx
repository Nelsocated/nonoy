// Page title + readable text for the info pages (no typography plugin here).
export function InfoPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <div aria-hidden className="h-1 w-12 rounded-full bg-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{intro}</p>
        {updated && (
          <p className="text-sm text-muted-foreground">
            Last updated {updated}
          </p>
        )}
      </header>
      <div className="space-y-8 text-base leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:pl-1 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:marker:text-primary">
        {children}
      </div>
    </article>
  );
}

// The login page lays itself out (red header on phones, red panel beside the
// form on tablets and up).
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <main className="flex flex-1 flex-col bg-background">{children}</main>;
}

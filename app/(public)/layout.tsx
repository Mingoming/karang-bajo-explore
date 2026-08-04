import { PublicShell } from "@/components/public/public-shell";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PublicShell locale="id">{children}</PublicShell>;
}

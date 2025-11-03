// app/admin/page.tsx
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function AdminPage() {
  return <AdminClient />;
}

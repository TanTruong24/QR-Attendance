import { Suspense } from "react";
import CheckinClient from "./CheckinClient";

// Ngăn Next.js prerender trang này (build-time) để tránh lỗi
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Đang tải…</div>}>
      <CheckinClient />
    </Suspense>
  );
}

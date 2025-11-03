// app/admin/layout.tsx
import * as React from "react";

export const metadata = { title: "Quản trị | Điểm danh" };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Không dùng <html>/<body> ở layout con
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      {children}
    </section>
  );
}

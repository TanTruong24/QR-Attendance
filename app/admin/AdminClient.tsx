// app/admin/AdminClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type MonthItem = { order: number; sheetName: string; label: string; exists: boolean };
type AttendanceRow = {
  no: number;
  datetime: string;
  cccd: string;
  name: string;
  join: boolean;
  group: number;
};

export default function AdminClient() {
  const [months, setMonths] = useState<MonthItem[]>([]);
  const [year, setYear] = useState<string>("");
  const [sheetName, setSheetName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [meta, setMeta] = useState<{ sheetName?: string; total?: number } | null>(null);
  const [error, setError] = useState<string>("");

  // Load danh sách tháng
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/months", { cache: "no-store" });
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.error || "fetch_months_failed");
        setMonths(Array.isArray(data.data) ? data.data : []);
      } catch (e: any) {
        setError("Không tải được danh sách tháng.");
      }
    })();
  }, []);

  // Tập các năm từ YYYYMM
  const years = useMemo(() => {
    const ys = new Set<string>();
    months.forEach((m) => {
      if (/^\d{6}$/.test(m.sheetName)) ys.add(m.sheetName.slice(0, 4));
    });
    return Array.from(ys).sort((a, b) => Number(b) - Number(a)); // mới -> cũ
  }, [months]);

  // Danh sách tháng theo năm
  const monthsByYear = useMemo(() => {
    if (!year) return [];
    return months
      .filter((m) => m.sheetName.startsWith(year))
      .sort((a, b) => Number(b.sheetName) - Number(a.sheetName)); // mới -> cũ
  }, [months, year]);

  // Chọn mặc định: năm mới nhất + tháng mới nhất
  useEffect(() => {
    if (!year && years.length > 0) setYear(years[0]);
  }, [years, year]);

  useEffect(() => {
    if (year && !sheetName && monthsByYear.length > 0) {
      setSheetName(monthsByYear[0].sheetName);
    }
  }, [year, monthsByYear, sheetName]);

  // Load attendance theo sheetName
  useEffect(() => {
    if (!sheetName) return;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const res = await fetch(`/api/admin/attendance?sheetName=${sheetName}`, { cache: "no-store" });
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.error || "fetch_attendance_failed");
        setRows(data.data || []);
        setMeta(data.meta || {});
      } catch (e: any) {
        setError("Không tải được dữ liệu điểm danh.");
        setRows([]);
        setMeta(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [sheetName]);

  // Gom theo group
  const groups = useMemo(() => {
    const map = new Map<number, AttendanceRow[]>();
    rows.forEach((r) => {
      const key = Number(r.group || 0);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    for (const list of map.values()) {
      list.sort((a, b) => (a.join === b.join ? a.no - b.no : a.join ? -1 : 1));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([g, items]) => {
        const joined = items.filter((x) => x.join).length;
        const absent = items.length - joined;
        return { group: g, items, joined, absent };
      });
  }, [rows]);

  return (
    <main>
      <h1 style={{ marginBottom: 16 }}>📊 Thống kê điểm danh</h1>

      {/* Bộ lọc */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <label>Năm:&nbsp;</label>
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setSheetName("");
            }}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Tháng:&nbsp;</label>
          <select
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", minWidth: 120 }}
          >
            {monthsByYear.map((m) => {
              const label = `${m.sheetName.slice(0, 4)}-${m.sheetName.slice(4, 6)}`;
              return (
                <option key={m.sheetName} value={m.sheetName}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ opacity: 0.7 }}>
          {meta?.sheetName ? (
            <span>
              Sheet: <b>{meta.sheetName}</b> • Tổng: <b>{meta.total ?? rows.length}</b>
            </span>
          ) : null}
        </div>
      </div>

      {/* Thông báo */}
      {error && (
        <div
          style={{
            background: "#ffebee",
            color: "#b71c1c",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ffcdd2",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <div style={{ padding: 8, opacity: 0.7 }}>Đang tải dữ liệu…</div>}

      {/* Bảng theo group */}
      {!loading &&
        groups.map((g) => (
          <section key={g.group} style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>Nhóm {g.group}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <Badge label={`Tham gia: ${g.joined}`} />
                <Badge tone="warning" label={`Vắng: ${g.absent}`} />
                <Badge tone="muted" label={`Tổng: ${g.items.length}`} />
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <Th>#</Th>
                  <Th>CCCD</Th>
                  <Th>Họ tên</Th>
                  <Th>Tham gia</Th>
                  <Th>Thời gian</Th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((r, index) => (
                  <tr key={r.no} style={{ borderBottom: "1px solid #eee" }}>
                    <Td>{index + 1}</Td>
                    <Td mono>{r.cccd}</Td>
                    <Td>{r.name}</Td>
                    <Td>{r.join ? <Status ok>Đã điểm danh</Status> : <Status>Chưa điểm danh</Status>}</Td>
                    <Td mono>{r.datetime || "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

      {!loading && groups.length === 0 && <div style={{ padding: 8, opacity: 0.7 }}>Không có dữ liệu.</div>}
    </main>
  );
}

/* ==== UI helpers ==== */
function Th({ children }: { children: any }) {
  return <th style={{ textAlign: "left", padding: "10px 8px", fontWeight: 600 }}>{children}</th>;
}
function Td({ children, mono }: { children: any; mono?: boolean }) {
  return (
    <td
      style={{
        padding: "8px 8px",
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
      }}
    >
      {children}
    </td>
  );
}
function Badge({ label, tone }: { label: string; tone?: "warning" | "muted" }) {
  const styles: Record<string, React.CSSProperties> = {
    base: { padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600 },
    ok: { background: "#E8F5E9", color: "#1B5E20", border: "1px solid #C8E6C9" },
    warning: { background: "#FFF8E1", color: "#E65100", border: "1px solid #FFE0B2" },
    muted: { background: "#ECEFF1", color: "#37474F", border: "1px solid #CFD8DC" },
  };
  const style = tone === "warning" ? styles.warning : tone === "muted" ? styles.muted : styles.ok;
  return <span style={{ ...styles.base, ...style }}>{label}</span>;
}
function Status({ ok, children }: { ok?: boolean; children: any }) {
  const style: React.CSSProperties = ok
    ? { background: "#E8F5E9", color: "#1B5E20", border: "1px solid #C8E6C9" }
    : { background: "#FFEBEE", color: "#B71C1C", border: "1px solid #FFCDD2" };
  return (
    <span style={{ ...style, padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
      {children}
    </span>
  );
}

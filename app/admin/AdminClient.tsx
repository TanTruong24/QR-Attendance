"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type MonthItem = { order: number; sheetName: string; label: string; exists: boolean };
type AttendanceRow = {
  no: number;
  datetime: string; // "YYYY-MM-DD HH:mm:ss" hoặc ""
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
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [meta, setMeta] = useState<{ sheetName?: string; total?: number } | null>(null);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Detect mobile width
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Load danh sách tháng
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/months", { cache: "no-store" });
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.error || "fetch_months_failed");
        setMonths(Array.isArray(data.data) ? data.data : []);
      } catch {
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

  // Hàm tải attendance theo sheetName hiện tại
  const loadAttendance = useCallback(async (sn: string) => {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`/api/admin/attendance?sheetName=${sn}`, { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "fetch_attendance_failed");
      setRows(data.data || []);
      setMeta(data.meta || {});
    } catch {
      setError("Không tải được dữ liệu điểm danh.");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải khi đổi sheetName
  useEffect(() => {
    if (!sheetName) return;
    loadAttendance(sheetName);
  }, [sheetName, loadAttendance]);

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

  // Click "Làm mới"
  const handleRefresh = async () => {
    if (!sheetName) return;
    setRefreshing(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`/api/admin/refresh?sheetName=${sheetName}`, { method: "POST" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "refresh_failed");
      setInfo("Đã làm mới dữ liệu xong.");
      await loadAttendance(sheetName);
    } catch {
      setError("Không làm mới được dữ liệu. Vui lòng thử lại.");
    } finally {
      setRefreshing(false);
    }
  };

  // Helpers hiển thị cho mobile
  const formatTimeCell = (dt: string) => {
    if (!dt) return "-";
    return isMobile ? dt.slice(11, 16) : dt; // HH:mm trên mobile
  };

  return (
    <main>
      <h1 style={{ marginBottom: 16, fontSize: isMobile ? 18 : 22 }}>📊 Thống kê điểm danh</h1>

      {/* Bộ lọc + Làm mới */}
      <div
        className="toolbar"
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <label>Năm:&nbsp;</label>
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setSheetName("");
            }}
            style={{
              padding: isMobile ? "6px 8px" : "8px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: isMobile ? 13 : 14,
            }}
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
            style={{
              padding: isMobile ? "6px 8px" : "8px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              minWidth: 120,
              fontSize: isMobile ? 13 : 14,
            }}
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

        <div style={{ opacity: 0.8, fontSize: isMobile ? 12 : 14 }}>
          {meta?.sheetName ? (
            <span>
              Sheet: <b>{meta.sheetName}</b> • Tổng: <b>{meta.total ?? rows.length}</b>
            </span>
          ) : null}
        </div>

        <button
          onClick={handleRefresh}
          disabled={!sheetName || refreshing}
          style={{
            marginLeft: "auto",
            padding: isMobile ? "6px 10px" : "8px 12px",
            borderRadius: 8,
            border: "none",
            cursor: refreshing ? "not-allowed" : "pointer",
            background: refreshing ? "#9e9e9e" : "#1976D2",
            color: "#fff",
            fontWeight: 600,
            fontSize: isMobile ? 12 : 14,
            boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            transition: "all .2s",
          }}
          onMouseEnter={(e) => {
            if (!refreshing) (e.currentTarget.style.backgroundColor = "#1565C0");
          }}
          onMouseLeave={(e) => {
            if (!refreshing) (e.currentTarget.style.backgroundColor = "#1976D2");
          }}
          title="Gọi API làm mới dữ liệu cho sheet hiện tại"
        >
          {refreshing ? "Đang làm mới..." : "Làm mới"}
        </button>
      </div>

      {/* Thông báo */}
      {error && (
        <div className="alert error">
          {error}
        </div>
      )}
      {info && (
        <div className="alert ok">
          {info}
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
                gap: 8,
              }}
            >
              <h3 style={{ margin: 0, fontSize: isMobile ? 16 : 18 }}>Nhóm {g.group}</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge label={`Tham gia: ${g.joined}`} />
                <Badge tone="warning" label={`Vắng: ${g.absent}`} />
                <Badge tone="muted" label={`Tổng: ${g.items.length}`} />
              </div>
            </div>

            <table className="responsive-table">
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th className="col-cccd">CCCD</Th>
                  <Th>Họ tên</Th>
                  <Th>Tham gia</Th>
                  <Th className="col-time">Thời gian</Th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((r, index) => (
                  <tr key={r.no}>
                    <Td>{index + 1}</Td>
                    <Td mono className="col-cccd">{r.cccd}</Td>
                    <Td>{r.name}</Td>
                    <Td>
                      {/* rút gọn label: Có/Không */}
                      {r.join ? <Status ok compact> Có </Status> : <Status compact> Không </Status>}
                    </Td>
                    <Td mono className="col-time">{formatTimeCell(r.datetime)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

      {!loading && groups.length === 0 && <div style={{ padding: 8, opacity: 0.7 }}>Không có dữ liệu.</div>}

      {/* CSS đáp ứng */}
<style jsx>{`
  .responsive-table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    font-size: ${isMobile ? "13px" : "14px"};
    table-layout: fixed; /* Cố định layout cột */
  }
  thead tr {
    background: #f5f5f5;
  }
  th, td {
    text-align: left;
    padding: ${isMobile ? "8px 6px" : "10px 8px"};
    border-bottom: 1px solid #eee;
    word-break: break-word;
  }

  /* Cố định độ rộng cho từng cột */
  th:nth-child(1), td:nth-child(1) { width: 40px; text-align: center; }
  th:nth-child(2), td:nth-child(2) { width: 140px; } /* CCCD */
  th:nth-child(3), td:nth-child(3) { width: 220px; } /* Họ tên */
  th:nth-child(4), td:nth-child(4) { width: 90px; text-align: center; } /* Tham gia */
  th:nth-child(5), td:nth-child(5) { width: 140px; } /* Thời gian */

  .alert {
    padding: 10px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
    font-size: ${isMobile ? "13px" : "14px"};
  }
  .alert.ok {
    background: #e8f5e9;
    color: #1b5e20;
    border: 1px solid #c8e6c9;
  }
  .alert.error {
    background: #ffebee;
    color: #b71c1c;
    border: 1px solid #ffcdd2;
  }

  /* Ẩn cột CCCD trên mobile */
  @media (max-width: 640px) {
    .col-cccd { display: none; }
    th:nth-child(1), td:nth-child(1) { width: 36px; }
    th:nth-child(3), td:nth-child(3) { width: auto; }
    th:nth-child(4), td:nth-child(4) { width: 70px; }
    th:nth-child(5), td:nth-child(5) { width: 70px; text-align: center; }
  }
`}</style>

    </main>
  );
}

/* ==== UI helpers ==== */
function Th({ children, className }: { children: any; className?: string }) {
  return (
    <th className={className} style={{ fontWeight: 600 }}>
      {children}
    </th>
  );
}
function Td({
  children,
  mono,
  className,
}: {
  children: any;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={className}
      style={{
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
      }}
    >
      {children}
    </td>
  );
}
function Badge({ label, tone }: { label: string; tone?: "warning" | "muted" }) {
  const base: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  };
  const style =
    tone === "warning"
      ? { background: "#FFF8E1", color: "#E65100", border: "1px solid #FFE0B2" }
      : tone === "muted"
      ? { background: "#ECEFF1", color: "#37474F", border: "1px solid #CFD8DC" }
      : { background: "#E8F5E9", color: "#1B5E20", border: "1px solid #C8E6C9" };

  return <span style={{ ...base, ...style }}>{label}</span>;
}
function Status({ ok, compact, children }: { ok?: boolean; compact?: boolean; children: any }) {
  const style: React.CSSProperties = ok
    ? { background: "#E8F5E9", color: "#1B5E20", border: "1px solid #C8E6C9" }
    : { background: "#FFEBEE", color: "#B71C1C", border: "1px solid #FFCDD2" };

  return (
    <span
      style={{
        ...style,
        padding: compact ? "2px 6px" : "4px 8px",
        borderRadius: 8,
        fontSize: compact ? 12 : 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toFriendlyError } from "@/app/common/errorMessages";

declare global {
    interface Window {
        google: any;
    }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

export default function CheckinClient() {
    const sp = useSearchParams();
    const eventId = sp.get("event") ?? "unknown";

    const [status, setStatus] = useState("Đang tải…");
    const [cccd, setCccd] = useState("");
    const [loading, setLoading] = useState(false);

    // ==== Điểm danh bằng CCCD (GAS cần body có { cccd, event, ua }) ====
    const handleCheckinByCccd = async () => {
        const trimmed = cccd.trim();
        if (!trimmed) {
            setStatus("⚠️ Vui lòng nhập CCCD.");
            return;
        }
        // Nếu bạn muốn nới lỏng, có thể đổi/loại bỏ regex dưới
        if (!/^\d{12}$/.test(trimmed)) {
            setStatus("⚠️ CCCD không hợp lệ (cần 12 chữ số).");
            return;
        }

        setLoading(true);
        setStatus("Đang gửi điểm danh bằng CCCD…");
        try {
            const res = await fetch("/api/checkin", {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    cccd: trimmed,
                    event: eventId,
                    ua: navigator.userAgent,
                }),
            });

            const data = await res.json();

            const buildOrder = (d: any) => {
                if (d?.orderLabel) return d.orderLabel;
                if (d?.order?.index) {
                    return d.order?.total
                        ? `${d.order.index}/${d.order.total}`
                        : String(d.order.index);
                }
                return "";
            };

            if (data.duplicate) {
                // (GAS của bạn trả duplicate cho nhánh OAuth; nhánh CCCD hiện không set duplicate)
                setStatus(
                    [
                        "⚠️ Đã điểm danh trước đó.",
                        `Sự kiện: ${data.event ?? eventId}`,
                        data.email ? `Email: ${data.email}` : "",
                        buildOrder(data)
                            ? `Thứ tự (lần đầu): ${buildOrder(data)}`
                            : "",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
            } else if (data.ok) {
                setStatus(
                    [
                        "✅ Điểm danh thành công!",
                        `Sự kiện: ${data.event ?? eventId}`,
                        data.email ? `Email: ${data.email}` : "",
                        buildOrder(data) ? `Thứ tự: ${buildOrder(data)}` : "",
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
            } else {
                setStatus(toFriendlyError(data?.error, data?.message));
            }
        } catch {
            setStatus("❌ Không thể kết nối Apps Script.");
        } finally {
            setLoading(false);
        }
    };

    // ==== OAuth Google → Gửi idToken trong body (GAS cần body luôn có) ====
    useEffect(() => {
        if (!CLIENT_ID) {
            setStatus("Thiếu NEXT_PUBLIC_GOOGLE_CLIENT_ID");
            return;
        }

        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.onload = () => {
            window.google.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: async (resp: any) => {
                    // GSI One Tap trả id_token trong resp.credential
                    const idToken = resp?.credential;
                    if (!idToken) {
                        setStatus("❌ Không nhận được idToken từ Google.");
                        return;
                    }

                    setLoading(true);
                    setStatus("Đang xác thực (OAuth) …");
                    try {
                        const res = await fetch("/api/checkin", {
                            method: "POST",
                            headers: {
                                "Content-Type": "text/plain;charset=utf-8",
                            },
                            body: JSON.stringify({
                                idToken,
                                event: eventId,
                                ua: navigator.userAgent,
                            }),
                        });

                        const data = await res.json();

                        const buildOrder = (d: any) => {
                            if (d?.orderLabel) return d.orderLabel;
                            if (d?.order?.index) {
                                return d.order?.total
                                    ? `${d.order.index}/${d.order.total}`
                                    : String(d.order.index);
                            }
                            return "";
                        };

                        // Nhánh OAuth của GAS có thể trả duplicate:true
                        if (data.duplicate) {
                            setStatus(
                                [
                                    "⚠️ Email này đã điểm danh trước đó.",
                                    `Sự kiện: ${data.event ?? eventId}`,
                                    data.email ? `Email: ${data.email}` : "",
                                    buildOrder(data)
                                        ? `Thứ tự (lần đầu): ${buildOrder(
                                              data
                                          )}`
                                        : "",
                                ]
                                    .filter(Boolean)
                                    .join("\n")
                            );
                        } else if (data.ok) {
                            setStatus(
                                [
                                    "✅ Điểm danh thành công!",
                                    `Sự kiện: ${data.event ?? eventId}`,
                                    data.email ? `Email: ${data.email}` : "",
                                    buildOrder(data)
                                        ? `Thứ tự: ${buildOrder(data)}`
                                        : "",
                                ]
                                    .filter(Boolean)
                                    .join("\n")
                            );
                        } else {
                            setStatus(
                                "❌ Lỗi: " + (data.error || "Không xác định")
                            );
                        }
                    } catch {
                        setStatus("❌ Không thể kết nối Apps Script.");
                    } finally {
                        setLoading(false);
                    }
                },
            });

            window.google.accounts.id.renderButton(
                document.getElementById("gbtn")!,
                {
                    theme: "outline",
                    size: "large",
                    width: 300,
                    text: "signin_with",
                }
            );

            setStatus("Chọn phương thức điểm danh: Google hoặc nhập CCCD.");
        };
        document.body.appendChild(s);
    }, [eventId]);

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: 24,
                textAlign: "center",
            }}
        >
            <h2>Điểm danh sự kiện</h2>
            <p>
                <b>Sự kiện:</b> {eventId}
            </p>

            {/* Cách 1: OAuth Google (body: { idToken, event, ua }) */}
            <div id="gbtn"></div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ height: 1, background: "#ddd", width: 120 }} />
                <span>hoặc</span>
                <div style={{ height: 1, background: "#ddd", width: 120 }} />
            </div>

            {/* Cách 2: Nhập CCCD (body: { cccd, event, ua }) */}
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    flexWrap: "wrap",
                }}
            >
                <input
                    placeholder="Nhập số CCCD (12 chữ số)"
                    inputMode="numeric"
                    value={cccd}
                    onChange={(e) => setCccd(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleCheckinByCccd();
                    }}
                    disabled={loading}
                    style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        minWidth: 260,
                    }}
                />
                <button
                    onClick={handleCheckinByCccd}
                    disabled={loading}
                    style={{
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "none",
                        cursor: loading ? "not-allowed" : "pointer",
                        backgroundColor: loading ? "#9e9e9e" : "#4CAF50", // xanh lá chuẩn
                        color: "#fff",
                        fontWeight: 600,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transition: "all 0.2s ease-in-out",
                    }}
                    onMouseEnter={(e) => {
                        if (!loading)
                            e.currentTarget.style.backgroundColor = "#45A049"; // hover đậm hơn
                    }}
                    onMouseLeave={(e) => {
                        if (!loading)
                            e.currentTarget.style.backgroundColor = "#4CAF50";
                    }}
                >
                    {loading ? "Đang gửi..." : "Điểm danh"}
                </button>
            </div>

            <pre
                style={{
                    background: "#f7f7f7",
                    padding: 16,
                    borderRadius: 8,
                    width: "90%",
                    whiteSpace: "pre-wrap",
                }}
            >
                {status}
            </pre>
        </main>
    );
}

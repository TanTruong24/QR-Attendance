"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

declare global {
    interface Window {
        google: any;
    }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const APP_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL!;

export default function CheckinClient() {
    const sp = useSearchParams();
    const eventId = sp.get("event") ?? "unknown";
    const [status, setStatus] = useState("Đang tải...");

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
                    const idToken = resp.credential;
                    setStatus("Đang xác thực...");
                    try {
                        const res = await fetch(APP_SCRIPT_URL, {
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
                        if (data.ok) {
                            setStatus(
                                `✅ Điểm danh thành công!\nEmail: ${
                                    data.email
                                }${
                                    data.mapped?.name
                                        ? " (" + data.mapped.name + ")"
                                        : ""
                                }`
                            );
                        } else if (data.duplicate) {
                            setStatus(
                                `⚠️ Bạn đã điểm danh cho ${data.event} trước đó.`
                            );
                        } else {
                            setStatus(
                                "❌ Lỗi: " + (data.error || "Không xác định")
                            );
                        }
                    } catch {
                        setStatus("❌ Không thể kết nối Apps Script.");
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

            setStatus("Vui lòng đăng nhập Google để điểm danh.");
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
            <div id="gbtn"></div>
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

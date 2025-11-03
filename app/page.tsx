// app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/admin"); // hoặc "/dashboard" hay bất kỳ path nào bạn muốn
}

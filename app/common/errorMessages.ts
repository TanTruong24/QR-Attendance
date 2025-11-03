// app/common/errorMessages.ts
export interface FriendlyError {
  title: string;
  hint?: string;
}

const errorMap: Record<string, FriendlyError> = {
  no_body:                { title: "Lỗi hệ thống, vui lòng thử lại.", hint: "Yêu cầu gửi không có nội dung." },
  bad_json:               { title: "Dữ liệu gửi lên không hợp lệ.",   hint: "Kiểm tra cấu trúc JSON ở phía client." },
  missing_event:          { title: "Chưa chọn sự kiện.",              hint: "Vào đường dẫn có tham số ?event=..." },
  event_not_configured:   { title: "Sự kiện không hợp lệ hoặc đã đóng.", hint: "Liên hệ BTC/Quản trị để kiểm tra cấu hình." },
  missing_idToken_or_cccd:{ title: "Chọn 1 hình thức điểm danh.",     hint: "Đăng nhập Google HOẶC nhập số CCCD." },
  invalid_token:          { title: "Phiên đăng nhập không hợp lệ.",   hint: "Hãy đăng nhập Google lại." },
  aud_mismatch:           { title: "Sai ứng dụng đăng nhập.",         hint: "Kiểm tra clientId cấu hình trên Google." },
  cccd_not_found:         { title: "Không tìm thấy người dùng theo CCCD.", hint: "Kiểm tra lại số CCCD đã nhập." },
  missing_users_sheet:    { title: "Thiếu sheet 'users'.",            hint: "Liên hệ quản trị hệ thống." },
  missing_configs_sheet:  { title: "Thiếu sheet 'configs'.",          hint: "Liên hệ quản trị hệ thống." },
  sheet_write_failed:     { title: "Không ghi được nhật ký điểm danh.", hint: "Thử lại; nếu tiếp tục lỗi, báo admin." },
  internal_error:         { title: "Lỗi hệ thống không xác định.",    hint: "Vui lòng thử lại hoặc báo admin." },
};

export function toFriendlyError(code?: string, message?: string): string {
  if (message) return message;
  if (!code) return "Lỗi không xác định. Vui lòng thử lại.";

  const item = errorMap[code];
  if (!item) return `❌ Lỗi: ${code}`;
  return item.hint ? `❌ ${item.title}\nGợi ý: ${item.hint}` : `❌ ${item.title}`;
}

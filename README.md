# Thu Chi Luong System (Web Admin + Telegram)

Hệ thống quản lý **thu/chi**, **lương nhân viên**, và **chốt chi tiêu** theo ngày/tháng.  
Giao diện web admin tối ưu mobile, tích hợp gửi thông báo Telegram.

---

## 1) Công nghệ

- Node.js `20.x`
- Express `4.x`
- EJS
- PostgreSQL (`pg`)
- Telegram Bot API (`node-telegram-bot-api`)
- Railway (NIXPACKS)

---

## 2) Cấu trúc thư mục

```bash
kingkong666/
├── index.js
├── package.json
├── railway.json
├── .env.example
├── .gitignore
├── README.md
├── public/
│   ├── style.css
│   └── app.js
├── views/
│   ├── dashboard.ejs
│   ├── groups.ejs
│   ├── group-detail.ejs
│   ├── transactions.ejs
│   ├── employees.ejs
│   ├── salary.ejs
│   └── settings.ejs
└── src/
    ├── bot/
    │   ├── telegram.js
    │   └── messages.js
    ├── config/
    │   └── database.js
    ├── database/
    │   └── init.js
    ├── middleware/
    │   └── adminAuth.js
    ├── services/
    │   ├── groupService.js
    │   ├── transactionService.js
    │   ├── employeeService.js
    │   ├── salaryService.js
    │   ├── closingService.js
    │   └── notificationService.js
    ├── utils/
    │   └── format.js
    └── web/
        └── adminRoutes.js
```

---

## 3) Cài đặt và chạy local

```bash
npm install
npm start
```

Mặc định ứng dụng chạy ở:
- `http://localhost:8080`

---

## 4) Biến môi trường bắt buộc

Tạo file `.env`:

```env
PORT=8080
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
DATABASE_SSL=true

BOT_TOKEN=your_telegram_bot_token

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_strong_password
```

Bản hiện tại yêu cầu đủ:
- `DATABASE_URL`
- `BOT_TOKEN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

---

## 5) Route chính

- `GET /` → redirect `/admin`
- `GET /health` → kiểm tra kết nối database
- `GET /admin/dashboard`
- `GET/POST /admin/groups`
- `GET /admin/groups/:id`
- `POST /admin/groups/:id/edit`
- `POST /admin/groups/:id/transaction`
- `GET /admin/groups/:id/transactions`
- `POST /admin/transactions/:id/edit`
- `POST /admin/transactions/:id/delete`
- `GET /admin/groups/:id/employees`
- `POST /admin/groups/:id/employees`
- `GET /admin/employees/:id/salary`
- `POST /admin/employees/:id/salary/add`
- `POST /admin/employees/:id/salary/advance`
- `POST /admin/employees/:id/salary/close-day`
- `POST /admin/employees/:id/salary/close-month`
- `POST /admin/groups/:id/close-expense-day`
- `POST /admin/groups/:id/close-expense-month`
- `GET /admin/settings`

---

## 6) Tính năng chính

- Quản lý nhóm + Telegram Chat ID
- Ghi nhận thu/chi theo ngày
- Quản lý nhân viên theo nhóm
- Ghi lương và ứng lương theo ngày
- Chốt lương ngày/tháng
- Chốt chi tiêu ngày/tháng
- Gửi thông báo Telegram tự động cho các nghiệp vụ chính
- Basic Auth bảo vệ toàn bộ trang admin

---

## 7) Telegram notification

Các mẫu message hiện có:
- `transactionMessage`
- `salaryDayMessage`
- `salaryMonthMessage`
- `expenseDayClosingMessage`
- `expenseMonthClosingMessage`

---

## 8) Khởi tạo database tự động

Khi khởi động app, `initDatabase()` sẽ tự tạo bảng nếu chưa có:
- `groups`
- `transactions`
- `employees`
- `salary_entries`
- `salary_advances`
- `daily_closings`
- `monthly_closings`
- `salary_daily_closings`
- `salary_monthly_closings`

Kèm index cho truy vấn theo ngày/tháng để tối ưu hiệu năng.

---

## 9) Deploy Railway

`railway.json` hiện tại:
- Build: `NIXPACKS`
- Start command: `npm start`
- Restart policy: `ON_FAILURE` (max retries: `10`)

Biến môi trường cần set trên Railway:
- `DATABASE_URL`
- `DATABASE_SSL=true`
- `BOT_TOKEN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `PORT` (Railway có thể tự cấp)

---

## 10) Kiểm tra sau deploy

1. Mở `/health` → phải báo `database: connected`
2. Truy cập `/admin` và đăng nhập Basic Auth
3. Tạo group + telegram_chat_id
4. Tạo giao dịch thử và kiểm tra Telegram
5. Test chốt lương/chốt chi tiêu ngày-tháng

---

## 11) Bảo mật khuyến nghị

- Không commit `.env`
- Dùng mật khẩu admin mạnh
- Chỉ cấp quyền admin cho người cần thiết
- Giữ kín `BOT_TOKEN` và `DATABASE_URL`
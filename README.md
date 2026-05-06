# Samwin Infotech - Business Management System

A complete full-stack office management application for **Samwin Infotech** — managing insurance, mobile shop, billing, employees, and day-to-day business operations from a single dashboard.

**Company:** Samwin Infotech
**Address:** 14-5-10D, TVK Street, Near CSI Church, Sambavarvadakarai - 627856, Tenkasi
**Contact:** 9566181510, 9944514911

---

## Tech Stack

| Layer          | Technology                                                        |
| -------------- | ----------------------------------------------------------------- |
| Frontend       | React 19, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query |
| Backend        | Node.js, Express 4, Mongoose 8, JWT Authentication                |
| Database       | MongoDB 8                                                         |
| UI Icons       | Lucide React                                                      |
| Forms          | React Hook Form + Zod validation                                  |
| Notifications  | react-hot-toast, Web Audio API (beep alerts)                      |
| Process Manager| PM2 (auto-start on Windows boot)                                  |

---

## Features Overview

| Module              | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| Dashboard           | Sales income, expenses, profit/loss, overdue & reminders   |
| Customers           | Full CRM with Aadhaar, PAN, nominees, profiles             |
| Vehicle Insurance   | Policy tracking, expiry alerts, WhatsApp reminders         |
| Credits (Lending)   | FIFO payments, auto due-date shifting, bulk WhatsApp       |
| Stock Management    | Mobile, phone & computer accessories with sell tracking    |
| Sales               | Daily sales, categories, today's income, reports           |
| Expenses            | Category-based expense tracking with summaries             |
| Billing             | GST Invoice, Quotation, Receipt with print-ready layout    |
| Employees           | Staff management with attendance & salary calculation      |
| Broadcast           | Bulk WhatsApp messaging with file attachments              |
| Reports             | Premium collection, policy/customer/scheme-wise + CSV      |
| LMS (Training)      | Office work guides with credentials for new workers        |
| My Reminders        | Recurring popup reminders with beep sound                  |
| Notifications       | In-app bell with badge count, auto daily checks            |

---

## Detailed Features

### Dashboard
- Today's Income, Total Sales, Total Expenses, Net Profit/Loss
- Overdue payment alerts with quick Pay & WhatsApp actions
- Upcoming premium reminders (next 15 days)
- Vehicle insurance expiring/expired alerts
- Recent policies overview
- Reset all data option (admin only)
- **Live IST clock** in header with date

### Customers
- Create, edit, search, delete customers
- Personal details: Aadhaar, PAN, DOB, address
- Multiple nominees with relationship tracking
- Customer profile page with linked policies
- Text search across name, phone, email, PAN

### Vehicle Insurance
- Dashboard stat cards: Total Policies, Active, Monthly Collection, Expiring Soon, Expired
- CRUD with customer linking
- File uploads: RC Book, Old Insurance documents
- Auto reminder start date (10 days before expiry)
- Insurance type management
- WhatsApp reminder with pre-filled messages
- Filter: All / Expiring Soon / Expired

### Insurance Schemes & Policies
- 20+ pre-seeded schemes (LIC, HDFC, SBI, Star Health, etc.)
- 4-step policy creation wizard: Customer > Scheme > Details > Review
- Premium frequency tracking (monthly/quarterly/half-yearly/yearly)
- Auto next premium date calculation
- Document upload per policy
- Policy status: Active, Matured, Lapsed, Surrendered, Cancelled

### Payments
- Record payments against policies
- Auto-advance next premium date on payment
- Payment collection page with overdue + upcoming views
- Payment history with date filters and CSV export

### Credits (Lending)
- One open credit per customer (duplicate triggers top-up prompt)
- **FIFO payment allocation** across chunks (earliest due date first)
- **Auto due-date shifting** when a chunk is fully paid
- Per-chunk due dates for credits and top-ups
- Transaction history with credit/topup/payment timeline
- Bulk WhatsApp reminders for overdue credits
- Force-close option

### Stock Management
- **3 categories:** Mobile, Phone Accessories, Computer Accessories
- Auto-incrementing unique code per item
- Full specs: Brand, Model, RAM, Storage, Display, Network, Color
- Purchase price, selling price, purchased from
- **Sell modal** with customer details, final price, auto profit calculation
- Stock reports with purchase/sold/profit summary
- Brand filter, status filter (In Stock / Sold)

### Sales
- Category-based sales tracking (SIM, Recharge, Accessories, etc.)
- Category management (create/edit/delete)
- Summary: Today's Income, Total Sales, Total Expenses, Net Profit/Loss
- Sales reports with daily/category/payment breakdown
- Payment method tracking (Cash, UPI, Bank Transfer, Card)

### Expenses
- Category-based expense tracking with custom categories
- Summary dashboard: Total, entries, categories, average per entry
- Top categories quick view
- Filter by category, payment method, date range
- All payment methods supported

### Billing (Invoice / Quotation / Receipt)
- **3 document types** with independent auto-numbering (INV-0001, QTN-0001, RCT-0001)
- Company header with **logo** and address
- **GST Number** shown only on Invoices (GSTIN: 33CQNPS0562L1ZM)
- **HSN Code** shown only on Invoice and Quotation (hidden in Receipt)
- Customer details: Name, Address, Phone, GST
- Items table: Product, HSN, Quantity, Price, Taxable Value (auto-calculated)
- CGST/SGST with configurable rates
- Amount in words (Indian format: Lakhs, Crores)
- Notes section
- Authorized signatory block
- **Services footer:** Computers, Printers, Laptops, Mobiles, CCTV Cameras Sales and Service. Billing Software, Website Design, Mobile Application and all IT Related Hardware and Software Services.
- **Print-ready A4 layout** — opens in new window for printing

### Employees & Attendance
- Employee management: Name, Phone, Designation, Salary, Bank Details, Aadhaar
- Daily attendance with 4 time entries:
  - Morning In, Afternoon Out, After Lunch In, Night Out
- Work details and location per day
- Daily expenses tracking per employee
- Status: Present, Absent, Half Day, Leave
- **Auto salary calculation:** Monthly salary / days in month x working days
- **Net payable:** Earned salary + expenses
- Month-by-month salary report with navigation

### Broadcast (WhatsApp)
- Compose message with `{name}` placeholder
- Upload media files (images, videos, audio, documents — up to 50MB)
- Select individual or all customers
- Preview before sending
- Bulk WhatsApp send with 800ms delay between messages

### LMS (Training)
- Add office work guides for new workers
- Fields: Title, Link, User ID, Password, Instructions
- Password show/hide toggle with copy-to-clipboard
- Clickable external links
- Search across all entries
- Card-based layout with gradient headers

### My Reminders
- Recurring reminders: Every 5, 10, 15, 30 mins / 1, 3, 6, 10 hours
- End date selection (calendar)
- **Global popup** with beep sound on any page when due
- Auto-deactivate when end date is reached
- Progress bar showing time elapsed
- Active / Completed / All filters
- Stop and delete controls

### Reports
- Premium Collection report (daily breakdown)
- Policy-wise report (total paid per policy)
- Customer-wise report (total paid per customer)
- Scheme-wise report (policies per scheme)
- Date range filter
- **CSV export** for all report types

### Authentication & Roles
- JWT-based authentication (7-day token expiry)
- Role-based access: **Admin** and **Agent**
- Admin-only features: delete records, reset data, register users
- Auto-redirect to login on token expiry

---

## Project Structure

```
Samwin/Personal Assistant/
├── client/                          # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── layout/              # AppLayout, Header (live clock), Sidebar
│       │   └── ui/                  # Modal, Spinner, Badge, ConfirmDialog
│       ├── features/
│       │   ├── auth/                # LoginPage, AuthContext
│       │   ├── billing/             # BillingPage (Invoice/Quotation/Receipt)
│       │   ├── broadcast/           # BroadcastPage, broadcastApi
│       │   ├── credits/             # CreditListPage, CreditDetailPage, NewCreditPage
│       │   ├── customers/           # CustomerListPage, CustomerFormPage, CustomerProfilePage
│       │   ├── custom-reminders/    # CustomReminderPage, ReminderPopup
│       │   ├── dashboard/           # DashboardPage
│       │   ├── employees/           # EmployeeListPage, AttendancePage
│       │   ├── expenses/            # ExpenseListPage
│       │   ├── lms/                 # LMSPage
│       │   ├── notifications/       # NotificationBell
│       │   ├── payments/            # PaymentCollectionPage, PaymentHistoryPage
│       │   ├── policies/            # PolicyListPage, PolicyEntryPage, PolicyDetailPage
│       │   ├── reminders/           # RemindersPage (policy reminders)
│       │   ├── reports/             # ReportsPage
│       │   ├── sales/               # SalesPage
│       │   ├── schemes/             # SchemeListPage, SchemeFormPage
│       │   ├── stock/               # StockListPage, StockReportPage, Accessories
│       │   └── vehicle-insurance/   # VehicleInsurancePage
│       ├── hooks/                   # useDebounce
│       ├── lib/                     # axios, queryClient, utils
│       ├── router.jsx
│       └── main.jsx
│
├── server/                          # Node.js/Express backend
│   └── src/
│       ├── config/                  # env.js, db.js
│       ├── controllers/             # 16 controllers
│       ├── middleware/               # auth, roleCheck, validate, errorHandler, upload
│       ├── models/                  # 17 models
│       ├── routes/                  # 17 route files
│       ├── seeds/                   # seed.js, seedStock.js, exportData.js, importData.js
│       ├── services/                # reminderService, whatsappService
│       ├── utils/                   # responseHelper, dateHelpers
│       ├── validators/              # 10 Joi validators
│       ├── app.js
│       └── server.js
│
├── render.yaml                      # Render deployment config
└── README.md
```

---

## API Endpoints (50+ routes)

### Auth
| Method | Endpoint                | Description             |
| ------ | ----------------------- | ----------------------- |
| POST   | `/api/auth/login`       | Login (JWT token)       |
| POST   | `/api/auth/register`    | Register user (admin)   |
| GET    | `/api/auth/me`          | Get current user        |
| PUT    | `/api/auth/change-password` | Change password     |

### Customers
| Method | Endpoint                    | Description             |
| ------ | --------------------------- | ----------------------- |
| GET    | `/api/customers`            | List (paginated)        |
| GET    | `/api/customers/search?q=`  | Search by name/phone    |
| GET    | `/api/customers/:id`        | Get single              |
| POST   | `/api/customers`            | Create                  |
| PUT    | `/api/customers/:id`        | Update                  |
| DELETE | `/api/customers/:id`        | Delete (admin)          |

### Vehicle Insurance
| Method | Endpoint                              | Description           |
| ------ | ------------------------------------- | --------------------- |
| GET    | `/api/vehicle-insurance`              | List (paginated)      |
| GET    | `/api/vehicle-insurance/:id`          | Get single            |
| GET    | `/api/vehicle-insurance/types`        | List insurance types   |
| GET    | `/api/vehicle-insurance/due-reminders`| Due reminders         |
| POST   | `/api/vehicle-insurance`              | Create (with files)   |
| POST   | `/api/vehicle-insurance/types`        | Create type           |
| PUT    | `/api/vehicle-insurance/:id`          | Update (with files)   |
| DELETE | `/api/vehicle-insurance/:id`          | Delete                |

### Schemes, Policies, Payments, Credits
| Method | Endpoint                              | Description                        |
| ------ | ------------------------------------- | ---------------------------------- |
| GET    | `/api/schemes`, `/api/policies`, etc. | List (paginated)                   |
| POST   | `/api/credits`                        | Create (409 if duplicate)          |
| PUT    | `/api/credits/:id/topup`              | Top-up with amount + due date      |
| PUT    | `/api/credits/:id/payment`            | Record payment (FIFO allocation)   |
| PUT    | `/api/credits/:id/close`              | Force-close credit                 |

### Stock
| Method | Endpoint                     | Description             |
| ------ | ---------------------------- | ----------------------- |
| GET    | `/api/stock`                 | List with filters       |
| GET    | `/api/stock/brands`          | Distinct brand list     |
| GET    | `/api/stock/report/summary`  | Purchase/sell report    |
| POST   | `/api/stock`                 | Add new item            |
| PUT    | `/api/stock/:id`             | Update item             |
| PUT    | `/api/stock/:id/sell`        | Mark as sold            |
| DELETE | `/api/stock/:id`             | Delete                  |

### Sales, Expenses, Billing
| Method | Endpoint                        | Description              |
| ------ | ------------------------------- | ------------------------ |
| GET    | `/api/sales/summary`            | Sales summary            |
| GET    | `/api/sales/report`             | Sales report             |
| GET    | `/api/expenses/summary`         | Expense summary          |
| GET    | `/api/billing/next-number/:type`| Preview next number      |
| POST   | `/api/billing`                  | Create invoice/quotation |

### Employees & Attendance
| Method | Endpoint                              | Description             |
| ------ | ------------------------------------- | ----------------------- |
| GET    | `/api/employees`                      | List employees          |
| GET    | `/api/employees/:id/salary-report`    | Monthly salary report   |
| POST   | `/api/employees`                      | Create employee         |
| GET    | `/api/attendance`                     | List attendance         |
| POST   | `/api/attendance`                     | Mark attendance         |

### LMS, Reminders, Broadcast, Notifications
| Method | Endpoint                        | Description                  |
| ------ | ------------------------------- | ---------------------------- |
| GET    | `/api/lms`                      | List training entries        |
| GET    | `/api/custom-reminders/due`     | Get due reminders (polling)  |
| POST   | `/api/broadcast/upload`         | Upload broadcast media       |
| GET    | `/api/notifications`            | List notifications           |
| PUT    | `/api/notifications/read-all`   | Mark all as read             |

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** 6+ (local or Atlas)

### 1. Clone / Copy the project

```bash
cd "Samwin/Personal Assistant"
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Setup environment

The `server/.env` file should contain:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/insurance-tracker
JWT_SECRET=samwin-insurance-tracker-jwt-secret-2024
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 4. Seed the database

```bash
cd server
npm run seed
```

Creates admin user and 20+ insurance schemes.

### 5. Run the application

**Development (2 terminals):**
```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

**Production (single terminal):**
```bash
cd client && npm run build
cd ../server && npm start
```

Open: **http://localhost:5000**

### 6. PM2 Setup (Auto-start on boot)

```bash
npm install -g pm2
cd server
pm2 start src/server.js --name "samwin"

# Windows auto-startup
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

### 7. Access from phone (same WiFi)

```bash
ipconfig    # Find your IPv4 address
```

Open on phone: `http://YOUR_IP:5000`

---

## Data Backup & Restore

### Export (current PC)

```bash
cd server
node src/seeds/exportData.js
```

Creates a timestamped backup folder with all data as JSON files.

### Import (new PC)

```bash
cd server
node src/seeds/importData.js "../backup_YYYY-MM-DD_HH-MM-SS"
```

Restores all data including customers, stock, sales, invoices, attendance, etc.

---

## Default Credentials

| Role  | Username | Password |
| ----- | -------- | -------- |
| Admin | admin    | admin    |

---

## PM2 Quick Reference

| Command              | Description              |
| -------------------- | ------------------------ |
| `pm2 status`         | Check if running         |
| `pm2 logs samwin`    | View live logs           |
| `pm2 restart samwin` | Restart after changes    |
| `pm2 stop samwin`    | Stop the server          |
| `pm2 save`           | Save process list        |

---

## Key Design Decisions

1. **Sales-first dashboard** — Main dashboard shows today's income, total sales, expenses, and net profit/loss for quick business overview.

2. **Single credit per customer** — Prevents data fragmentation. New credit attempts auto-prompt top-up to existing credit.

3. **FIFO payment allocation** — Credit payments apply to earliest due-date chunk first, with auto due-date shifting.

4. **Billing with separate numbering** — INV-0001, QTN-0001, RCT-0001 sequences are independent. GST shown only on invoices.

5. **Attendance-based salary** — Auto-calculates earned salary from present days + half days, plus reimbursable expenses.

6. **Client-side reminder polling** — Due reminders checked every 30 seconds via React Query, with Web Audio API beep alerts.

7. **Feature-based frontend structure** — Each module has its own folder with pages + API hooks colocated.

8. **React Query for server state** — All API data managed through TanStack Query with automatic cache invalidation.

---

## Our Services

Computers, Printers, Laptops, Mobiles, CCTV Cameras Sales and Service. Billing Software, Website Design, Mobile Application and all IT Related Hardware and Software Services.

---

## License

Private - Samwin Infotech

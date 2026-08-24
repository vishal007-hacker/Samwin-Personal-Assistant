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
| Backend        | Node.js, Express 4, Prisma ORM, JWT Authentication                |
| Database       | PostgreSQL 16                                                     |
| UI Icons       | Lucide React                                                      |
| Forms          | React Hook Form + Zod validation                                  |
| Notifications  | react-hot-toast, Web Audio API (beep alerts)                      |
| Process Manager| PM2 (auto-start on Windows boot)                                  |

---

## Features Overview

| Module              | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| Dashboard           | Sales income, expenses, profit/loss, overdue & reminders + in-app backup/restore + **Push to GitHub** |
| **AI Assistant**    | **WhatsApp bot powered by local Ollama LLM — query data, add records, daily summaries** |
| Customers           | Full CRM with Aadhaar, PAN, nominees, referral, WhatsApp promo |
| Vehicle Insurance   | Policy tracking, expiry alerts, WhatsApp reminders         |
| Our Services        | Installations, addon works, service jobs with WhatsApp reminders |
| Device Service      | Customer-brought device repairs with **PIN/pattern lock storage** + Delivered status |
| Maintenance         | Office equipment maintenance schedule, history, cost tracking |
| Credits (Lending)   | FIFO payments, auto due-date shifting, bulk WhatsApp       |
| Stock Management    | Mobile, phone & computer accessories with sell tracking, code preview/edit |
| Sales               | Daily sales with **date-grouped collapsible view**, today's income, reports |
| Expenses            | Category-based expense tracking with summaries             |
| Billing             | GST Invoice, Quotation, Receipt with print-ready layout + **edit** |
| Accounts            | Recharge / Banking / AEPS / Cash balances with date-wise snapshot reports + print |
| Employees           | Staff management with attendance & salary calculation      |
| Broadcast           | Bulk WhatsApp messaging with file attachments              |
| Reports             | All-module tabs (Insurance, Sales, Stock, Finance, People, Accounts) + CSV |
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
- **Live IST clock** in header with date
- **In-app Backup / Restore / Push** (admin only):
  - **Backup Data** — downloads `.json` of every collection
  - **Download Full Backup** — downloads `.zip` with source code + DB data
  - **Restore Backup** — upload a `.json` to replace current data (with confirmation)
  - **Push to GitHub** — exports DB and pushes the backup folder to GitHub in one click

### AI Assistant (WhatsApp Bot)
A fully local, free, privacy-respecting WhatsApp agent that reads incoming messages from whitelisted staff phones, queries the business data via tool calls, and replies via WhatsApp.

**Stack:**
- **WhatsApp:** `whatsapp-web.js` (QR scan, runs on this PC — no paid API)
- **AI:** [Ollama](https://ollama.com) running locally (default model: `qwen2.5:7b`). Data never leaves your PC.
- **Access:** Whitelisted phones only (admin/staff roles)
- **Capabilities:** Read + add records + proactive notifications

**Read tools the bot can call:**
- Sales summary for any date range (`get_sales_summary`)
- Customer credit/loan balance by name or phone (`get_customer_credit`)
- Stock counts/values by category (`get_stock_summary`)
- Pending device services (`get_pending_device_services`)
- Current wallet balances (`get_account_balances`)
- Expiring vehicle insurance (`get_expiring_insurance`)
- Expenses summary (`get_expenses_summary`)

**Write tools (always require YES confirmation):**
- Add a sale (`add_sale`)
- Add an expense (`add_expense`)
- Change device-service status (`mark_device_service_status`)
- Update account balance (`update_account_balance`)

**Proactive notifications:**
- Daily 08:30 — yesterday's sales/expenses summary + wallet totals + credits due in next 7 days, sent to admin phones via WhatsApp.

**Dashboard page (`/ai-assistant`, admin-only):**
- Live connection status card (green/amber/red) with QR display when scan is needed
- Allowed-numbers whitelist manager
- Recent conversations audit log (TTL 30 days)
- Web-based test prompt (test the AI without WhatsApp)
- Manual "fire daily notification" button

**One-time setup:**
1. `winget install Ollama.Ollama`
2. `ollama pull qwen2.5:7b` (~4.7 GB)
3. Visit `/ai-assistant` → scan QR with phone (WhatsApp → Linked Devices)
4. Add your phone to Allowed Numbers as admin
5. Message "today sales" → bot replies

**Caveats:**
- whatsapp-web.js is unofficial; can break on WhatsApp UI updates.
- Ollama needs ~6 GB RAM with `qwen2.5:7b`; drop to `qwen2.5:3b` or `phi-3:mini` for slower PCs.
- Session folder (`server/session-samwin/`) contains auth tokens — gitignored.

### Customers
- Create, edit, search, delete customers
- Personal details: Aadhaar, PAN, DOB, address
- Multiple nominees with relationship tracking
- **Referral field** — track who referred each customer
- **WhatsApp promotional message button** — opens WhatsApp with the customer's phone + a customizable promo message
- **Colored action buttons** (WhatsApp / View / Edit / Delete) for at-a-glance use
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

### Our Services
- Track installations, addon works, and service jobs
- Customer dropdown linked to existing customer database
- **Type of work:** New Installation, Addon Works, Service
- Materials used, asking price, received cash, balance auto-calculated
- Notes per service entry
- **WhatsApp service-reminder button** — sends a follow-up reminder to the customer about their previous service
- **Colored action buttons** (WhatsApp / Edit / Delete)
- Date-range and type filters, search across materials/notes
- Summary cards: total services, total asked, total received with balance due
- CSV export

### Device Service (Repair Jobs)
- Track customer devices brought in for repair
- **Device Type dropdown with custom-add** — managed `DeviceType` collection seeded with Mobile/Laptop/Computer/Printer/Tablet/CCTV/Router/Other. "+ Add new type..." option in the dropdown lets you add and persist custom types inline.
- **Lock / Unlock Info** captured per device — PIN / Password / Pattern / Fingerprint / Face / None
  - Lock value masked in the table with eye-toggle to reveal and copy-to-clipboard button
- Serial number / IMEI, problem description, date, customer name + phone, amount
- **Status:** Pending → Ready → **Delivered** → Returned (color-coded badges; Delivered is blue)
- **WhatsApp button** sends a context-aware message based on status:
  - Ready/Delivered: "Your device is ready for pickup. Service charge: ₹X"
  - Returned: "Thank you for choosing Samwin Infotech…"
  - Pending: "Your device is being serviced. We will notify you once ready"
- Stat cards: Total / Pending / Ready / Delivered / Returned / Total Amount
- Filters: search (customer/phone/serial/problem) + dynamic type filter + status filter
- CSV export including lock info

### Maintenance (Office Equipment)
- Track office products that need recurring maintenance (printers, computers, AC, etc.)
- Per-product fields: name, category, serial/tag, location, frequency in days, next-due date, notes, active flag
- **Auto-calculated next maintenance date** from frequency
- **Color-coded status badges** per product: Overdue (red) / Due Soon ≤ 7d (amber) / On Track (green)
- **Maintenance History records** per product:
  - Date, work done, cost, service person name + contact, next due date override
  - Adding a record auto-shifts the product's next maintenance date
- **Click any product name** → modal showing full details + history with quick stats (frequency, next due, total spent, service count)
- **WhatsApp button** on history records — opens chat with service person
- **Cost-by-category bars** + **Upcoming schedule** report panels at bottom of page
- Stat cards: Total Products / Overdue / Due Soon / On Track / Spent This Month
- CSV export of full history

### Accounts
- Single page tracking balances across **4 sections** with auto-calculated totals:
  - **Recharge:** Airtel, VI, Jio, BSNL, Multi RC, Available Cash
  - **Banking:** Union, KVB, Available Cash
  - **AEPS:** Airtel, Relipay, Digipay, Available Cash
  - **Available Cash:** Total Cash on Hand
- **Inline editing** — click any balance number to edit, Enter to save
- **Add custom items** to any section (e.g., new bank, new payment provider)
- **Auto-seeded defaults** — first time you open the page (or whenever a section is empty), the standard items are populated
- Section totals + Grand Total displayed live as you edit
- Color-coded sections for quick scanning

### Accounts — Snapshot Report (in-page)
- **Save Snapshot** — captures current balances under a chosen date (one snapshot per date, overwrites if re-saved)
- **Date-range filter** (defaults to current month)
- **Card-row format** — each snapshot rendered as a row of 5 colored cards (Grand Total + Recharge + Banking + AEPS + Cash) matching the top summary
- **Period totals** at the bottom across all snapshots in the range
- **Print** — opens an A4-formatted print page with company header and same card layout (page-break-friendly)
- **CSV export** with date-wise rows and column-wise totals

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
- **Date-grouped collapsible list** — each row shows the day's total + count; click to expand and see that day's sales detail
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
- **Edit** existing invoices/quotations/receipts — preserves the original document number

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
- **Grouped tabs** covering every module:
  - **Insurance:** Premium Collection, Policy-wise, Customer-wise, Scheme-wise, Vehicle Insurance
  - **Sales & Inventory:** Stock, Sales, Billing
  - **Finance:** Credit, Expenses
  - **People:** Employees, Attendance
  - **Other:** LMS
- Each tab: summary cards, sortable table, **CSV export**
- Date-range filter (where applicable)

### Per-Module Export CSV Buttons

In addition to the Reports page, every list page has its own **Export CSV** button so you can download exactly what you're viewing:

Customers · Vehicle Insurance · Credits · Stock (Mobile / Phone Accessories / Computer Accessories) · Sales · Expenses · Billing · LMS · Employees · Custom Reminders · **Our Services**

The shared `exportCSV()` helper lives at `client/src/lib/utils.js`.

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
│       │   ├── accounts/            # AccountsPage, accountApi (recharge/banking/AEPS/cash + snapshot report)
│       │   ├── ai-assistant/        # AIAssistantPage, aiAssistantApi (WhatsApp bot dashboard)
│       │   ├── auth/                # LoginPage, AuthContext
│       │   ├── billing/             # BillingPage (Invoice/Quotation/Receipt + edit)
│       │   ├── broadcast/           # BroadcastPage, broadcastApi
│       │   ├── credits/             # CreditListPage, CreditDetailPage, NewCreditPage
│       │   ├── customers/           # CustomerListPage, CustomerFormPage, CustomerProfilePage
│       │   ├── custom-reminders/    # CustomReminderPage, ReminderPopup
│       │   ├── dashboard/           # DashboardPage (with backup/restore buttons)
│       │   ├── device-service/      # DeviceServicePage, deviceServiceApi (repair jobs)
│       │   ├── employees/           # EmployeeListPage, AttendancePage
│       │   ├── expenses/            # ExpenseListPage
│       │   ├── lms/                 # LMSPage
│       │   ├── maintenance/         # MaintenancePage, maintenanceApi (office equipment)
│       │   ├── notifications/       # NotificationBell
│       │   ├── payments/            # PaymentCollectionPage, PaymentHistoryPage
│       │   ├── policies/            # PolicyListPage, PolicyEntryPage, PolicyDetailPage
│       │   ├── reminders/           # RemindersPage (policy reminders)
│       │   ├── reports/             # ReportsPage (all-module grouped tabs)
│       │   ├── sales/               # SalesPage
│       │   ├── schemes/             # SchemeListPage, SchemeFormPage
│       │   ├── services/            # ServicesPage, serviceApi (Our Services)
│       │   ├── stock/               # StockListPage (with code preview/edit), StockReportPage, Accessories
│       │   └── vehicle-insurance/   # VehicleInsurancePage
│       ├── hooks/                   # useDebounce
│       ├── lib/                     # axios, queryClient, utils
│       ├── router.jsx
│       └── main.jsx
│
├── server/                          # Node.js/Express backend
│   └── src/
│       ├── config/                  # env.js, db.js
│       ├── controllers/             # 26+ controllers (incl. service, account, backup, maintenance, device-service, ai)
│       ├── middleware/               # auth, roleCheck, validate, errorHandler, upload
│       ├── models/                  # 28 models (incl. Service, Account, AccountSnapshot, Maintenance*, DeviceService, DeviceType, AllowedNumber, AIConversation)
│       ├── routes/                  # 25+ route files
│       ├── seeds/                   # seed.js, seedStock.js, exportData.js, importData.js
│       ├── services/                # reminderService, whatsappService, whatsappBotService, ollamaService, aiTools, aiAgentService, aiNotificationService
│       ├── utils/                   # responseHelper, dateHelpers
│       ├── validators/              # 17+ Joi validators
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

### Our Services
| Method | Endpoint                | Description                   |
| ------ | ----------------------- | ----------------------------- |
| GET    | `/api/services`         | List services (filterable)    |
| GET    | `/api/services/:id`     | Get single service            |
| POST   | `/api/services`         | Create service                |
| PUT    | `/api/services/:id`     | Update service                |
| DELETE | `/api/services/:id`     | Delete service                |

### Accounts (Wallet Balances)
| Method | Endpoint                              | Description                              |
| ------ | ------------------------------------- | ---------------------------------------- |
| GET    | `/api/accounts`                       | List accounts grouped by section (auto-seeds defaults) |
| POST   | `/api/accounts`                       | Add new account row                      |
| PUT    | `/api/accounts/:id`                   | Update balance / name                    |
| DELETE | `/api/accounts/:id`                   | Delete account row                       |
| GET    | `/api/accounts/snapshots?from=&to=`   | List date-wise balance snapshots         |
| POST   | `/api/accounts/snapshots`             | Save current balances under a date       |
| DELETE | `/api/accounts/snapshots/:id`         | Delete a snapshot                        |

### Maintenance
| Method | Endpoint                                  | Description                              |
| ------ | ----------------------------------------- | ---------------------------------------- |
| GET    | `/api/maintenance/products`               | List products (with last-serviced stats) |
| POST   | `/api/maintenance/products`               | Add product to maintain                  |
| PUT    | `/api/maintenance/products/:id`           | Update product                           |
| DELETE | `/api/maintenance/products/:id`           | Delete product (cascades records)        |
| GET    | `/api/maintenance/records`                | List maintenance history                 |
| POST   | `/api/maintenance/records`                | Add a service record (auto-shifts next due) |
| PUT    | `/api/maintenance/records/:id`            | Update record                            |
| DELETE | `/api/maintenance/records/:id`            | Delete record                            |

### Device Service (Repair Jobs)
| Method | Endpoint                              | Description                                |
| ------ | ------------------------------------- | ------------------------------------------ |
| GET    | `/api/device-service`                 | List service entries (filterable)          |
| GET    | `/api/device-service/:id`             | Get single entry                           |
| POST   | `/api/device-service`                 | Create entry                               |
| PUT    | `/api/device-service/:id`             | Update entry / change status               |
| DELETE | `/api/device-service/:id`             | Delete entry                               |

### Backup / Restore (admin only)
| Method | Endpoint                  | Description                                          |
| ------ | ------------------------- | ---------------------------------------------------- |
| GET    | `/api/backup/data`        | Download all collections as a single JSON file       |
| GET    | `/api/backup/full`        | Download zip with source code + per-collection JSON  |
| POST   | `/api/backup/restore`     | Upload a JSON backup to replace current data         |
| POST   | `/api/backup/git-push`    | Export DB and push backup folder to GitHub           |

### AI Assistant (admin only)
| Method | Endpoint                                  | Description                                          |
| ------ | ----------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/ai/status`                          | WhatsApp bot connection status + counters            |
| GET    | `/api/ai/qr`                              | Current QR code as PNG data URL (when scan needed)   |
| GET    | `/api/ai/allowed-numbers`                 | List whitelisted phones                              |
| POST   | `/api/ai/allowed-numbers`                 | Add phone to whitelist                               |
| PUT    | `/api/ai/allowed-numbers/:id`             | Update entry                                         |
| DELETE | `/api/ai/allowed-numbers/:id`             | Remove from whitelist                                |
| GET    | `/api/ai/conversations?phone=&limit=`     | Conversation audit log (TTL 30 days)                 |
| POST   | `/api/ai/test`                            | Web-based test prompt (no WhatsApp needed)           |
| POST   | `/api/ai/test-notification?type=`         | Manually fire a proactive notification               |

### Stock — extras
| Method | Endpoint                  | Description                              |
| ------ | ------------------------- | ---------------------------------------- |
| GET    | `/api/stock/next-code`    | Peek at next stock code (preview, no increment) |

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
- **PostgreSQL** 14+ (local or hosted)

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
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/samwin_db?schema=public"
JWT_SECRET=samwin-insurance-tracker-jwt-secret-2024
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# AI Assistant — local Ollama LLM
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# WhatsApp bot — set to 'false' to skip whatsapp-web.js init
ENABLE_WHATSAPP_BOT=true
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

There are **three ways** to back up and restore data:

### 1. In-app (Dashboard) — easiest

| Action | Button | What it does |
|---|---|---|
| Backup data | 🟦 **Backup Data** | Downloads `samwin-data-backup-<date>.json` |
| Backup data + code | 🟪 **Download Full Backup** | Downloads `samwin-full-backup-<date>.zip` (source + data) |
| Restore | 🟧 **Restore Backup** | Upload a `.json` backup; current data is replaced |

Admin-only. Requires being logged in.

### 2. CLI export/import (folder format)

```bash
# Backup
cd server
node src/seeds/exportData.js
# → creates backup_<date>/ folder with one JSON per collection

# Restore on another PC
cd server
node src/seeds/importData.js "../backup_2026-05-08_17-55-41"
```

### 3. Restore the JSON downloaded from the Dashboard via CLI

The Dashboard's "Backup Data" button downloads a **single JSON** (different shape from the folder backup). To use it from CLI, split it first:

```powershell
mkdir restore-tmp
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[1]));for(const[k,v]of Object.entries(j.collections)){fs.writeFileSync('restore-tmp/'+k+'.json',JSON.stringify(v,null,2))}" "samwin-data-backup-XXX.json"
cd server
node src/seeds/importData.js "../restore-tmp"
```

Or simpler: just use the **Restore Backup button on the Dashboard** to upload that same JSON.

### What gets backed up

All 26 collections — customers, stock, sales, invoices, attendance, services, accounts, snapshots, maintenance products + records, device-service entries, etc. Counters (stock codes, billing numbers) are also preserved so sequence numbers continue from the correct point.

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

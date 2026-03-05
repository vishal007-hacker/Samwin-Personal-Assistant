# Samwin Infotech - Insurance Management System

A full-stack web application for managing insurance policies, customer records, payments, credits, and automated reminders. Built for **Samwin Infotech** to streamline day-to-day insurance operations.

---

## Tech Stack

| Layer     | Technology                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | React 19, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query |
| Backend   | Node.js, Express 4, Mongoose 8, JWT Authentication                |
| Database  | MongoDB                                                           |
| UI Icons  | Lucide React                                                      |
| Charts    | Recharts                                                          |
| Notifications | react-hot-toast, Web Push (VAPID)                            |

---

## Features

### Customers
- Create, edit, and search customers
- Store personal details (Aadhaar, PAN, DOB, address, nominees)
- Customer profile page with linked policies, payments, and credits

### Insurance Schemes
- Define reusable insurance schemes (company, plan type, premium details)
- Link schemes to policies

### Policies
- Create policies linked to customers and schemes
- Track policy number, premium, tenure, maturity date
- Upload policy documents
- Policy detail view with full history

### Payments
- Collect premium payments against policies
- Payment history with search and filters
- Delete payments (admin only)

### Credits (Lending)
- Lend money to customers and track repayment
- **One open credit per customer** - duplicate attempts prompt a top-up instead
- **FIFO payment allocation** - payments apply to the earliest due-date chunk first
- **Per-chunk due dates** - each credit/top-up has its own due date
- **Auto due-date shifting** - when a chunk is fully paid, the credit's due date shifts to the next unpaid chunk
- Top-up existing credits with separate due dates
- Collect payments, force-close credits
- Customer credit report page with full transaction history
- Bulk WhatsApp reminders for overdue credits

### Reminders & Notifications
- Automated daily reminders for upcoming premium dues and overdue credits
- In-app notification bell with badge count
- WhatsApp message integration (opens WhatsApp with pre-filled messages)

### Dashboard
- Overview stats (total customers, policies, collections, pending dues)
- Admin: Reset all data option

### Reports
- Exportable reports (CSV) for policies, payments, and collections

### Authentication & Roles
- JWT-based authentication (7-day token expiry)
- Role-based access: **Admin** and **Agent**
- Admin-only features: delete records, reset data

---

## Project Structure

```
Samwin/Personal Assistant/
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── layout/         # AppLayout, Header, Sidebar
│       │   └── ui/             # Modal, Spinner, Badge, ConfirmDialog
│       ├── features/
│       │   ├── auth/           # LoginPage, AuthContext
│       │   ├── customers/      # CustomerListPage, CustomerFormPage, CustomerProfilePage
│       │   ├── credits/        # CreditListPage, CreditDetailPage, NewCreditPage
│       │   ├── dashboard/      # DashboardPage
│       │   ├── notifications/  # NotificationBell
│       │   ├── payments/       # PaymentCollectionPage, PaymentHistoryPage
│       │   ├── policies/       # PolicyListPage, PolicyEntryPage, PolicyDetailPage
│       │   ├── reminders/      # RemindersPage
│       │   ├── reports/        # ReportsPage
│       │   └── schemes/        # SchemeListPage, SchemeFormPage
│       ├── hooks/              # useDebounce
│       ├── lib/                # axios, queryClient, utils
│       ├── router.jsx
│       ├── App.jsx
│       └── main.jsx
│
├── server/                     # Node.js/Express backend
│   └── src/
│       ├── config/             # env.js, db.js
│       ├── controllers/        # auth, customer, scheme, policy, payment,
│       │                       # credit, dashboard, report, notification, reminder
│       ├── middleware/          # auth, roleCheck, validate, errorHandler, upload
│       ├── models/             # User, Customer, Scheme, Policy, Payment,
│       │                       # Credit, Notification
│       ├── routes/             # All route files
│       ├── seeds/              # seed.js (sample data)
│       ├── services/           # reminderService, whatsappService
│       ├── utils/              # responseHelper, dateHelpers
│       ├── validators/         # Joi schemas (customer, scheme, policy, payment, credit)
│       ├── app.js
│       └── server.js
│
└── README.md
```

---

## API Endpoints

### Auth
| Method | Endpoint          | Description       |
| ------ | ----------------- | ----------------- |
| POST   | `/api/auth/login` | Login (JWT token) |

### Customers
| Method | Endpoint                    | Description             |
| ------ | --------------------------- | ----------------------- |
| GET    | `/api/customers`            | List (paginated)        |
| GET    | `/api/customers/search?q=`  | Search by name/phone    |
| GET    | `/api/customers/:id`        | Get single customer     |
| POST   | `/api/customers`            | Create customer         |
| PUT    | `/api/customers/:id`        | Update customer         |
| DELETE | `/api/customers/:id`        | Delete (admin)          |

### Schemes
| Method | Endpoint           | Description    |
| ------ | ------------------ | -------------- |
| GET    | `/api/schemes`     | List all       |
| POST   | `/api/schemes`     | Create scheme  |
| PUT    | `/api/schemes/:id` | Update scheme  |
| DELETE | `/api/schemes/:id` | Delete (admin) |

### Policies
| Method | Endpoint            | Description     |
| ------ | ------------------- | --------------- |
| GET    | `/api/policies`     | List (paginated)|
| GET    | `/api/policies/:id` | Get single      |
| POST   | `/api/policies`     | Create policy   |
| PUT    | `/api/policies/:id` | Update policy   |
| DELETE | `/api/policies/:id` | Delete (admin)  |

### Payments
| Method | Endpoint             | Description     |
| ------ | -------------------- | --------------- |
| GET    | `/api/payments`      | List (paginated)|
| POST   | `/api/payments`      | Record payment  |
| DELETE | `/api/payments/:id`  | Delete (admin)  |

### Credits
| Method | Endpoint                          | Description                         |
| ------ | --------------------------------- | ----------------------------------- |
| GET    | `/api/credits`                    | List (paginated, filter by status)  |
| GET    | `/api/credits/:id`                | Get single credit                   |
| GET    | `/api/credits/customer/:customerId` | All credits for a customer       |
| POST   | `/api/credits`                    | Create credit (409 if duplicate)    |
| PUT    | `/api/credits/:id/topup`          | Top-up with amount + due date       |
| PUT    | `/api/credits/:id/payment`        | Record payment (FIFO allocation)    |
| PUT    | `/api/credits/:id/close`          | Force-close credit                  |
| DELETE | `/api/credits/:id`                | Delete (admin)                      |

### Dashboard & Reports
| Method | Endpoint               | Description           |
| ------ | ---------------------- | --------------------- |
| GET    | `/api/dashboard`       | Dashboard stats       |
| DELETE | `/api/dashboard/reset` | Reset all data (admin)|
| GET    | `/api/reports`         | Generate reports      |

### Notifications & Reminders
| Method | Endpoint                      | Description              |
| ------ | ----------------------------- | ------------------------ |
| GET    | `/api/notifications`          | List notifications       |
| PUT    | `/api/notifications/:id/read` | Mark as read             |
| POST   | `/api/reminders/run`          | Manually trigger reminders|

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local or Atlas cloud)

### 1. Clone the repository

```bash
git clone <repo-url>
cd "Samwin/Personal Assistant"
```

### 2. Setup environment variables

Create a `.env` file in the **project root** (or `server/` directory):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/insurance-tracker
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Optional: Web Push notifications (VAPID keys)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:your@email.com
```

### 3. Install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Seed the database (optional)

```bash
cd server
npm run seed
```

### 5. Run the application

Open **two terminals**:

**Terminal 1 - Backend** (runs on port 5000):
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend** (runs on port 5173):
```bash
cd client
npm run dev
```

Open your browser at: **http://localhost:5173**

### Production Build

```bash
# Build the frontend
cd client
npm run build

# The server serves the built files from client/dist
cd ../server
npm start
```

---

## Default Credentials

After seeding, use these credentials to log in:

| Role  | Username       | Password   |
| ----- | -------------- | ---------- |
| Admin | (check seed.js)| (check seed.js) |

---

## Key Design Decisions

1. **Single credit per customer**: Only one open credit allowed per customer. New credit attempts for existing customers show a top-up prompt instead.

2. **FIFO payment allocation**: Each credit/top-up chunk has its own due date and paid amount tracker. Payments are applied to the earliest due-date chunk first.

3. **Auto due-date shifting**: The credit's top-level due date always reflects the earliest unpaid chunk. When a chunk is fully paid, it automatically shifts to the next one.

4. **Feature-based frontend structure**: Each feature (customers, policies, credits, etc.) has its own folder with page components and API hooks colocated.

5. **React Query for server state**: All API data is managed through TanStack Query with automatic cache invalidation on mutations.

---

## License

Private - Samwin Infotech

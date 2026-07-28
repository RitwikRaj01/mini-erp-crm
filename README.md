# Mini ERP + CRM Operations Portal

A small ERP/CRM system for a wholesale/distribution company covering customer CRM,
product & inventory management, and a sales challan workflow with stock control.

## Tech Stack

- **Backend:** Node.js, TypeScript, Express, PostgreSQL, Prisma ORM, JWT auth, Zod validation
- **Frontend:** React, TypeScript, Vite, React Router, Axios, plain CSS
- **Database:** PostgreSQL (local)

## Architecture

```
oss/
  backend/     Express + TypeScript REST API, Prisma schema/migrations
  frontend/    React + TypeScript SPA (Vite)
  postman_collection.json
```

The backend exposes REST APIs under `/auth`, `/customers`, `/products`, `/challans`.
Every route except `/auth/login` requires a `Bearer` JWT. Role checks are enforced
per-route in Express middleware (`requireRole`). The frontend is a single-page app
that stores the JWT in `localStorage` and attaches it to every request via an Axios
interceptor; it also hides Add/Edit actions for roles that aren't allowed to use them
(the backend still enforces this independently).

Business rules implemented:
- Confirming a challan reduces product stock; it is rejected with a clear error if
  any item's requested quantity exceeds current stock.
- Cancelling a **confirmed** challan restores the stock it had reduced.
- Challan line items store a snapshot of product name/SKU/price at the time of
  sale, not just a reference to the product.
- Every stock change (from a challan or a manual adjustment) is recorded in a
  stock movement log with type (IN/OUT), reason, and who made it.

## Prerequisites

- Node.js 18+ (`node -v` to check)
- PostgreSQL running locally (any version 13+)

Run backend and frontend in **two separate terminal windows/tabs** — both need
to keep running at the same time. Commands below are given for **macOS/Linux**
and **Windows (PowerShell or Command Prompt)** separately where they differ.

## 1. Database Setup

If you don't have PostgreSQL installed:

- **macOS:** `brew install postgresql@16 && brew services start postgresql@16`
- **Windows:** download and run the installer from
  [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
  (or `winget install PostgreSQL.PostgreSQL.16`). It installs as a Windows
  service and starts automatically; the setup wizard asks you to set a password
  for the `postgres` superuser — remember it, you'll need it below.

Create an empty database (name can be anything, used below as `mini_erp`):

**macOS/Linux:**
```bash
createdb mini_erp
```

**Windows (PowerShell or Command Prompt):**
```
createdb -U postgres mini_erp
```
(it will prompt for the `postgres` password you set during install)

## 2. Backend Setup

**macOS/Linux:**
```bash
cd backend
npm install
cp .env.example .env
```

**Windows (PowerShell):**
```powershell
cd backend
npm install
copy .env.example .env
```

**Windows (Command Prompt):**
```
cd backend
npm install
copy .env.example .env
```

Edit `.env` and set `DATABASE_URL` to point at your database:

- **macOS (Homebrew Postgres):** replace `<your-user>` with your OS username
  (run `whoami` to check it — this is the default superuser, no password needed):
  ```
  DATABASE_URL="postgresql://<your-user>@localhost:5432/mini_erp?schema=public"
  ```
- **Windows (or any password-protected Postgres):** use the `postgres` user and
  the password you set during install:
  ```
  DATABASE_URL="postgresql://postgres:<your-password>@localhost:5432/mini_erp?schema=public"
  ```

Leave `JWT_SECRET` and `PORT` as the example defaults — no need to change them
for local use.

Run migrations and seed the 4 role-based users (same command on every OS):

```bash
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
```

Start the API:

```bash
npm run dev
```

The API runs at `http://localhost:4000`. Check `GET /health` to confirm it's up.

## 3. Frontend Setup

In a new terminal:

**macOS/Linux:**
```bash
cd frontend
npm install
cp .env.example .env
```

**Windows (PowerShell or Command Prompt):**
```
cd frontend
npm install
copy .env.example .env
```

`.env` already points at the backend by default — no change needed:

```
VITE_API_URL=http://localhost:4000
```

Start the app (same command on every OS):

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## Test Login Credentials

All seeded users share the password `password123`.

| Role      | Email                 | Password    |
|-----------|------------------------|-------------|
| Admin     | admin@erp.test         | password123 |
| Sales     | sales@erp.test         | password123 |
| Warehouse | warehouse@erp.test     | password123 |
| Accounts  | accounts@erp.test      | password123 |

## Walkthrough (for a first-time user)

1. Open `http://localhost:5173`. You'll land on the **Login** page.
2. Log in as Sales: email `sales@erp.test`, password `password123`, click **Login**.
3. You land on the **Customers** page (empty at first). Click **Add Customer**.
   Fill in Name, Mobile, Email, Business Name, pick a Customer Type
   (Retail/Wholesale/Distributor) and Status (Lead/Active/Inactive), fill Address,
   then click **Save**. You're taken to that customer's detail page.
4. On the customer detail page, scroll to **Follow-ups**, type a note (optionally
   pick a follow-up date) and click **Add Follow-up** — it appears in the list below.
5. Log out (top-right) and log back in as Warehouse: `warehouse@erp.test` /
   `password123`. Go to the **Products** tab and click **Add Product**. Fill in
   Name, SKU/Code, Category, Unit Price, Initial Stock, Minimum Stock Alert Quantity,
   and Location, then **Save**.
6. On the product detail page, use the **Stock Movements** form to record an IN or
   OUT movement with a quantity and reason — the log below updates and the
   "Current Stock" figure changes accordingly.
7. Log back in as Sales (or Admin) and go to the **Challans** tab, click
   **New Challan**. Pick the customer you created, pick a product and quantity
   (click **Add Item** for more rows), then either:
   - **Save as Draft** — creates the challan without touching stock, or
   - **Save & Confirm** — creates it and immediately reduces stock (this will be
     rejected with an error if you request more than the available stock).
8. From a Draft challan's detail page you can **Edit**, **Confirm**, or **Cancel** it.
   From a Confirmed challan you can **Cancel** it, which restores the stock it
   had reduced.
9. Log in as Accounts (`accounts@erp.test`) to see the same data in read-only mode
   — Add/Edit buttons are hidden, and the backend also rejects any write attempt
   from this role with a 403.

## API Overview

See `postman_collection.json` (import into Postman; set the `baseUrl` and `token`
collection variables — `token` is the value returned by the login call).

| Method | Route                              | Notes                                  |
|--------|-------------------------------------|-----------------------------------------|
| POST   | /auth/login                         | Returns `{ token, user }`               |
| GET    | /customers                          | `search`, `status`, `customerType`, `page`, `limit` |
| POST   | /customers                          | Admin, Sales only                       |
| GET    | /customers/:id                      | Includes follow-ups                     |
| PUT    | /customers/:id                      | Admin, Sales only                       |
| POST   | /customers/:id/followups            | Admin, Sales only                       |
| GET    | /products                           | `search`, `lowStock`, `page`, `limit`   |
| POST   | /products                           | Admin, Warehouse only                   |
| GET    | /products/:id                       |                                          |
| PUT    | /products/:id                       | Admin, Warehouse only                   |
| GET    | /products/:id/stock-movements       |                                          |
| POST   | /products/:id/stock-movements       | Admin, Warehouse only; rejects OUT if insufficient stock |
| GET    | /challans                           | `status`, `page`, `limit`               |
| POST   | /challans                           | Admin, Sales only; `status: DRAFT\|CONFIRMED` |
| GET    | /challans/:id                       |                                          |
| PUT    | /challans/:id                       | Admin, Sales only; draft challans only  |
| POST   | /challans/:id/confirm                | Reduces stock, rejects on insufficient stock |
| POST   | /challans/:id/cancel                 | Restores stock if it was confirmed      |

All endpoints require `Authorization: Bearer <token>` except `/auth/login`.
Validation errors return `400` with details, missing auth returns `401`,
insufficient role returns `403`, missing records return `404`.

## Assumptions

- Purchase orders and invoices are mentioned in the business context but are not
  part of the "Core Modules Required" list, so they were intentionally left out
  of scope for this submission.
- "Notes" on a customer is a free-text field on the customer record; "Add
  follow-up notes" is a separate, timestamped list (`FollowUp`) shown on the
  customer detail page.
- Product `currentStock` is only set directly at creation time; afterwards it can
  only change through the stock movement log or a challan, so history is always
  traceable.
- Challan numbers are generated as `CH-000001`, `CH-000002`, ... based on the
  database id.
- Accounts role has read-only access across all modules (no invoicing module
  exists yet to give it a distinct write action).

## Known Limitations

- No deployment: this submission runs locally only, per the assignment's
  "AWS optional" clause.
- No automated test suite (unit/integration tests) — verified manually via the
  Postman collection and the walkthrough above.
- No pagination UI beyond simple Prev/Next (no jump-to-page or page-size control).
- No PDF export, image upload, Docker, or CI/CD — explicitly treated as
  out-of-scope bonus items for this submission.

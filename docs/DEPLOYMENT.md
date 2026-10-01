# Deployment & Production Setup Guide

## 1. Architecture Overview
`FOREX OS` is built as an enterprise Next.js 14 App Router application deployable to Vercel, Railway, AWS ECS, or standard containerized infrastructure.

---

## 2. Deploying to Vercel + Neon / Supabase PostgreSQL

### Step 1: Provision Cloud PostgreSQL Database
1. Create a free PostgreSQL instance on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the Connection Pooling or Direct Connection URI:
   ```
   postgresql://user:password@ep-sample-123.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Push Repository to GitHub
```bash
git add .
git commit -m "feat: complete Apple minimalism Forex OS"
git push origin main
```

### Step 3: Connect Project on Vercel
1. In the Vercel Dashboard, click **New Project** and import your repository.
2. Select **Framework Preset**: Next.js.
3. Configure the **Build & Development Settings**:
   - **Build Command**: `prisma generate && next build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Step 4: Environment Variables on Vercel
Add the following environment variables in Vercel Project Settings $\rightarrow$ Environment Variables:

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...` (from Neon/Supabase) | Cloud Postgres connection string |
| `JWT_SECRET` | 64+ char random hex string | Signs session authentication cookies |
| `NODE_ENV` | `production` | Enables optimized Next.js caching |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Base application domain |

### Step 5: Database Migration on Cloud Instance
Run the initial database migration from your local CLI or Vercel build step:
```bash
npx prisma db push
node prisma/seed.js
```

---

## 3. Local Development & Testing Instructions

### Prerequisites
- Node.js 18+ (tested on Node v22.14.0)
- PostgreSQL (or use the included local cluster script)

### Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Push schema to database
npx prisma db push

# 3. Seed demonstration trading desk data
node prisma/seed.js

# 4. Start Next.js development server
npm run dev
# OR start compiled production server
npm run build && npm run start
```

### Accessing the System
Open [http://localhost:3000](http://localhost:3000) in your browser.
Demo credentials:
- **Super Administrator**: `admin@example.com` / `Admin@123456`
- **Trading Operator**: `operator@example.com` / `Operator@123456`
- **Compliance Viewer**: `viewer@example.com` / `Viewer@123456`

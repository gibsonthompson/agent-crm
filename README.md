# AgentCommand — Real Estate CRM

Full-stack Next.js CRM for real estate agents. Built on Supabase + Tailwind CSS.

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Set up Supabase
#    - Create a new Supabase project
#    - Go to SQL Editor and run supabase/schema.sql
#    - Copy your URL and service role key

# 3. Configure environment
cp .env.example .env.local
# Fill in your Supabase URL and service role key

# 4. Seed the admin user
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-admin.js admin yourpassword "Your Name"

# 5. Run
npm run dev
# Open http://localhost:3000/admin
```

## Architecture

```
app/
├── layout.js                          # Root layout + globals.css
├── page.js                            # Redirects to /admin
├── admin/
│   ├── layout.js                      # Auth shell, nav, brand config
│   ├── page.js                        # Dashboard
│   ├── contacts/page.js               # Contact list (filterable by status + lead type)
│   ├── contacts/[id]/page.js          # Contact detail (budget, areas, source, SMS/email/call)
│   ├── pipeline/page.js               # Drag-and-drop board (7 columns)
│   ├── transactions/page.js           # Commission tracker + auto milestone generator
│   ├── calendar/page.js               # Month/week view for showings, closings, etc
│   ├── soi/page.js                    # Sphere of Influence with touch tracking
│   ├── templates/page.js              # SMS + email templates by pipeline stage
│   ├── users/page.js                  # User management (Admin vs Agent)
│   └── components/EmailComposer.js    # Email compose modal
├── api/
│   ├── contact/route.js               # Contacts CRUD
│   └── admin/
│       ├── auth/route.js              # Login (bcrypt)
│       ├── users/route.js             # Users CRUD
│       ├── templates/route.js         # Templates CRUD
│       ├── outreach/route.js          # Outreach log + contact delete
│       ├── activity/route.js          # Activity log
│       ├── transactions/route.js      # Transactions CRUD
│       ├── soi/route.js               # SOI people CRUD
│       └── soi/touches/route.js       # SOI touch logging
lib/
└── supabase.js                        # Supabase server client
supabase/
└── schema.sql                         # Full schema + seed templates
scripts/
└── seed-admin.js                      # Create first admin user
```

## Pipeline Stages

New Lead → Contacted → Showing Scheduled → Offer Submitted → Under Contract → Closed → Lost

## Key Features

### Transactions (New)
- Enter contract date → auto-generates 11 milestone deadlines
- Milestones: Earnest Money (day 3), Inspection (day 10), Appraisal (day 21), Financing (day 25), Walkthrough (day -1), Closing (day 30)
- Commission calculator: Sale Price × Commission % − Broker Split % − Referral Fee = Net GCI
- Summary cards: Closed GCI, Pending GCI, Total Volume, Deal Count
- Expandable cards with milestone progress bars and checklists

### SOI — Sphere of Influence (New)
- Past client + relationship database
- Touch logging with method tracking (Call, Text, Email, Coffee, Gift, Card, etc)
- 90-day overdue flag for people you haven't contacted
- Birthday and close-date anniversary alerts (14-day lookahead)
- Alert cards on page for quick visibility

### Contact Detail
- Lead type (buyer/seller/both/investor/renter)
- Lead source (Website, Zillow, Referral, Open House, etc)
- Budget range (min/max)
- Preferred areas
- 10 real estate SMS templates built in
- Call, Text, Email quick actions
- Activity timeline (status changes, emails, SMS)

### Dashboard
- Today's schedule (showings, closings)
- Upcoming transaction milestones (7-day lookahead)
- Needs Attention (stale leads, overdue follow-ups, pending offers)
- Pipeline GCI summary cards

## Brand Customization

Edit `app/admin/layout.js` line 12-17:
```js
const BRAND = {
  name: 'AgentCommand',     // App name
  primary: '#1a2e44',       // Deep navy
  accent: '#e8963e',        // Warm amber
}
```

## Tech Stack
- Next.js 14 (App Router)
- Supabase (Postgres + auth bypass via service role key)
- Tailwind CSS
- bcryptjs (password hashing)
- No additional dependencies

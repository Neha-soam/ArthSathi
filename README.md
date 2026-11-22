# ArthSathi

**ArthSathi is an AI-powered personal finance companion for Indian users.** It brings money management, financial learning, scam awareness, tax education, and simulated investing into one web application.

It is designed to help students, first-time earners, and everyday users understand their finances and build better money habits.

> **Note:** ArthSathi is an educational and money-management tool, not a source of personalised investment, legal, or tax advice. Market data is simulated, not live.

## Table of Contents

- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [APIs and Services](#apis-and-services)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Security](#security)
- [Testing and Deployment](#testing-and-deployment)
- [Limitations and Future Scope](#limitations-and-future-scope)

## Key Features

### 1. Personal Finance Dashboard
- View income, expenses, and financial summaries.
- Get an overview of personal financial activity.

### 2. Smart Budgeting
- Add, categorise, search, and filter transactions.
- Set monthly category-wise spending limits.
- Manage recurring income and expenses.
- View budget alerts and reports, export transactions as CSV.
- Get AI-assisted spending insights.

### 3. AI Scam Detector
- Analyse suspicious SMS messages, emails, and other text.
- Combines rule-based checks with AI assessment.
- Shows Low, Medium, or High warning levels, highlights suspicious phrases, and suggests safety steps.
- Stores scam-check history with masked message excerpts.

The detector identifies possible warning signs; it cannot guarantee that a message is safe or fraudulent. Verify financial requests independently.

### 4. Investment Learning and Calculators
- Learn about common financial products and concepts.
- Use SIP, lump-sum, and recurring-deposit (RD) calculators.
- Ask AI educational questions about personal finance and investing.

Calculators use hypothetical assumptions and do not predict actual returns.

### 5. Tax Assistant
- Compare India's old and new income-tax regimes.
- View tax slab calculations and supported HRA-related calculations.
- Uses the financial year and assumptions implemented in the application.

Always verify current tax rules and eligibility through official sources.

### 6. Market Insights and Paper Trading
- Explore demo watchlists, charts, and market-style views.
- Record hypothetical buy and sell transactions through paper trading.

**This module uses simulated data, not live stock-market prices, and does not place real orders.**

### 7. Business Finance Tools
- GST and loan EMI calculators.
- Sample invoice generation.
- Profit and cash-flow calculations.

These calculations are currently handled in the application and are not saved to the database.

### 8. Account and Profile
- Signup and login using Supabase Authentication.
- Forgot-password and password-reset flow.
- Protected routes and user-specific data access.

## Technology Stack

| Area | Technologies | Purpose |
|---|---|---|
| Frontend | React 18, JavaScript, JSX | User interface and application logic |
| Build Tool | Vite 5 | Development and production builds |
| Styling | Tailwind CSS 3, CSS | Responsive layouts |
| Routing | React Router 6 | Navigation and protected routes |
| Backend / BaaS | Supabase | Authentication, database, serverless functions |
| Database | Supabase PostgreSQL | Persistent user and finance data |
| AI | Google Gemini API | Scam analysis, spending insights, finance Q&A |
| Serverless Runtime | Supabase Edge Functions (Deno/TypeScript) | Secure AI request handling |
| Charts & Icons | Recharts, Lucide React | Visualisations and icons |
| Validation & Testing | Zod, Node.js test runner | Validation and tests |
| Deployment | Vercel + Supabase | Hosting and backend services |

## APIs and Services

### Supabase
Supabase provides the application's backend:

- **Supabase Auth:** Signup, login, sessions, and password recovery.
- **Supabase PostgreSQL:** Stores profiles, transactions, budgets, savings goals, watchlists, paper trades, recurring rules, scam history, and AI usage.
- **Supabase Edge Functions:** Hosts the `ai` function for secure AI requests.
- **Supabase JavaScript SDK:** Connects the React frontend to Supabase.

The frontend invokes the AI function using:

```js
supabase.functions.invoke('ai', {
  body: {
    action: '...',
    // action-specific fields
  }
});
```

### Google Gemini API

Gemini powers three AI features through the Supabase Edge Function:

| Action | Input | Purpose |
|---|---|---|
| `scam` | `text` | Analyse suspicious messages |
| `insights` | User's transaction and budget data | Generate spending insights |
| `edu` | `topic`, `question` | Answer educational finance or tax questions |

For example:

```js
// Scam analysis
{ action: 'scam', text: 'Suspicious message...' }

// Spending insights
{ action: 'insights' }

// Finance learning
{
  action: 'edu',
  topic: 'investing',
  question: 'What is the difference between SIP and lump-sum investing?'
}
```

The Edge Function reads the Gemini model from the `GEMINI_MODEL` secret when configured. Check that the selected model is supported by your Google AI account.

### APIs Not Integrated
- No live stock-market data API.
- No payment gateway or brokerage API.
- GST, EMI, tax, SIP, lump-sum, and RD calculations run within the application rather than through external financial APIs.

## How It Works

```text
User Browser (React + Vite)
          |
    Supabase Client
      /         \
 User Data     AI Request
    |              |
PostgreSQL   Supabase Edge Function
                   |
             Gemini API

Frontend: Vercel | Backend: Supabase
```

1. Users sign up or log in through Supabase Auth.
2. React reads and writes user data through the Supabase client.
3. PostgreSQL Row Level Security (RLS) restricts private records to their owners.
4. AI requests are sent to the `ai` Edge Function.
5. The function validates the request and user session, applies usage limits, and calls Gemini using a server-side secret.
6. The result is returned to the application.

## Project Structure

```text
ArthSathi/
├── scripts/                 # End-to-end and AI smoke tests
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/               # Dashboard and feature pages
│   ├── lib/                 # Supabase, AI, finance, tax, utilities
│   ├── App.jsx               # Routes and protected routes
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles
├── supabase/
│   ├── functions/ai/         # Gemini-backed Edge Function
│   ├── schema.sql            # Database schema and RLS policies
│   ├── audit.sql             # Security audit queries
│   └── phase*.sql            # Database migrations
├── .env.example              # Environment template
├── DEPLOY.md                 # Deployment instructions
├── package.json
├── tailwind.config.js
├── vite.config.js
└── vercel.json
```

## Getting Started

### Prerequisites
- Node.js 18 or later
- npm
- Supabase account and project
- Google AI Studio API key
- Supabase CLI

### 1. Clone and install

```bash
git clone <your-repository-url>
cd ArthSathi
npm install
```

### 2. Configure Supabase
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy the Project URL and anon/public key from **Project Settings → API**.

For an existing database, check `DEPLOY.md` before applying migrations.

### 3. Configure frontend variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Configure Gemini secret and deploy the function

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>

npx supabase secrets set GEMINI_API_KEY=your-gemini-api-key
npx supabase secrets set ALLOWED_ORIGIN=http://localhost:5173

npx supabase functions deploy ai
```

Optionally set a supported Gemini model:

```bash
npx supabase secrets set GEMINI_MODEL=<supported-gemini-model>
```

**Do not put the Gemini API key in frontend environment variables.**

### 5. Run the application

```bash
npm run dev
```

Open the local URL shown by Vite, normally `http://localhost:5173`.

## Environment Variables

| Variable | Location | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` / Vercel | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` / Vercel | Public anon key, protected by RLS |
| `GEMINI_API_KEY` | Supabase secret | Private Gemini API key |
| `GEMINI_MODEL` | Supabase secret | Optional Gemini model |
| `ALLOWED_ORIGIN` | Supabase secret | Allowed frontend origin(s) |

Never commit `.env.local`, private API keys, or Supabase service-role keys to Git.

## Security

- Row Level Security (RLS) protects user-owned database records.
- Policies restrict records to the authenticated user's ID.
- Protected routes prevent unauthenticated access.
- Gemini API keys are stored as Supabase secrets, not exposed to the browser.
- The AI function validates requests and applies a per-user limit of 20 requests per hour.
- Scam history stores a short excerpt rather than the complete message.

The Supabase anon key can be used in the browser only with correctly configured RLS. Never expose the service-role key.

## Testing and Deployment

Run tests:

```bash
npm test
```

Additional tests:

```bash
npm run test:e2e
npm run test:smoke
```

The project includes tests for finance calculations, budgeting, tax logic, scam detection, AI logic, authentication, and database access.

**Deployment architecture:**
- Frontend: Vercel
- Authentication and database: Supabase
- AI backend: Supabase Edge Function
- AI provider: Google Gemini

See [`DEPLOY.md`](./DEPLOY.md) for production deployment steps and configuration.

## Limitations and Future Scope

**Current limitations**
- Market Insights uses simulated data, not live prices.
- Paper trading is only a simulation.
- Business Finance calculations are not currently saved.
- AI output may be incomplete or incorrect; verify important decisions independently.

**Future improvements**
- Integrate a reliable live market-data provider.
- Add budget and savings alerts.
- Generate downloadable PDF reports.
- Improve support for Indian languages.
- Add more financial-literacy lessons and automated tests.

## Why ArthSathi?

Financial tools are often spread across multiple apps. ArthSathi brings budgeting, financial learning, scam awareness, tax education, and investing simulations together to help users understand their money and make more informed everyday decisions.

**ArthSathi is a companion for financial awareness and learning, not a replacement for a qualified financial professional.**

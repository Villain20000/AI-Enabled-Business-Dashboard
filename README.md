# AI-Enabled Business Dashboard

A comprehensive business intelligence dashboard built with Next.js 15, featuring AI-powered insights and natural language query capabilities. The dashboard is designed for pharmaceutical company data visualization with real-time metrics, inventory tracking, and intelligent analytics.

![Dashboard Preview](https://picsum.photos/seed/dashboard/800/400)

## 📋 Project Overview

This application provides a modern, interactive dashboard for business data analysis. It combines traditional business intelligence features with cutting-edge AI capabilities to deliver actionable insights.

### Key Features

- **📊 KPI Cards**: Display key business metrics with trend indicators
- **📈 Sales Charts**: Visual comparison of actual sales vs targets
- **📦 Inventory Management**: Track product stock levels with status indicators
- **🤖 AI Insights Engine**: Generate AI-powered business insights from your data
- **💬 Natural Language Query**: Ask questions about your data in plain English
- **🔔 Alert System**: Configure automated alerts for KPI thresholds
- **🎨 Modern UI**: Clean, professional interface with responsive design

## 🚀 Installation Instructions

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- (Optional) Supabase account for database
- (Optional) Google Gemini API key for AI features

### Quick Start

1. **Clone the repository**

```bash
git clone <repository-url>
cd AI-Enabled-Business-Dashboard
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration (Optional - uses mock data by default)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API Key (Optional - AI features require this)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

4. **Start the development server**

```bash
npm run dev
```

5. **Open in browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Examples

### Dashboard Features

#### Viewing KPIs

The main dashboard displays three key performance indicators:
- **Total Revenue**: Financial performance metric
- **Active Users**: User engagement metric  
- **Inventory Alerts**: Supply chain health indicator

Each KPI shows current value and month-over-month change percentage.

#### Sales Analysis

The Sales vs Target chart provides visual comparison between actual sales and targets across months, helping identify performance trends and gaps.

#### Inventory Tracking

The Inventory Status table shows product stock levels with color-coded status badges:
- 🟢 **Green (Healthy)**: Adequate stock
- 🟡 **Amber (Low)**: Stock running low
- 🔴 **Red (Critical)**: Urgent restock needed

### AI Features

#### Generating Insights

1. Navigate to the main dashboard
2. Click the "Generate Insights" button in the AI Insights Engine card
3. Wait for the AI to analyze your data
4. View 3 actionable insights about trends, anomalies, and alerts

#### Asking Questions

1. Locate the Natural Language Query chat interface
2. Type a question about your data (e.g., "Which products have low stock?")
3. Press Enter or click Send
4. Receive AI-generated answers based on your actual data

### Alert Configuration

1. Navigate to the Settings page via the sidebar
2. Click "Create New Alert Rule"
3. Configure:
   - **KPI**: Select which metric to monitor
   - **Condition**: Greater than (>) or Less than (<)
   - **Threshold**: Numeric value to trigger alert
   - **Method**: Email or Slack notification
   - **Destination**: Email address or Slack channel
4. Click "Add Alert Rule"
5. Use "Run Check Now" to simulate alert evaluation

## 🏗️ Codebase Structure

```
AI-Enabled-Business-Dashboard/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── chat/                 # Natural Language Query endpoint
│   │   │   └── route.ts          # POST handler for chat queries
│   │   └── insights/             # AI Insights generation endpoint
│   │       └── route.ts          # POST handler for insights
│   ├── settings/                 # Settings page
│   │   └── page.tsx              # Alert configuration interface
│   ├── globals.css              # Global styles (Tailwind import)
│   ├── layout.tsx                # Root layout with sidebar
│   └── page.tsx                  # Main dashboard page
├── components/                    # React components
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── AiInsights.tsx        # AI insights generation UI
│   │   ├── InventoryTable.tsx    # Inventory list display
│   │   ├── KpiCards.tsx         # KPI metric cards
│   │   ├── NlqChat.tsx          # Natural language chat
│   │   └── SalesChart.tsx       # Sales bar chart
│   └── ui/                       # Reusable UI components
│       ├── button.tsx            # Button component
│       ├── card.tsx              # Card components
│       ├── input.tsx             # Input field component
│       └── toast-context.tsx     # Toast notification system
├── hooks/                        # Custom React hooks
│   └── use-mobile.ts             # Mobile device detection
├── lib/                          # Utility libraries
│   ├── mock-data.ts              # Demo/fallback data
│   ├── supabase.ts               # Supabase client setup
│   └── utils.ts                  # Class name utilities
├── package.json                  # Dependencies and scripts
├── next.config.ts               # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── postcss.config.mjs            # PostCSS (Tailwind) config
├── eslint.config.mjs             # ESLint configuration
└── tailwind.config.ts            # Tailwind CSS configuration
```

## 🔧 Technical Details

### Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 |
| Database | Supabase (optional) |
| AI | Google Gemini API |
| Charts | Recharts |
| Icons | Lucide React |
| Animations | Framer Motion |

### Architecture

#### Server Components

The main dashboard page (`app/page.tsx`) is a Server Component that:
- Fetches data from Supabase on each request
- Passes data to Client Components for interactivity
- Implements SSR for fresh data on every load

#### Client Components

Interactive features use Client Components (`"use client"`):
- AI Insights generation
- Natural Language Query chat
- Alert management (Settings page)
- Toast notifications

#### API Routes

- `/api/chat`: Processes natural language queries with AI
- `/api/insights`: Generates actionable business insights

### Database Schema (Supabase)

If using Supabase, create these tables:

```sql
-- Sales data table
CREATE TABLE sales_data (
  id SERIAL PRIMARY KEY,
  month VARCHAR(20) NOT NULL,
  sales INTEGER NOT NULL,
  target INTEGER NOT NULL
);

-- Inventory data table
CREATE TABLE inventory_data (
  id SERIAL PRIMARY KEY,
  product VARCHAR(100) NOT NULL,
  stock INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL
);

-- KPI metrics table
CREATE TABLE kpis (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  value VARCHAR(50) NOT NULL,
  change VARCHAR(20) NOT NULL,
  trend VARCHAR(10) NOT NULL
);

-- Alert rules table
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi VARCHAR(100) NOT NULL,
  condition VARCHAR(5) NOT NULL,
  threshold INTEGER NOT NULL,
  method VARCHAR(20) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🤝 Contribution Guidelines

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting (Prettier/ESLint)
- Add comments to complex logic
- Write meaningful commit messages

### Testing

- Ensure code passes linting: `npm run lint`
- Test your changes locally before submitting

## 📄 License

This project is private and proprietary. All rights reserved.

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `NEXT_PUBLIC_GEMINI_API_KEY` | No | Google Gemini API key for AI features |

> **Note**: The application works without any environment variables using mock data. Set these to connect to live data sources.

## 🆘 Support

For issues or questions:
1. Check the existing documentation
2. Review the inline code comments
3. Examine the component structure in `/components`

---

Built with ❤️ using Next.js, Tailwind CSS, and Google Gemini AI

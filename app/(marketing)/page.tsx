/**
 * Marketing Landing Page — `/`.
 *
 * Server Component rendering the public home page: a hero section, a 6-card
 * features grid, a 3-tier pricing section sourced from `PLAN_LIST`, and a
 * closing CTA. All internal navigation uses `next/link`.
 *
 * @module MarketingHomePage
 */
import Link from 'next/link';
import {
  Sparkles,
  BarChart3,
  Shield,
  Users,
  KeyRound,
  ScrollText,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLAN_LIST, type Plan } from '@/lib/billing/plans';

/** Feature cards rendered in the features grid. */
const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Insights',
    description: 'Gemini-powered summaries and anomaly detection across your metrics.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Dashboards',
    description: 'Live, customizable dashboards with sub-second data refresh.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access Control',
    description: 'Granular per-team permissions with admin, editor, and viewer roles.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Invite teammates and share dashboards across your organization.',
  },
  {
    icon: KeyRound,
    title: 'API Access',
    description: 'Programmatic API keys to push data and pull insights into your stack.',
  },
  {
    icon: ScrollText,
    title: 'Audit Logging',
    description: 'Tamper-evident audit trails for compliance and security reviews.',
  },
] as const;

/**
 * Maps a plan feature flag key to a human-readable label shown in the
 * pricing checklist. Only features whose value is `true` are rendered.
 */
const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboards',
  alerts: 'Alerts',
  ai_insights: 'AI Insights',
  nlq: 'Natural Language Queries',
  team: 'Team management',
  api_keys: 'API keys',
  audit_log: 'Audit logs',
  sso: 'SSO (Google/GitHub)',
  custom_data: 'Custom data',
};

/** The plan id that should be highlighted as "Popular" in the pricing grid. */
const POPULAR_PLAN_ID = 'pro';

/**
 * Formats a plan's monthly price for display.
 *
 * @param priceMonthly - The plan's monthly price in USD.
 * @returns "$X/mo" for paid plans, or "Free" for a $0 plan.
 */
function formatPrice(priceMonthly: number): string {
  if (priceMonthly === 0) return 'Free';
  return `$${priceMonthly}/mo`;
}

/**
 * Formats a numeric limit for display, collapsing large/infinite values.
 *
 * @param value - The limit value (may be `Number.MAX_SAFE_INTEGER`).
 * @param suffix - Unit suffix appended to finite values (e.g. " seats").
 * @returns A human-readable limit string.
 */
function formatLimit(value: number, suffix: string): string {
  if (value === Number.MAX_SAFE_INTEGER) return `Unlimited${suffix}`;
  return `${value}${suffix}`;
}

/**
 * Pricing card for a single plan.
 *
 * Shows the plan name, price, description, a feature checklist (only the
 * enabled features), the seats / AI calls / API key limits, and a CTA button.
 * The "Pro" plan is highlighted with a "Popular" badge and a blue border.
 */
function PricingCard({ plan }: { plan: Plan }) {
  const isPopular = plan.id === POPULAR_PLAN_ID;
  const enabledFeatures = Object.entries(plan.features).filter(([, v]) => v);

  return (
    <div
      className={`relative flex flex-col rounded-xl border bg-white p-6 shadow-sm ${
        isPopular ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-200'
      }`}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
          Popular
        </span>
      )}

      {/* Plan name + price */}
      <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {formatPrice(plan.priceMonthly)}
      </p>
      <p className="mt-2 text-sm text-slate-500">{plan.description}</p>

      <div className="my-6 h-px bg-slate-200" />

      {/* Feature checklist */}
      <ul className="space-y-3 text-sm">
        {enabledFeatures.map(([key]) => (
          <li key={key} className="flex items-start gap-2 text-slate-700">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <span>{FEATURE_LABELS[key] ?? key}</span>
          </li>
        ))}
      </ul>

      {/* Usage limits */}
      <ul className="mt-6 space-y-1 text-xs text-slate-500">
        <li>{formatLimit(plan.seats, ' seats')}</li>
        <li>{formatLimit(plan.aiCallsPerDay, ' AI calls/day')}</li>
        <li>{formatLimit(plan.apiKeys, ' API keys')}</li>
      </ul>

      {/* CTA — checkout happens after signup */}
      <div className="mt-6 pt-2">
        <Link href="/signup" className="block">
          <Button
            variant={isPopular ? 'default' : 'outline'}
            className="w-full"
          >
            Get started
          </Button>
        </Link>
      </div>
    </div>
  );
}

/**
 * Marketing home page.
 *
 * @returns The landing page with hero, features, pricing, and CTA sections.
 */
export default function MarketingHomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Enterprise business intelligence, powered by AI.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600">
            Multi-tenant dashboards, AI insights, RBAC, audit logs, API keys,
            and Stripe billing — production-ready SaaS.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="lg">Get started free</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Live demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Everything you need to ship BI
          </h2>
          <p className="mt-4 text-slate-600">
            A complete platform for data-driven teams — from dashboards to
            governance.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-slate-600">
              Start free, upgrade when you grow. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLAN_LIST.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-blue-600 px-6 py-12 text-center shadow-sm">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Ready to get started?
          </h2>
          <p className="mt-3 text-blue-100">
            Spin up your first dashboard in minutes. No credit card required.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="gap-2">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

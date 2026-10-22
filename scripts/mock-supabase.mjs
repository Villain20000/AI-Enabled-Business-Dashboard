/**
 * Minimal Supabase-compatible mock server (Auth + PostgREST subset).
 *
 * Lets the app run locally without Docker when resources are tight.
 * Only intended for UI development and README screenshot capture.
 *
 * Usage: node scripts/mock-supabase.mjs   (listens on :54321)
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54321);
const JWT_SECRET = 'mock-jwt-secret';

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

const ORG1 = '11111111-1111-4111-8111-111111111111';
const ORG2 = '22222222-2222-4222-8222-222222222222';
const U_OWNER = 'aaaaaaaa-0000-4000-8000-000000000001';
const U_MEMBER = 'aaaaaaaa-0000-4000-8000-000000000002';
const U_VIEWER = 'aaaaaaaa-0000-4000-8000-000000000003';
const U_FRESH = 'aaaaaaaa-0000-4000-8000-000000000004';
const PASS = 'Screenshots123!';

const now = new Date();
const iso = (d) => new Date(d).toISOString();
const daysAgo = (n, h = 0) => iso(new Date(now.getTime() - n * 864e5 - h * 36e5));
const daysAhead = (n) => iso(new Date(now.getTime() + n * 864e5));

const users = [
  { id: U_OWNER, email: 'demo@datacore.ai', role: 'authenticated' },
  { id: U_MEMBER, email: 'dana@datacore.ai', role: 'authenticated' },
  { id: U_VIEWER, email: 'vic@datacore.ai', role: 'authenticated' },
  { id: U_FRESH, email: 'new@datacore.ai', role: 'authenticated' },
].map((u) => ({
  ...u,
  aud: 'authenticated',
  email_confirmed_at: daysAgo(30),
  confirmed_at: daysAgo(30),
  last_sign_in_at: daysAgo(1),
  created_at: daysAgo(30),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  phone: '',
  is_anonymous: false,
}));

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sales = [4000, 5200, 6100, 5800, 7300, 8100, 7600, 9200, 10400, 11800, 12600, 14300];
const targets = [4500, 5000, 5500, 6000, 6800, 7500, 8000, 8600, 9400, 10200, 11500, 13000];

const db = {
  organizations: [
    {
      id: ORG1, name: 'Acme Analytics', slug: 'acme-analytics',
      subscription_plan: 'pro', subscription_status: 'active',
      stripe_customer_id: 'cus_mock123', stripe_subscription_id: 'sub_mock123',
      current_period_end: daysAhead(19), cancel_at_period_end: false,
      created_at: daysAgo(120), updated_at: daysAgo(2),
    },
    {
      id: ORG2, name: 'Northwind Retail', slug: 'northwind-retail',
      subscription_plan: 'free', subscription_status: null,
      stripe_customer_id: null, stripe_subscription_id: null,
      current_period_end: null, cancel_at_period_end: null,
      created_at: daysAgo(45), updated_at: daysAgo(45),
    },
  ],
  organization_members: [
    { user_id: U_OWNER, org_id: ORG1, role: 'owner', created_at: daysAgo(120) },
    { user_id: U_MEMBER, org_id: ORG1, role: 'admin', created_at: daysAgo(90) },
    { user_id: U_VIEWER, org_id: ORG1, role: 'viewer', created_at: daysAgo(60) },
    { user_id: U_OWNER, org_id: ORG2, role: 'owner', created_at: daysAgo(45) },
  ],
  organization_invitations: [
    { id: randomUUID(), org_id: ORG1, email: 'priya@acme.io', role: 'member', token: 'inv_tok_001', status: 'pending', expires_at: daysAhead(7), created_at: daysAgo(2) },
    { id: randomUUID(), org_id: ORG1, email: 'tom@acme.io', role: 'viewer', token: 'inv_tok_002', status: 'pending', expires_at: daysAhead(7), created_at: daysAgo(1) },
  ],
  sales_data: months.map((m, i) => ({ id: i + 1, org_id: ORG1, month: m, sales: sales[i], target: targets[i], created_at: daysAgo(200 - i * 20) })),
  inventory_data: [
    { id: 1, org_id: ORG1, product: 'Vaccine A', stock: 1200, status: 'Healthy', created_at: daysAgo(90) },
    { id: 2, org_id: ORG1, product: 'Medicine B', stock: 300, status: 'Low', created_at: daysAgo(90) },
    { id: 3, org_id: ORG1, product: 'Supplement C', stock: 840, status: 'Healthy', created_at: daysAgo(90) },
    { id: 4, org_id: ORG1, product: 'Treatment D', stock: 48, status: 'Critical', created_at: daysAgo(90) },
    { id: 5, org_id: ORG1, product: 'Diagnostic Kit E', stock: 610, status: 'Healthy', created_at: daysAgo(40) },
    { id: 6, org_id: ORG1, product: 'Serum F', stock: 140, status: 'Low', created_at: daysAgo(40) },
  ],
  kpis: [
    { id: 1, org_id: ORG1, title: 'Total Revenue', value: '$1.2M', change: '+12.5%', trend: 'up', created_at: daysAgo(10) },
    { id: 2, org_id: ORG1, title: 'Active Users', value: '8,432', change: '+5.2%', trend: 'up', created_at: daysAgo(10) },
    { id: 3, org_id: ORG1, title: 'Conversion Rate', value: '3.8%', change: '+0.4pt', trend: 'up', created_at: daysAgo(10) },
    { id: 4, org_id: ORG1, title: 'Inventory Alerts', value: '12', change: '-2', trend: 'down', created_at: daysAgo(10) },
  ],
  feature_flags: [],
  api_keys: [
    { id: randomUUID(), org_id: ORG1, name: 'Production CI', prefix: 'dcai_ci4f', hashed_key: 'x'.repeat(64), last_used_at: daysAgo(0, 3), revoked_at: null, created_at: daysAgo(50) },
    { id: randomUUID(), org_id: ORG1, name: 'Analytics Sync', prefix: 'dcai_an7q', hashed_key: 'y'.repeat(64), last_used_at: daysAgo(1), revoked_at: null, created_at: daysAgo(22) },
    { id: randomUUID(), org_id: ORG1, name: 'Legacy Exporter', prefix: 'dcai_lx2b', hashed_key: 'z'.repeat(64), last_used_at: daysAgo(35), revoked_at: daysAgo(14), created_at: daysAgo(80) },
  ],
  alert_rules: [
    { id: randomUUID(), org_id: ORG1, kpi: 'revenue', condition: 'below', threshold: 5000, method: 'email', destination: 'alerts@acme.io', enabled: true, cooldown_seconds: 3600, last_checked_at: daysAgo(0, 1), last_triggered_at: daysAgo(3), created_by: U_OWNER, created_at: daysAgo(60), updated_at: daysAgo(3) },
    { id: randomUUID(), org_id: ORG1, kpi: 'inventory_alerts', condition: 'above', threshold: 10, method: 'slack', destination: 'https://hooks.slack.com/services/T000/B000/XXXX', enabled: true, cooldown_seconds: 7200, last_checked_at: daysAgo(0, 1), last_triggered_at: daysAgo(1), created_by: U_MEMBER, created_at: daysAgo(45), updated_at: daysAgo(1) },
  ],
  alert_events: [
    { id: randomUUID(), org_id: ORG1, rule_id: null, channel: 'slack', destination: '#acme-alerts', status: 'delivered', triggered_value: 4200, error: null, payload: { message: 'Inventory alerts above threshold' }, delivered_at: daysAgo(1, 2), created_at: daysAgo(1, 2) },
    { id: randomUUID(), org_id: ORG1, rule_id: null, channel: 'email', destination: 'alerts@acme.io', status: 'delivered', triggered_value: 4650, error: null, payload: { message: 'Weekly revenue dipped below target' }, delivered_at: daysAgo(3, 5), created_at: daysAgo(3, 5) },
    { id: randomUUID(), org_id: ORG1, rule_id: null, channel: 'slack', destination: '#acme-alerts', status: 'failed', triggered_value: 4300, error: 'webhook timeout', payload: { message: 'Inventory alerts above threshold' }, delivered_at: null, created_at: daysAgo(6, 1) },
  ],
  audit_logs: [
    { id: randomUUID(), org_id: ORG1, user_id: U_OWNER, actor_label: 'demo@datacore.ai', action: 'org.created', resource: 'organization', metadata: { name: 'Acme Analytics' }, created_at: daysAgo(120) },
    { id: randomUUID(), org_id: ORG1, user_id: U_OWNER, actor_label: 'demo@datacore.ai', action: 'team.invited', resource: 'invitation', metadata: { email: 'dana@datacore.ai', role: 'admin' }, created_at: daysAgo(90) },
    { id: randomUUID(), org_id: ORG1, user_id: U_MEMBER, actor_label: 'dana@datacore.ai', action: 'api_key.created', resource: 'api_key', metadata: { name: 'Analytics Sync' }, created_at: daysAgo(22) },
    { id: randomUUID(), org_id: ORG1, user_id: U_OWNER, actor_label: 'demo@datacore.ai', action: 'api_key.revoked', resource: 'api_key', metadata: { name: 'Legacy Exporter' }, created_at: daysAgo(14) },
    { id: randomUUID(), org_id: ORG1, user_id: U_OWNER, actor_label: 'demo@datacore.ai', action: 'alerts.created', resource: 'alert_rule', metadata: { kpi: 'revenue' }, created_at: daysAgo(60) },
    { id: randomUUID(), org_id: ORG1, user_id: U_MEMBER, actor_label: 'dana@datacore.ai', action: 'alerts.updated', resource: 'alert_rule', metadata: { kpi: 'inventory_alerts', threshold: 10 }, created_at: daysAgo(1) },
    { id: randomUUID(), org_id: ORG1, user_id: U_OWNER, actor_label: 'demo@datacore.ai', action: 'billing.plan_changed', resource: 'organization', metadata: { plan: 'pro' }, created_at: daysAgo(75) },
    { id: randomUUID(), org_id: ORG1, user_id: U_MEMBER, actor_label: 'dana@datacore.ai', action: 'data.imported', resource: 'sales_data', metadata: { rows: 12 }, created_at: daysAgo(9) },
    { id: randomUUID(), org_id: ORG1, user_id: U_VIEWER, actor_label: 'vic@datacore.ai', action: 'team.role_changed', resource: 'member', metadata: { role: 'viewer' }, created_at: daysAgo(60) },
    { id: randomUUID(), org_id: ORG1, user_id: U_OWNER, actor_label: 'demo@datacore.ai', action: 'org.renamed', resource: 'organization', metadata: { from: 'Acme', to: 'Acme Analytics' }, created_at: daysAgo(2) },
  ].sort((a, b) => a.created_at < b.created_at ? 1 : -1),
  usage_events: [
    { id: randomUUID(), org_id: ORG1, event_type: 'ai_call', created_at: daysAgo(0, 2) },
    { id: randomUUID(), org_id: ORG1, event_type: 'ai_call', created_at: daysAgo(0, 5) },
    { id: randomUUID(), org_id: ORG1, event_type: 'api_call', created_at: daysAgo(1) },
  ],
  data_sources: [
    { id: 'ds-1', org_id: ORG1, name: 'CSV pipeline', kind: 'csv', status: 'connected', last_synced_at: daysAgo(9), created_by: U_OWNER, created_at: daysAgo(100) },
  ],
  import_jobs: [
    { id: randomUUID(), org_id: ORG1, data_source_id: 'ds-1', kind: 'sales', status: 'completed', row_count: 12, error_count: 0, errors: [], created_by: U_OWNER, created_at: daysAgo(9), completed_at: daysAgo(9) },
    { id: randomUUID(), org_id: ORG1, data_source_id: 'ds-1', kind: 'inventory', status: 'completed', row_count: 6, error_count: 0, errors: [], created_by: U_OWNER, created_at: daysAgo(9), completed_at: daysAgo(9) },
  ],
  ai_conversations: [
    { id: 'conv-1', org_id: ORG1, user_id: U_OWNER, title: 'Stock overview', created_at: daysAgo(1), updated_at: daysAgo(1) },
  ],
  ai_messages: [
    { id: randomUUID(), conversation_id: 'conv-1', role: 'user', content: 'Which products have low stock?', created_at: daysAgo(1) },
    { id: randomUUID(), conversation_id: 'conv-1', role: 'assistant', content: 'Treatment D (48 units) is critical and Serum F (140 units) is low. Consider reordering both.', created_at: daysAgo(1) },
  ],
  stripe_events: [
    { id: 'evt_mock_checkout', type: 'checkout.session.completed', processed_at: daysAgo(75) },
    { id: 'evt_mock_invoice', type: 'invoice.paid', processed_at: daysAgo(45) },
  ],
};

// Link alert events to seeded rules after ids exist.
const ruleIds = db.alert_rules.map((r) => r.id);
db.alert_events[0].rule_id = ruleIds[1];
db.alert_events[1].rule_id = ruleIds[0];
db.alert_events[2].rule_id = ruleIds[1];

/* ------------------------------------------------------------------ */
/* JWT helpers                                                         */
/* ------------------------------------------------------------------ */

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
function makeJwt(user) {
  const iat = Math.floor(now.getTime() / 1000);
  const payload = {
    aud: 'authenticated', exp: iat + 3600 * 24, iat,
    email: user.email, sub: user.id, user_id: user.id,
    role: 'authenticated', phone: '',
    app_metadata: user.app_metadata, user_metadata: {},
    is_anonymous: false, session_id: randomUUID(),
  };
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.${b64({ sig: JWT_SECRET })}`;
}
function parseJwt(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); }
  catch { return null; }
}
const publicUser = (u) => ({ ...u, encrypted_password: `bcrypt$${PASS}` });
function sessionFor(user) {
  return {
    access_token: makeJwt(user), token_type: 'bearer', expires_in: 86400,
    expires_at: Math.floor(now.getTime() / 1000) + 86400,
    refresh_token: `rt_${user.id}`, user: publicUser(user),
  };
}

/* ------------------------------------------------------------------ */
/* PostgREST subset                                                    */
/* ------------------------------------------------------------------ */

// Columns used to resolve single-level embeds: targetTable -> fk column.
function embedFk(targetTable, row) {
  const candidates = {
    organizations: ['org_id'],
    alert_rules: ['rule_id'],
    ai_conversations: ['conversation_id'],
    data_sources: ['data_source_id'],
  };
  return (candidates[targetTable] ?? []).find((c) => c in row);
}

function parseFilters(params) {
  const reserved = new Set(['select', 'order', 'limit', 'offset', 'onConflict', 'columns']);
  const filters = [];
  for (const [key, raw] of params) {
    if (reserved.has(key)) continue;
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      filters.push(...parseFilterValue(key, String(value)));
    }
  }
  return filters;
}

function parseFilterValue(col, expr) {
  // Supports eq, neq, gt, gte, lt, lte, is, in, like, ilike, not.is
  const m = /^(not\.)?([a-z]+)\.(.*)$/s.exec(expr);
  if (!m) return [{ col, op: 'eq', value: expr, not: false }];
  const not = Boolean(m[1]);
  const op = m[2];
  let value = m[3];
  if (op === 'in') {
    value = value.replace(/[()]/g, '').split(',').map((v) => v.replace(/^"|"$/g, ''));
  }
  return [{ col, op, value, not }];
}

function matchFilter(row, f) {
  const v = row[f.col];
  let ok;
  switch (f.op) {
    case 'eq': ok = String(v) === String(f.value); break;
    case 'neq': ok = String(v) !== String(f.value); break;
    case 'gt': ok = v > f.value; break;
    case 'gte': ok = v >= f.value; break;
    case 'lt': ok = v < f.value; break;
    case 'lte': ok = v <= f.value; break;
    case 'is': ok = f.value === 'null' ? v === null || v === undefined : String(v) === f.value; break;
    case 'in': ok = f.value.some((x) => String(v) === x); break;
    case 'like': case 'ilike': {
      const rx = new RegExp(`^${String(f.value).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '%').replace(/%/g, '.*').replace(/_/g, '.')}$`, f.op === 'ilike' ? 'i' : '');
      ok = rx.test(String(v ?? '')); break;
    }
    case 'cs': ok = Array.isArray(v) && String(f.value).replace(/[{}]/g, '').split(',').every((x) => v.includes(x)); break;
    default: ok = false;
  }
  return f.not ? !ok : ok;
}

function splitTop(str, sep) {
  const out = []; let depth = 0; let cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function project(row, sel) {
  if (!sel || sel === '*') return { ...row };
  const out = {};
  for (const token of splitTop(sel, ',')) {
    const t = token.trim();
    if (t === '*') Object.assign(out, row);
    else if (t === 'count') out.count = 1;
    else {
      const em = /^([\w]+):([\w]+)\((.*)\)$/.exec(t) || /^([\w]+)\((.*)\)$/.exec(t);
      if (em) {
        const alias = em[1];
        const target = em.length === 4 ? em[2] : em[1];
        const inner = em.length === 4 ? em[3] : em[2];
        const fk = embedFk(target, row);
        const related = fk ? (db[target] ?? []).find((r) => String(r.id) === String(row[fk])) : null;
        out[alias] = related ? project(related, inner) : null;
      } else out[t.replace(/->.*$/, '').trim()] = row[t.split(':')[0].trim()];
    }
  }
  return out;
}

function applyOrder(rows, orderStr) {
  if (!orderStr) return rows;
  for (const o of orderStr.split(',').reverse()) {
    const [col, dir = 'asc'] = o.split('.');
    const desc = dir.startsWith('desc');
    rows.sort((a, b) => {
      const x = a[col], y = b[col];
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x > y ? 1 : -1) * (desc ? -1 : 1);
    });
  }
  return rows;
}

function nextId(table) {
  if (table === 'sales_data' || table === 'inventory_data' || table === 'kpis') {
    return Math.max(0, ...db[table].map((r) => Number(r.id) || 0)) + 1;
  }
  return randomUUID();
}

function handleRest(req, res, url, body) {
  const table = url.pathname.split('/')[3];
  if (!db[table]) return json(res, 404, { message: `relation ${table} not found` });

  const params = url.searchParams;
  const filters = parseFilters(params);
  const sel = params.get('select');
  const prefer = req.headers.prefer || '';
  const wantsSingle = (req.headers.accept || '').includes('pgrst.object');
  const representation = /return=representation/.test(prefer);
  const wantsCount = /count=exact/.test(prefer);

  let rows = db[table].filter((r) => filters.every((f) => matchFilter(r, f)));
  const total = rows.length;
  rows = applyOrder(rows, params.get('order'));
  const offset = Number(params.get('offset') || 0);
  const limit = params.get('limit') != null ? Number(params.get('limit')) : Infinity;
  rows = rows.slice(offset, offset + limit);

  if (wantsCount) {
    res.setHeader('Content-Range', `${offset}-${Math.min(offset + rows.length - 1, total - 1)}/${total}`);
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    const out = rows.map((r) => project(r, sel));
    if (req.method === 'HEAD') return res.writeHead(200).end();
    if (wantsSingle) {
      if (out.length !== 1) return json(res, 406, { code: 'PGRST116', message: `result contains ${out.length} rows` });
      return json(res, 200, out[0]);
    }
    return json(res, 200, out);
  }

  const insertDefaults = (row) => {
    const r = { ...row };
    if (!('id' in r) || r.id === undefined) r.id = nextId(table);
    if ('created_at' in (db[table][0] ?? {}) && !r.created_at) r.created_at = iso(new Date());
    if ('updated_at' in (db[table][0] ?? {})) r.updated_at = iso(new Date());
    return r;
  };

  if (req.method === 'POST') {
    const incoming = Array.isArray(body) ? body : [body];
    let created = [];
    if (/resolution=merge/.test(prefer)) {
      const conflictCols = (params.get('onConflict') || 'id').split(',');
      for (const item of incoming) {
        const existing = db[table].find((r) => conflictCols.every((c) => String(r[c]) === String(item[c])));
        if (existing) Object.assign(existing, item);
        else created.push((db[table].push(insertDefaults(item)), db[table][db[table].length - 1]));
      }
    } else {
      created = incoming.map((item) => {
        const row = insertDefaults(item);
        db[table].push(row);
        return row;
      });
    }
    if (representation) return json(res, 201, created.map((r) => project(r, sel)));
    res.writeHead(201).end();
    return;
  }

  if (req.method === 'PATCH') {
    for (const r of rows) Object.assign(r, body, { updated_at: r.updated_at !== undefined ? iso(new Date()) : r.updated_at });
    if (representation) return json(res, 200, rows.map((r) => project(r, sel)));
    res.writeHead(204).end();
    return;
  }

  if (req.method === 'DELETE') {
    const removed = rows;
    db[table] = db[table].filter((r) => !removed.includes(r));
    if (representation) return json(res, 200, removed.map((r) => project(r, sel)));
    res.writeHead(204).end();
    return;
  }

  res.writeHead(405).end();
}

/* ------------------------------------------------------------------ */
/* GoTrue subset                                                       */
/* ------------------------------------------------------------------ */

function handleAuth(req, res, url, body) {
  const path = url.pathname.replace(/^\/auth\/v1/, '');
  const bearer = parseJwt((req.headers.authorization || '').replace(/^Bearer /i, ''));
  const findUser = (id) => users.find((u) => u.id === id);

  if (path === '/health') return json(res, 200, { name: 'GoTrue', version: 'mock', description: 'Mock' });
  if (path === '/settings') {
    return json(res, 200, {
      external: { google: true, github: true, email: true },
      disable_signup: false, mailer_autoconfirm: true, phone: { max_frequency: null },
    });
  }

  if (path.startsWith('/token')) {
    const grant = params0(url);
    if (grant === 'refresh_token') {
      const u = findUser(bearer?.sub) ?? users[0];
      return json(res, 200, sessionFor(u));
    }
    const u = users.find((x) => x.email === (body.email || '').toLowerCase());
    if (!u) return json(res, 400, { code: 400, error: 'invalid_credentials', error_description: 'Invalid login credentials' });
    return json(res, 200, sessionFor(u));
  }

  if (path === '/signup') {
    const email = (body.email || '').toLowerCase();
    let u = users.find((x) => x.email === email);
    if (!u) {
      u = {
        id: randomUUID(), email, role: 'authenticated', aud: 'authenticated',
        email_confirmed_at: iso(new Date()), confirmed_at: iso(new Date()),
        last_sign_in_at: iso(new Date()), created_at: iso(new Date()),
        app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: body.data || {},
        identities: [], phone: '', is_anonymous: false,
      };
      users.push(u);
    }
    return json(res, 200, sessionFor(u));
  }

  if (path === '/user') {
    const u = findUser(bearer?.sub);
    if (!u) return json(res, 401, { code: 401, error_description: 'invalid token' });
    if (req.method === 'PUT') {
      if (body.email) u.email = body.email.toLowerCase();
      Object.assign(u.user_metadata, body.data || {});
      return json(res, 200, publicUser(u));
    }
    return json(res, 200, { aud: u.aud, expiration: Math.floor(now.getTime() / 1000) + 86400, ...publicUser(u) });
  }

  if (path === '/logout') return res.writeHead(204).end();
  if (path === '/recover' || path === '/otp' || path === '/verify' || path === '/resend') {
    if (path === '/verify') {
      const u = users.find((x) => x.email === (body.email || '').toLowerCase()) ?? users[0];
      return json(res, 200, sessionFor(u));
    }
    return json(res, 200, {});
  }

  if (path.startsWith('/authorize')) {
    const redir = url.searchParams.get('redirect_to') || '/';
    return res.writeHead(302, { Location: `${redir}#code=mockcode&state=mock` }).end();
  }

  if (path.startsWith('/admin/users')) {
    const idMatch = /^\/admin\/users\/(.+)$/.exec(path);
    if (req.method === 'GET' && idMatch) {
      const u = findUser(idMatch[1]);
      return u ? json(res, 200, publicUser(u)) : json(res, 404, { message: 'not found' });
    }
    if (req.method === 'GET') return json(res, 200, users.map(publicUser));
    if (req.method === 'POST') {
      const u = {
        id: body.id || randomUUID(), email: (body.email || '').toLowerCase(), role: 'authenticated', aud: 'authenticated',
        email_confirmed_at: iso(new Date()), confirmed_at: iso(new Date()), created_at: iso(new Date()),
        last_sign_in_at: null, app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: body.user_metadata || {}, identities: [], phone: '', is_anonymous: false,
      };
      users.push(u);
      return json(res, 200, publicUser(u));
    }
    if (req.method === 'PUT' && idMatch) {
      const u = findUser(idMatch[1]);
      if (!u) return json(res, 404, { message: 'not found' });
      if (body.email) u.email = body.email.toLowerCase();
      return json(res, 200, publicUser(u));
    }
    if (req.method === 'DELETE' && idMatch) {
      const i = users.findIndex((x) => x.id === idMatch[1]);
      if (i >= 0) users.splice(i, 1);
      return json(res, 200, publicUser(users[0]));
    }
  }

  return json(res, 404, { message: `unhandled auth path ${path}` });
}
const params0 = (url) => url.searchParams.get('grant_type') || 'password';

/* ------------------------------------------------------------------ */
/* HTTP plumbing                                                       */
/* ------------------------------------------------------------------ */

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-AllowHeaders': '*' });
  res.end(JSON.stringify(obj));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': 'authorization,apikey,content-type,prefer,range,x-client-info,x-supabase-api-version',
    });
    return res.end();
  }
  let body = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (chunks.length) { try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* ignore */ } }
  }
  try {
    if (url.pathname.startsWith('/auth/v1')) return handleAuth(req, res, url, body);
    if (url.pathname.startsWith('/rest/v1/')) return handleRest(req, res, url, body);
    if (url.pathname === '/rest/v1/') return json(res, 200, {});
    return json(res, 404, { message: `no route ${url.pathname}` });
  } catch (err) {
    console.error('mock error', url.pathname, err);
    return json(res, 500, { message: String(err?.message || err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock supabase listening on http://127.0.0.1:${PORT}`);
  console.log(`login: demo@datacore.ai / ${PASS} (pro org) | new@datacore.ai (no org)`);
});

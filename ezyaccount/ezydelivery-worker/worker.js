// =====================================================================
// EzyDelivery Worker — Phase 2/3 (roles, runners, claims)
//
// Store of truth = D1. (A one-way Google Sheet mirror is layered on writes.)
// Roles: admin | staff | account | runner  (users table is authoritative).
//
// Public:
//   POST /onpay-webhook            OnPay -> D1 (auth: body.token)
// Authenticated (Google ID token -> users table):
//   GET  /me                       current user's role
//   GET  /orders                   list (runner sees only own jobs)
//   POST /orders                   manual order (admin/staff)
//   POST /orders/:id/assign        set delivery_type + runner + claim (admin/staff)
//   POST /orders/:id/status        change status / mark WA sent (admin/staff)
//   POST /orders/:id/edit          fix customer fields (admin/staff)
//   GET  /runners                  list runners (admin/staff/account)
//   POST /runners                  create runner (admin)
//   POST /runners/:id              update/deactivate runner (admin)
//   GET  /users                    list users (admin)
//   POST /users                    create/grant role (admin)
//   POST /users/:email             update/deactivate user (admin)
//   GET  /claims                   claims list (admin/account); runner via /orders
//   POST /claims/pay               mark order claim paid (admin/account)
//
// Secrets/vars: ONPAY_WEBHOOK_TOKEN, GOOGLE_CLIENT_ID (optional aud check),
//               SHEET_SYNC_URL (optional Apps Script mirror endpoint)
// Binding: DB (D1)
// =====================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const nowISO = () => new Date().toISOString();
const can = (u, ...roles) => !!u && roles.includes(u.role);

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const method = request.method;

    try {
      // -------- Public: OnPay webhook + Sheet ingest (token-protected) --------
      if (path === '/onpay-webhook' && method === 'POST') return handleWebhook(request, env);
      if (path === '/sheet-ingest' && method === 'POST') return handleSheetIngest(request, env);
      // Public CSV feed for Google Sheets =IMPORTDATA (query-token gated; no header auth possible).
      if (path === '/orders.csv' && method === 'GET') return ordersCsv(url, env);
      // Public customer tracking (per-order token in the link; no login).
      if (path === '/track' && method === 'GET') return trackOrder(url, env);
      if (path === '/track/rate' && method === 'POST') return rateOrder(request, env);

      // -------- Authenticate --------
      const user = await verifyUser(request, env);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      if (path === '/me' && method === 'GET') return json({ user });

      // -------- Orders --------
      if (path === '/orders' && method === 'GET') return listOrders(url, env, user);
      if (path === '/orders' && method === 'POST') {
        if (!can(user, 'admin', 'staff')) return json({ error: 'Forbidden' }, 403);
        return createManualOrder(request, env);
      }
      if (path === '/orders/bulk-assign' && method === 'POST') {
        if (!can(user, 'admin', 'staff')) return json({ error: 'Forbidden' }, 403);
        return bulkAssign(request, env);
      }
      let m;
      if ((m = path.match(/^\/orders\/([^/]+)\/assign$/)) && method === 'POST') {
        if (!can(user, 'admin', 'staff')) return json({ error: 'Forbidden' }, 403);
        return assignOrder(decodeURIComponent(m[1]), request, env);
      }
      if ((m = path.match(/^\/orders\/([^/]+)\/status$/)) && method === 'POST') {
        if (!can(user, 'admin', 'staff', 'runner')) return json({ error: 'Forbidden' }, 403);
        return updateStatus(decodeURIComponent(m[1]), request, env, user);
      }
      if (path === '/runner/ping' && method === 'POST') {
        if (!can(user, 'runner', 'admin')) return json({ error: 'Forbidden' }, 403);
        return runnerPing(request, env, user);
      }
      if ((m = path.match(/^\/orders\/([^/]+)\/edit$/)) && method === 'POST') {
        if (!can(user, 'admin', 'staff')) return json({ error: 'Forbidden' }, 403);
        return editOrder(decodeURIComponent(m[1]), request, env);
      }

      // -------- Forms (branches) --------
      if (path === '/forms' && method === 'GET') {
        if (!can(user, 'admin', 'staff', 'account')) return json({ error: 'Forbidden' }, 403);
        return listForms(env);
      }
      if ((m = path.match(/^\/forms\/([^/]+)$/)) && method === 'POST') {
        if (!can(user, 'admin')) return json({ error: 'Forbidden' }, 403);
        return updateForm(decodeURIComponent(m[1]), request, env);
      }

      // -------- Runners --------
      if (path === '/runners' && method === 'GET') {
        if (!can(user, 'admin', 'staff', 'account')) return json({ error: 'Forbidden' }, 403);
        return listRunners(env);
      }
      if (path === '/runners' && method === 'POST') {
        if (!can(user, 'admin')) return json({ error: 'Forbidden' }, 403);
        return createRunner(request, env);
      }
      if ((m = path.match(/^\/runners\/([^/]+)$/)) && method === 'POST') {
        if (!can(user, 'admin')) return json({ error: 'Forbidden' }, 403);
        return updateRunner(decodeURIComponent(m[1]), request, env);
      }

      // -------- Users / roles --------
      if (path === '/users' && method === 'GET') {
        if (!can(user, 'admin')) return json({ error: 'Forbidden' }, 403);
        return listUsers(env);
      }
      if (path === '/users' && method === 'POST') {
        if (!can(user, 'admin')) return json({ error: 'Forbidden' }, 403);
        return upsertUser(request, env);
      }
      if ((m = path.match(/^\/users\/([^/]+)$/)) && method === 'POST') {
        if (!can(user, 'admin')) return json({ error: 'Forbidden' }, 403);
        return updateUser(decodeURIComponent(m[1]), request, env);
      }

      // -------- Claims --------
      if (path === '/claims' && method === 'GET') {
        if (!can(user, 'admin', 'account')) return json({ error: 'Forbidden' }, 403);
        return listClaims(url, env);
      }
      if (path === '/claims/pay' && method === 'POST') {
        if (!can(user, 'admin', 'account')) return json({ error: 'Forbidden' }, 403);
        return payClaim(request, env);
      }

      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------
async function verifyUser(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;

  const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token));
  if (!res.ok) return null;
  const info = await res.json();
  if (info.email_verified !== 'true' && info.email_verified !== true) return null;
  if (env.GOOGLE_CLIENT_ID && info.aud !== env.GOOGLE_CLIENT_ID) return null;

  const email = (info.email || '').toLowerCase();
  if (!email) return null;

  const row = await env.DB.prepare(
    `SELECT u.email, u.role, u.runner_id, u.active, r.name AS runner_name
       FROM users u LEFT JOIN runners r ON r.id = u.runner_id
      WHERE u.email = ?`
  ).bind(email).first();

  if (!row || !row.active) return null;
  return { email: row.email, role: row.role, runner_id: row.runner_id, runner_name: row.runner_name };
}

// ---------------------------------------------------------------------
// OnPay webhook
// ---------------------------------------------------------------------
async function handleWebhook(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: 'Bad JSON' }, 400); }
  if (!env.ONPAY_WEBHOOK_TOKEN || body.token !== env.ONPAY_WEBHOOK_TOKEN) {
    return json({ error: 'Invalid token' }, 401);
  }
  const sale = body.sale || {};
  const eventType = body.event_type || '';
  const orderId = String(sale.invoice_number || sale.id || sale.uid || '').trim();
  if (!orderId) return json({ error: 'Missing sale id' }, 400);

  if (eventType === 'sale.canceled') {
    await env.DB.prepare(`UPDATE orders SET status='CANCELED', updated_at=? WHERE order_id=?`)
      .bind(nowISO(), orderId).run();
    await mirror(env, orderId);
    return json({ ok: true, canceled: orderId });
  }

  const products = JSON.stringify((sale.products || []).map((p) => ({ name: p.name, qty: p.quantity })));
  // Delivery session lives in an OnPay "extra field" (Tambahan #1/#2/#3) or, in some
  // setups, in a product line. Scan all of them for the SESI/PICKUP pattern.
  const session =
    parseSession(sale.extra_field_1) || parseSession(sale.extra_field_2) ||
    parseSession(sale.extra_field_3) ||
    parseSession((sale.products || []).map((p) => p.name).join(' '));

  const formId = sale.form_id != null ? String(sale.form_id) : null;
  if (formId) {
    // Auto-register the form (branch) the first time we see it; admin renames later.
    await env.DB.prepare(
      `INSERT OR IGNORE INTO forms (form_id, name, active, created_at) VALUES (?,?,1,?)`
    ).bind(formId, 'Borang ' + formId, nowISO()).run();
  }

  await env.DB.prepare(
    `INSERT INTO orders (order_id, created_at, customer_name, phone, address, products, total_amount, delivery_session, form_id, status, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?, 'PENDING', ?)
     ON CONFLICT(order_id) DO UPDATE SET
       created_at=excluded.created_at, customer_name=excluded.customer_name, phone=excluded.phone,
       address=excluded.address, products=excluded.products, total_amount=excluded.total_amount,
       delivery_session=excluded.delivery_session, form_id=excluded.form_id, updated_at=excluded.updated_at`
  ).bind(
    orderId, sale.payment_at || sale.created_at || nowISO(), sale.client_fullname || '',
    normalisePhone(sale.client_phone_number || ''), buildAddress(sale), products,
    Number(sale.total_amount || 0), session, formId, nowISO()
  ).run();

  await mirror(env, orderId);
  return json({ ok: true, order_id: orderId });
}

// ---------------------------------------------------------------------
// Customer tracking (public, per-order token) + live runner GPS
// ---------------------------------------------------------------------
async function trackToken(orderId, env) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(orderId + ':' + (env.TRACK_SECRET || '')));
  return [...new Uint8Array(buf)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function trackOrder(url, env) {
  const orderId = url.searchParams.get('o') || '';
  const tok = url.searchParams.get('t') || '';
  if (!orderId || tok !== await trackToken(orderId, env)) return json({ error: 'Invalid link' }, 401);
  const o = await env.DB.prepare(
    `SELECT o.*, r.name AS runner_name, r.phone AS runner_phone,
            l.lat AS runner_lat, l.lng AS runner_lng, l.updated_at AS runner_loc_at
       FROM orders o LEFT JOIN runners r ON r.id=o.runner_id
       LEFT JOIN runner_locations l ON l.runner_id=o.runner_id WHERE o.order_id=?`
  ).bind(orderId).first();
  if (!o) return json({ error: 'Not found' }, 404);
  let products = []; try { products = JSON.parse(o.products || '[]'); } catch (_) {}
  return json({ order: {
    order_id: o.order_id, name: (o.customer_name || '').trim().split(/\s+/)[0] || '',
    status: o.status, products, delivery_session: o.delivery_session,
    runner_name: o.runner_name, runner_phone: o.runner_phone, est_time: o.est_time,
    tracking: o.tracking, rating: o.rating,
    runner_lat: o.runner_lat, runner_lng: o.runner_lng, runner_loc_at: o.runner_loc_at,
  } });
}

async function rateOrder(request, env) {
  const b = await request.json();
  const orderId = b.o || '', tok = b.t || '';
  if (!orderId || tok !== await trackToken(orderId, env)) return json({ error: 'Invalid link' }, 401);
  const stars = Math.max(1, Math.min(5, parseInt(b.stars, 10) || 0));
  if (!stars) return json({ error: 'Bad rating' }, 400);
  await env.DB.prepare(`UPDATE orders SET rating=?, rating_comment=?, rated_at=? WHERE order_id=?`)
    .bind(stars, (b.comment || '').slice(0, 500), nowISO(), orderId).run();
  await mirror(env, orderId);
  return json({ ok: true });
}

async function runnerPing(request, env, user) {
  if (!user.runner_id) return json({ error: 'Akaun ini tiada runner' }, 400);
  const b = await request.json();
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!isFinite(lat) || !isFinite(lng)) return json({ error: 'Bad coords' }, 400);
  await env.DB.prepare(
    `INSERT INTO runner_locations (runner_id, lat, lng, updated_at) VALUES (?,?,?,?)
     ON CONFLICT(runner_id) DO UPDATE SET lat=excluded.lat, lng=excluded.lng, updated_at=excluded.updated_at`
  ).bind(user.runner_id, lat, lng, nowISO()).run();
  return json({ ok: true });
}

// ---------------------------------------------------------------------
// CSV feed for Google Sheets =IMPORTDATA (read-only live view).
// Gated by ?key= because IMPORTDATA cannot send an Authorization header.
// ---------------------------------------------------------------------
async function ordersCsv(url, env) {
  if (!env.CSV_TOKEN || url.searchParams.get('key') !== env.CSV_TOKEN) {
    return new Response('unauthorized', { status: 401, headers: CORS });
  }
  const { results } = await env.DB.prepare(
    `SELECT o.*, r.name AS runner_name, f.name AS form_name FROM orders o
       LEFT JOIN runners r ON r.id=o.runner_id
       LEFT JOIN forms f ON f.form_id=o.form_id
      ORDER BY o.created_at DESC LIMIT 5000`
  ).all();
  const cols = [['order_id','No. Order'],['created_at','Tarikh'],['customer_name','Nama'],
    ['phone','Telefon'],['address','Alamat'],['products','Produk'],['total_amount','Jumlah (RM)'],
    ['form_name','Cawangan'],['delivery_session','Sesi'],['runner_name','Runner'],['tracking','Tracking'],
    ['status','Status'],['claim_amount','Claim (RM)'],['claim_status','Status Claim'],
    ['wa1_sent_at','WA #1 Hantar'],['wa2_sent_at','WA #2 Hantar'],['updated_at','Dikemaskini']];
  const q = (v) => { v = (v == null ? '' : String(v)); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const prodStr = (s) => { try { return JSON.parse(s || '[]').map((x) => x.name + (x.qty ? ' x' + x.qty : '')).join('; '); } catch (_) { return s || ''; } };
  let csv = cols.map((c) => c[1]).join(',') + '\n';
  for (const o of results) csv += cols.map((c) => q(c[0] === 'products' ? prodStr(o.products) : o[c[0]])).join(',') + '\n';
  return new Response(csv, { status: 200, headers: { ...CORS, 'Content-Type': 'text/csv; charset=utf-8' } });
}

// ---------------------------------------------------------------------
// Google Sheet ingest (OnPay auto-export Sheet -> D1, via Apps Script)
// Body: { token, rows: [{ invois, nama, telefon, alamat, session, produk, jumlah, dimasukkan }] }
// Upsert by order_id; never clobber staff-entered fields on re-sync.
// ---------------------------------------------------------------------
async function handleSheetIngest(request, env) {
  const body = await request.json();
  if (!env.SHEET_INGEST_TOKEN || body.token !== env.SHEET_INGEST_TOKEN) {
    return json({ error: 'Invalid token' }, 401);
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  let inserted = 0, updated = 0, skipped = 0;

  for (const r of rows) {
    const orderId = String(r.invois || '').trim();
    if (!orderId) { skipped++; continue; }
    const session = parseSession(r.session);
    const products = JSON.stringify(parseProducts(r.produk));
    const createdAt = parseSheetDate(r.dimasukkan) || nowISO();

    const res = await env.DB.prepare(
      `INSERT INTO orders (order_id, created_at, customer_name, phone, address, products,
                           total_amount, delivery_session, status, updated_at)
       VALUES (?,?,?,?,?,?,?,?, 'PENDING', ?)
       ON CONFLICT(order_id) DO UPDATE SET
         customer_name=excluded.customer_name, phone=excluded.phone, address=excluded.address,
         products=excluded.products, total_amount=excluded.total_amount,
         delivery_session=excluded.delivery_session, updated_at=excluded.updated_at`
    ).bind(orderId, createdAt, r.nama || '', normalisePhone(r.telefon || ''), r.alamat || '',
           products, Number(r.jumlah || 0), session, nowISO()).run();
    // meta.changes is 1 for insert and 1 for update; distinguish via last_row_id heuristic isn't reliable,
    // so just count processed rows.
    if (res.meta.changes) inserted++;  // "processed" (insert or update)
    await mirror(env, orderId);
  }
  return json({ ok: true, processed: inserted, skipped });
}

function parseSession(txt) {
  const s = String(txt || '').toUpperCase();
  if (s.includes('SELF-PICKUP') || s.includes('SELF PICKUP') || s.includes('PICKUP')) return 'pickup';
  if (s.includes('SESI 1')) return 'sesi1';
  if (s.includes('SESI 2')) return 'sesi2';
  return null;
}
// Split "A : RM55 × 1 B : RM79 × 2" best-effort; fall back to whole string as one line.
function parseProducts(txt) {
  const raw = String(txt || '').trim();
  if (!raw) return [];
  return [{ name: raw, qty: 1 }];
}
// "20-07-2026 13:25:35" (DD-MM-YYYY HH:MM:SS) -> ISO
function parseSheetDate(txt) {
  const m = String(txt || '').match(/(\d{1,2})-(\d{1,2})-(\d{4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, d, mo, y, h, mi, se] = m;
  const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se || 0)));
  return isNaN(dt) ? null : dt.toISOString();
}

// ---------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------
async function listOrders(url, env, user) {
  const status = url.searchParams.get('status');
  const q = (url.searchParams.get('q') || '').trim();
  const from = url.searchParams.get('from'); // created_at >= (ISO date)
  const to = url.searchParams.get('to');
  const limit = Math.min(Number(url.searchParams.get('limit') || 300), 1000);

  const where = [];
  const binds = [];
  // Runner role: only their own jobs.
  if (user.role === 'runner') { where.push('o.runner_id = ?'); binds.push(user.runner_id || '__none__'); }
  if (status) { where.push('o.status = ?'); binds.push(status); }
  if (from) { where.push('o.created_at >= ?'); binds.push(from); }
  if (to) { where.push('o.created_at <= ?'); binds.push(to); }
  if (q) {
    where.push('(o.customer_name LIKE ? OR o.phone LIKE ? OR o.order_id LIKE ?)');
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const sql = `SELECT o.*, r.name AS runner_name, r.phone AS runner_phone, f.name AS form_name FROM orders o
               LEFT JOIN runners r ON r.id = o.runner_id
               LEFT JOIN forms f ON f.form_id = o.form_id
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY o.created_at DESC LIMIT ?`;
  binds.push(limit);
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  const out = await Promise.all(results.map(async (r) => {
    const h = hydrate(r);
    h.track_token = await trackToken(r.order_id, env);  // for the WA tracking link
    return h;
  }));
  return json({ orders: out });
}

async function createManualOrder(request, env) {
  const b = await request.json();
  if (!b.customer_name || !b.phone) return json({ error: 'Nama & telefon wajib' }, 400);
  const orderId = 'M' + Date.now();
  const products = JSON.stringify(Array.isArray(b.products) ? b.products : []);
  await env.DB.prepare(
    `INSERT INTO orders (order_id, created_at, customer_name, phone, address, products, total_amount, status, updated_at)
     VALUES (?,?,?,?,?,?,?, 'PENDING', ?)`
  ).bind(orderId, nowISO(), b.customer_name, normalisePhone(b.phone), b.address || '',
         products, Number(b.total_amount || 0), nowISO()).run();
  await mirror(env, orderId);
  return json({ ok: true, order_id: orderId });
}

async function assignOrder(orderId, request, env) {
  const b = await request.json();
  const dtype = b.delivery_type === 'lalamove' ? 'lalamove' : 'freelance';
  let runnerId = null, claimAmount = null, claimStatus = null;
  if (dtype === 'freelance') {
    runnerId = b.runner_id || null;
    claimAmount = b.claim_amount != null ? Number(b.claim_amount) : null;
    claimStatus = 'pending';
  }
  const res = await env.DB.prepare(
    `UPDATE orders SET
       delivery_type=?, runner_id=?, claim_amount=?, claim_status=?,
       tracking=?, est_time=?, remark=?,
       status = CASE WHEN status='PENDING' THEN 'ASSIGNED' ELSE status END,
       updated_at=?
     WHERE order_id=?`
  ).bind(dtype, runnerId, claimAmount, claimStatus,
         b.tracking || '', b.est_time || '', b.remark || '', nowISO(), orderId).run();
  if (!res.meta.changes) return json({ error: 'Order not found' }, 404);
  await mirror(env, orderId);
  return json({ ok: true });
}

// Assign many orders at once (same runner/Lalamove + optional flat claim). Tracking
// stays per-order (unique) so it is NOT set here.
async function bulkAssign(request, env) {
  const b = await request.json();
  const ids = Array.isArray(b.order_ids) ? b.order_ids : [];
  if (!ids.length) return json({ error: 'Tiada order' }, 400);
  const dtype = b.delivery_type === 'lalamove' ? 'lalamove' : 'freelance';
  let runnerId = null, claim = null, claimStatus = null;
  if (dtype === 'freelance') {
    runnerId = b.runner_id || null;
    claim = b.claim_amount != null && b.claim_amount !== '' ? Number(b.claim_amount) : null;
    claimStatus = 'pending';
  }
  const ph = ids.map(() => '?').join(',');
  const res = await env.DB.prepare(
    `UPDATE orders SET delivery_type=?, runner_id=?, claim_amount=?, claim_status=?,
       est_time=COALESCE(NULLIF(?,''), est_time), remark=COALESCE(NULLIF(?,''), remark),
       status = CASE WHEN status='PENDING' THEN 'ASSIGNED' ELSE status END, updated_at=?
     WHERE order_id IN (${ph})`
  ).bind(dtype, runnerId, claim, claimStatus, b.est_time || '', b.remark || '', nowISO(), ...ids).run();
  for (const id of ids) await mirror(env, id);
  return json({ ok: true, assigned: res.meta.changes });
}

async function updateStatus(orderId, request, env, user) {
  const b = await request.json();
  // Runner may only touch their own order, and only ON_DELIVERY/DELIVERED.
  if (user && user.role === 'runner') {
    const own = await env.DB.prepare(`SELECT runner_id FROM orders WHERE order_id=?`).bind(orderId).first();
    if (!own || own.runner_id !== user.runner_id) return json({ error: 'Bukan order anda' }, 403);
    if (b.status && !['ON_DELIVERY', 'DELIVERED'].includes(b.status)) return json({ error: 'Status tak dibenarkan' }, 403);
  }
  const allowed = ['PENDING', 'ASSIGNED', 'ON_DELIVERY', 'DELIVERED', 'CANCELED'];
  const sets = ['updated_at=?']; const binds = [nowISO()];
  if (b.status) {
    if (!allowed.includes(b.status)) return json({ error: 'Bad status' }, 400);
    sets.unshift('status=?'); binds.unshift(b.status);
  }
  if (b.wa === 'wa1') { sets.push('wa1_sent_at=?'); binds.push(nowISO()); }
  if (b.wa === 'wa2') { sets.push('wa2_sent_at=?'); binds.push(nowISO()); }
  binds.push(orderId);
  const res = await env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE order_id=?`).bind(...binds).run();
  if (!res.meta.changes) return json({ error: 'Order not found' }, 404);
  await mirror(env, orderId);
  return json({ ok: true });
}

async function editOrder(orderId, request, env) {
  const b = await request.json();
  const res = await env.DB.prepare(
    `UPDATE orders SET customer_name=?, phone=?, address=?, updated_at=? WHERE order_id=?`
  ).bind(b.customer_name || '', normalisePhone(b.phone || ''), b.address || '', nowISO(), orderId).run();
  if (!res.meta.changes) return json({ error: 'Order not found' }, 404);
  await mirror(env, orderId);
  return json({ ok: true });
}

// ---------------------------------------------------------------------
// Forms (branches)
// ---------------------------------------------------------------------
async function listForms(env) {
  const { results } = await env.DB.prepare(`SELECT * FROM forms ORDER BY active DESC, name ASC`).all();
  return json({ forms: results });
}
async function updateForm(formId, request, env) {
  const b = await request.json();
  await env.DB.prepare(
    `UPDATE forms SET name=COALESCE(?,name), active=COALESCE(?,active) WHERE form_id=?`
  ).bind(b.name ?? null, b.active != null ? (b.active ? 1 : 0) : null, formId).run();
  return json({ ok: true });
}

// ---------------------------------------------------------------------
// Runners
// ---------------------------------------------------------------------
async function listRunners(env) {
  const { results } = await env.DB.prepare(`SELECT * FROM runners ORDER BY active DESC, name ASC`).all();
  return json({ runners: results });
}
async function createRunner(request, env) {
  const b = await request.json();
  if (!b.name) return json({ error: 'Nama wajib' }, 400);
  const id = 'r' + Date.now();
  await env.DB.prepare(
    `INSERT INTO runners (id, name, phone, email, active, created_at) VALUES (?,?,?,?,1,?)`
  ).bind(id, b.name, b.phone || '', (b.email || '').toLowerCase() || null, nowISO()).run();
  // If an email was given, also grant a runner-role user linked to this runner.
  if (b.email) {
    await env.DB.prepare(
      `INSERT INTO users (email, role, runner_id, active, created_at) VALUES (?, 'runner', ?, 1, ?)
       ON CONFLICT(email) DO UPDATE SET role='runner', runner_id=excluded.runner_id, active=1`
    ).bind((b.email).toLowerCase(), id, nowISO()).run();
  }
  return json({ ok: true, id });
}
async function updateRunner(id, request, env) {
  const b = await request.json();
  await env.DB.prepare(
    `UPDATE runners SET name=COALESCE(?,name), phone=COALESCE(?,phone),
       email=COALESCE(?,email), active=COALESCE(?,active) WHERE id=?`
  ).bind(b.name ?? null, b.phone ?? null, b.email != null ? b.email.toLowerCase() : null,
         b.active != null ? (b.active ? 1 : 0) : null, id).run();
  return json({ ok: true });
}

// ---------------------------------------------------------------------
// Users / roles
// ---------------------------------------------------------------------
async function listUsers(env) {
  const { results } = await env.DB.prepare(
    `SELECT u.*, r.name AS runner_name FROM users u LEFT JOIN runners r ON r.id=u.runner_id
     ORDER BY u.active DESC, u.role, u.email`
  ).all();
  return json({ users: results });
}
async function upsertUser(request, env) {
  const b = await request.json();
  const email = (b.email || '').toLowerCase();
  const roles = ['admin', 'staff', 'account', 'runner'];
  if (!email || !roles.includes(b.role)) return json({ error: 'Email & role sah wajib' }, 400);
  await env.DB.prepare(
    `INSERT INTO users (email, role, runner_id, active, created_at) VALUES (?,?,?,1,?)
     ON CONFLICT(email) DO UPDATE SET role=excluded.role, runner_id=excluded.runner_id, active=1`
  ).bind(email, b.role, b.runner_id || null, nowISO()).run();
  return json({ ok: true });
}
async function updateUser(email, request, env) {
  const b = await request.json();
  email = email.toLowerCase();
  if (email === 'keyrooll@gmail.com' && b.active === false) {
    return json({ error: 'Tak boleh nyahaktif super admin' }, 400);
  }
  await env.DB.prepare(
    `UPDATE users SET role=COALESCE(?,role), runner_id=?, active=COALESCE(?,active) WHERE email=?`
  ).bind(b.role ?? null, b.runner_id ?? null, b.active != null ? (b.active ? 1 : 0) : null, email).run();
  return json({ ok: true });
}

// ---------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------
async function listClaims(url, env) {
  const st = url.searchParams.get('status') || 'pending'; // pending | paid | all
  const where = ["o.delivery_type='freelance'", 'o.claim_amount IS NOT NULL'];
  const binds = [];
  if (st !== 'all') { where.push('o.claim_status = ?'); binds.push(st); }
  const sql = `SELECT o.order_id, o.customer_name, o.claim_amount, o.claim_status, o.claim_paid_at,
                      o.status, o.runner_id, r.name AS runner_name, o.created_at
               FROM orders o LEFT JOIN runners r ON r.id=o.runner_id
               WHERE ${where.join(' AND ')} ORDER BY o.created_at DESC`;
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ claims: results });
}
async function payClaim(request, env) {
  const b = await request.json();
  const ids = Array.isArray(b.order_ids) ? b.order_ids : (b.order_id ? [b.order_id] : []);
  if (!ids.length) return json({ error: 'Tiada order' }, 400);
  const ph = ids.map(() => '?').join(',');
  await env.DB.prepare(
    `UPDATE orders SET claim_status='paid', claim_paid_at=? WHERE order_id IN (${ph}) AND delivery_type='freelance'`
  ).bind(nowISO(), ...ids).run();
  for (const id of ids) await mirror(env, id);
  return json({ ok: true, paid: ids.length });
}

// ---------------------------------------------------------------------
// Google Sheet one-way mirror (best-effort; never blocks the write)
// ---------------------------------------------------------------------
async function mirror(env, orderId) {
  if (!env.SHEET_SYNC_URL) return;
  try {
    const row = await env.DB.prepare(
      `SELECT o.*, r.name AS runner_name, f.name AS form_name FROM orders o
         LEFT JOIN runners r ON r.id=o.runner_id
         LEFT JOIN forms f ON f.form_id=o.form_id
        WHERE o.order_id=?`
    ).bind(orderId).first();
    if (!row) return;
    await fetch(env.SHEET_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'order', row }),
    });
  } catch (_) { /* mirror is best-effort; D1 remains source of truth */ }
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function hydrate(row) {
  let products = [];
  try { products = JSON.parse(row.products || '[]'); } catch { /* keep [] */ }
  return { ...row, products };
}
function normalisePhone(raw) {
  let d = String(raw).replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('60')) return d;
  if (d.startsWith('0')) return '60' + d.slice(1);
  if (d.startsWith('1')) return '60' + d;
  return d;
}
function buildAddress(sale) {
  // Webhook "simple" address type puts everything in client_address; the line
  // fields are empty. Sheet/full type uses the line fields. Support both.
  const lines = [sale.client_address_line_1, sale.client_address_line_2, sale.client_address_line_3,
                 sale.client_address_line_4, sale.client_address_city, sale.client_address_state]
    .map((s) => (s || '').trim()).filter(Boolean).join(', ');
  return lines || (sale.client_address || '').trim();
}

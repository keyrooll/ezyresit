// Cloudflare Worker: EzyAccount staff backend (ezyaccount-staff.keyrooll.workers.dev)
// v1.0 — staff email/password login + draft receipt uploads. Dedicated worker, separate from the
// AI proxy (ezyresit) so the AI path is never affected.
//
// Flow: staff register (self) -> admin approves -> staff login (JWT, 30 days) -> upload draft
// receipts (image -> R2, metadata -> D1). An accountant's app later pulls pending uploads and
// writes them into the Sheet/Drive with their own Google token, then marks them flushed.
//
// Endpoints:
//   GET  /                      health
//   POST /staff/register        { email, password, company, branch?, name? } -> pending
//   POST /staff/login           { email, password } -> { token } if approved, else 403 pending
//   GET  /staff/me              (JWT) current staff claims
//   POST /staff/upload          (JWT) multipart: image, branch?, amount?, note?
//   GET  /staff/my-uploads      (JWT) this staff's uploads
//   GET  /staff/admin/list      (Google admin) list staff [+?company=]
//   POST /staff/admin/approve   (Google admin) { email, status?, role?, branch? }
//
// Secret:  JWT_SECRET (signs staff tokens)
// Var:     ADMIN_EMAILS (comma-separated Google emails allowed to approve)
// Bindings: DB (D1 "ezyaccount") · RECEIPTS (R2 "ezyaccount-receipts")

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};
const nowISO = () => new Date().toISOString();
const sjson = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ---------------------------------------------------------------------------
// crypto (Web Crypto only)
// ---------------------------------------------------------------------------
const ENC = new TextEncoder();
function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
async function pbkdf2(password, salt, iterations, lenBits) {
  const key = await crypto.subtle.importKey('raw', ENC.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, lenBits);
  return new Uint8Array(bits);
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, 100000, 256);
  return 'pbkdf2$100000$' + b64url(salt) + '$' + b64url(hash);
}
async function verifyPassword(password, stored) {
  try {
    const [scheme, iterS, saltS, hashS] = (stored || '').split('$');
    if (scheme !== 'pbkdf2') return false;
    const salt = b64urlBytes(saltS);
    const expected = b64urlBytes(hashS);
    const got = await pbkdf2(password, salt, Number(iterS) || 100000, expected.length * 8);
    if (got.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i]; // constant-time
    return diff === 0;
  } catch (e) {
    return false;
  }
}
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', ENC.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function jwtSign(payload, secret) {
  const seg = b64url(ENC.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))) + '.' + b64url(ENC.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), ENC.encode(seg));
  return seg + '.' + b64url(sig);
}
async function jwtVerify(token, secret) {
  try {
    const [h, p, s] = (token || '').split('.');
    if (!h || !p || !s) return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), b64urlBytes(s), ENC.encode(h + '.' + p));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlBytes(p)));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// auth helpers
// ---------------------------------------------------------------------------
const bearer = (req) => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();

async function staffClaims(request, env) {
  if (!env.JWT_SECRET) return null;
  const tok = bearer(request);
  if (!tok) return null;
  return jwtVerify(tok, env.JWT_SECRET);
}
// Admin gate: the caller's Google access token must resolve to an allowed email.
async function adminEmail(request, env) {
  const tok = bearer(request);
  if (!tok) return null;
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: 'Bearer ' + tok } });
    if (!r.ok) return null;
    const u = await r.json();
    const email = (u.email || '').toLowerCase();
    const allow = (env.ADMIN_EMAILS || 'keyrooll@gmail.com').toLowerCase().split(',').map((s) => s.trim());
    return allow.includes(email) ? email : null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// staff endpoints
// ---------------------------------------------------------------------------
async function staffRegister(request, env) {
  const b = await request.json().catch(() => ({}));
  const email = (b.email || '').trim().toLowerCase();
  const password = b.password || '';
  const company = (b.company || '').trim();
  const name = (b.name || '').trim();
  const branch = (b.branch || '').trim();
  // company is NOT required at registration — the admin assigns it when approving.
  if (!email || !password) return sjson({ error: 'email & password wajib' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sjson({ error: 'Email tidak sah' }, 400);
  if (password.length < 6) return sjson({ error: 'Password minimum 6 aksara' }, 400);
  const existing = await env.DB.prepare('SELECT status FROM staff_auth WHERE email=?').bind(email).first();
  // A previously REJECTED email may register again; pending/approved cannot double-register.
  if (existing && existing.status !== 'rejected') return sjson({ error: 'Email sudah didaftar', status: existing.status }, 409);
  const pass_hash = await hashPassword(password);
  if (existing) {
    await env.DB.prepare("UPDATE staff_auth SET pass_hash=?, name=?, company='', branch='', role='staff', status='pending', created_at=?, approved_at=NULL, approved_by=NULL WHERE email=?")
      .bind(pass_hash, name, nowISO(), email).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO staff_auth (email,pass_hash,name,company,branch,role,status,created_at) VALUES (?,?,?,?,?,?,?,?)'
    ).bind(email, pass_hash, name, company, branch, 'staff', 'pending', nowISO()).run();
  }
  return sjson({ ok: true, status: 'pending', message: 'Daftar berjaya. Menunggu kelulusan admin.' });
}

async function staffLogin(request, env) {
  const b = await request.json().catch(() => ({}));
  const email = (b.email || '').trim().toLowerCase();
  const password = b.password || '';
  if (!email || !password) return sjson({ error: 'email & password wajib' }, 400);
  const row = await env.DB.prepare('SELECT * FROM staff_auth WHERE email=?').bind(email).first();
  if (!row || !(await verifyPassword(password, row.pass_hash))) return sjson({ error: 'Email atau password salah' }, 401);
  if (row.status !== 'approved') return sjson({ status: row.status, pending: true, message: 'Akaun menunggu kelulusan admin.' }, 403);
  if (!env.JWT_SECRET) return sjson({ error: 'Worker misconfigured: JWT_SECRET not set' }, 500);
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days — stay logged in
  let roles = {}; try { roles = row.roles ? JSON.parse(row.roles) : {}; } catch (e) {}
  if (!Object.keys(roles).length && row.company && row.role) roles[row.company] = row.role; // legacy fallback
  let branches = {}; try { branches = row.branches ? JSON.parse(row.branches) : {}; } catch (e) {} // {companyId:[branch,...]}, empty = all allowed
  const token = await jwtSign({ email: row.email, name: row.name, company: row.company, roles, branches, exp }, env.JWT_SECRET);
  return sjson({ ok: true, token, staff: { email: row.email, name: row.name, company: row.company, roles, branches } });
}

async function staffUpload(request, env, claims) {
  if (!env.RECEIPTS) return sjson({ error: 'Storage (R2) belum dikonfigur' }, 500);
  const form = await request.formData().catch(() => null);
  if (!form) return sjson({ error: 'Perlu multipart form (image)' }, 400);
  const file = form.get('image');
  if (!file || typeof file === 'string') return sjson({ error: 'image wajib' }, 400);
  // Destination company: a multi-company staff may file this receipt to ANY company they hold a role for.
  const roles = claims.roles || {};
  const reqCompany = (form.get('company') || '').toString().trim();
  const company = (reqCompany && roles[reqCompany]) ? reqCompany : (claims.company || Object.keys(roles)[0] || '');
  if (!company) return sjson({ error: 'Tiada syarikat untuk staff ini' }, 400);
  const branch = (form.get('branch') || claims.branch || '').toString();
  const note = (form.get('note') || '').toString();
  const amount = parseFloat(form.get('amount')) || null;
  const id = crypto.randomUUID();
  const ct = file.type || 'image/jpeg';
  const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
  const key = `${company}/${id}.${ext}`;
  await env.RECEIPTS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: ct } });
  await env.DB.prepare(
    'INSERT INTO pending_uploads (id,email,company,branch,r2_key,content_type,amount,note,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, claims.email, company, branch, key, ct, amount, note, 'pending', nowISO()).run();
  // Mirror to Miss CFO's 'CFO Inbox' tab (she is Claude with Sheets+Drive only — no API). Best-effort:
  // push the image to the owner's Drive + append an inbox row she can read. Never fail the upload.
  try {
    const _tok = await getOwnerToken(env);
    const _obj = await env.RECEIPTS.get(key);
    let _link = '';
    if(_obj){ _link = await driveUploadImage(_tok, 'CFO Inbox', `${id}.${ext}`, await _obj.arrayBuffer(), ct); }
    await sheetAppendSafe(_tok, CFO_COMMS_SHEET, "'CFO Inbox'", [[id, nowISO(), claims.email, company+(branch?(' / '+branch):''), '', '', '', (amount||''), '1', _link, 'pending', '', '']]);
  } catch(e) { /* mirror is best-effort; R2+D1 upload already succeeded */ }
  return sjson({ ok: true, id, r2_key: key });
}

async function staffMyUploads(request, env, claims) {
  const r = await env.DB.prepare(
    'SELECT id,branch,amount,note,status,created_at FROM pending_uploads WHERE email=? ORDER BY created_at DESC LIMIT 100'
  ).bind(claims.email).all();
  return sjson({ uploads: r.results || [] });
}

async function staffAdminList(request, env) {
  if (!(await adminEmail(request, env))) return sjson({ error: 'Unauthorized' }, 401);
  const company = new URL(request.url).searchParams.get('company');
  const staff = (await (company
    ? env.DB.prepare('SELECT email,name,company,branch,role,roles,branches,status,created_at FROM staff_auth WHERE company=? ORDER BY created_at DESC').bind(company)
    : env.DB.prepare('SELECT email,name,company,branch,role,roles,branches,status,created_at FROM staff_auth ORDER BY created_at DESC')
  ).all()).results || [];
  staff.forEach(s => {
    try { s.roles = s.roles ? JSON.parse(s.roles) : {}; } catch (e) { s.roles = {}; }
    try { s.branches = s.branches ? JSON.parse(s.branches) : {}; } catch (e) { s.branches = {}; }
  });
  return sjson({ staff });
}

async function staffAdminApprove(request, env) {
  const who = await adminEmail(request, env);
  if (!who) return sjson({ error: 'Unauthorized' }, 401);
  const b = await request.json().catch(() => ({}));
  const email = (b.email || '').trim().toLowerCase();
  if (!email) return sjson({ error: 'email wajib' }, 400);
  const row = await env.DB.prepare('SELECT email FROM staff_auth WHERE email=?').bind(email).first();
  if (!row) return sjson({ error: 'Staff tidak dijumpai' }, 404);

  // Preferred: a per-company roles map {companyId: role} — like the Google-staff registry.
  if (b.roles && typeof b.roles === 'object') {
    const roles = {};
    for (const [c, r] of Object.entries(b.roles)) { const rr = (r || '').trim(); if (rr && rr !== '-') roles[c] = rr; }
    const companies = Object.keys(roles);
    // Per-company allowed branches {companyId:[branch,...]}. Keep only companies that still hold a role.
    // Empty/absent list for a company => all branches of that company are allowed.
    const branches = {};
    if (b.branches && typeof b.branches === 'object') {
      for (const c of companies) {
        const arr = Array.isArray(b.branches[c]) ? b.branches[c].map(x => (x || '').toString().trim()).filter(Boolean) : [];
        if (arr.length) branches[c] = arr;
      }
    }
    const status = b.status === 'rejected' ? 'rejected' : (companies.length ? 'approved' : 'pending');
    const primary = companies[0] || '';
    await env.DB.prepare('UPDATE staff_auth SET roles=?, branches=?, status=?, company=?, role=?, approved_at=?, approved_by=? WHERE email=?')
      .bind(JSON.stringify(roles), JSON.stringify(branches), status, primary, (roles[primary] || 'staff'), nowISO(), who, email).run();
    return sjson({ ok: true, email, status, roles, branches });
  }

  // Legacy single-company approve (staff-admin.html).
  const status = b.status === 'rejected' ? 'rejected' : 'approved';
  const role = (b.role || 'staff').trim();
  const company = (b.company || '').trim();
  const branch = (b.branch || '').trim();
  if (status === 'approved' && !company) {
    const cur = await env.DB.prepare('SELECT company FROM staff_auth WHERE email=?').bind(email).first();
    if (!cur || !cur.company) return sjson({ error: 'Sila pilih syarikat untuk staff ini' }, 400);
  }
  const rolesJson = JSON.stringify(company ? { [company]: role } : {});
  await env.DB.prepare('UPDATE staff_auth SET status=?, role=?, company=COALESCE(NULLIF(?,\'\'),company), branch=COALESCE(NULLIF(?,\'\'),branch), roles=?, approved_at=?, approved_by=? WHERE email=?')
    .bind(status, role, company, branch, rolesJson, nowISO(), who, email).run();
  return sjson({ ok: true, email, status, role, company });
}

// --- Phase 3: accountant flush. The accountant's app pulls pending uploads, writes each into the
// Sheet/Drive with its own Google token, then marks it flushed. All gated by a Google admin email. ---
async function staffPendingUploads(request, env) {
  if (!(await adminEmail(request, env))) return sjson({ error: 'Unauthorized' }, 401);
  const company = new URL(request.url).searchParams.get('company');
  const q = company
    ? env.DB.prepare("SELECT id,email,company,branch,amount,note,content_type,created_at FROM pending_uploads WHERE status='pending' AND company=? ORDER BY created_at ASC").bind(company)
    : env.DB.prepare("SELECT id,email,company,branch,amount,note,content_type,created_at FROM pending_uploads WHERE status='pending' ORDER BY created_at ASC");
  return sjson({ uploads: (await q.all()).results || [] });
}
// Raw image bytes for one pending upload (so the app can re-upload it to Drive).
async function staffImage(request, env, id) {
  if (!(await adminEmail(request, env))) return new Response('Unauthorized', { status: 401, headers: CORS });
  const row = await env.DB.prepare('SELECT r2_key,content_type FROM pending_uploads WHERE id=?').bind(id).first();
  if (!row) return new Response('Not found', { status: 404, headers: CORS });
  const obj = await env.RECEIPTS.get(row.r2_key);
  if (!obj) return new Response('Gone', { status: 410, headers: CORS });
  return new Response(obj.body, { headers: { ...CORS, 'Content-Type': row.content_type || 'image/jpeg' } });
}
async function staffFlushDone(request, env) {
  const who = await adminEmail(request, env);
  if (!who) return sjson({ error: 'Unauthorized' }, 401);
  const b = await request.json().catch(() => ({}));
  const id = (b.id || '').trim();
  if (!id) return sjson({ error: 'id wajib' }, 400);
  await env.DB.prepare("UPDATE pending_uploads SET status='flushed', flushed_at=?, flushed_by=? WHERE id=?").bind(nowISO(), who, id).run();
  return sjson({ ok: true, id });
}

async function staffRouter(path, method, request, env) {
  if (!env.DB) return sjson({ error: 'Backend belum dikonfigur (tiada D1)' }, 500);
  if (path === '/staff/register' && method === 'POST') return staffRegister(request, env);
  if (path === '/staff/login' && method === 'POST') return staffLogin(request, env);
  if (path === '/staff/admin/list' && method === 'GET') return staffAdminList(request, env);
  if (path === '/staff/admin/approve' && method === 'POST') return staffAdminApprove(request, env);
  if (path === '/staff/pending-uploads' && method === 'GET') return staffPendingUploads(request, env);
  if (path === '/staff/flush-done' && method === 'POST') return staffFlushDone(request, env);
  let _im;
  if ((_im = path.match(/^\/staff\/image\/([^/]+)$/)) && method === 'GET') return staffImage(request, env, decodeURIComponent(_im[1]));
  const claims = await staffClaims(request, env);
  if (!claims) return sjson({ error: 'Unauthorized' }, 401);
  if (path === '/staff/me' && method === 'GET') return sjson({ staff: claims });
  if (path === '/staff/upload' && method === 'POST') return staffUpload(request, env, claims);
  if (path === '/staff/my-uploads' && method === 'GET') return staffMyUploads(request, env, claims);
  return sjson({ error: 'Not found' }, 404);
}

// ===========================================================================
// Owner OAuth — the worker acts as the owner (keyrooll@gmail.com) for all Sheet/Drive work,
// via a one-time offline consent that yields a refresh token (stored in D1 app_config).
// This keeps everything in the owner's own Google Drive/Sheets (no service-account quota issue).
// ===========================================================================
const OAUTH_REDIRECT = 'https://ezyaccount-staff.keyrooll.workers.dev/oauth/callback';
const OWNER_SCOPE = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email';
async function cfgGet(env, key){ const r = await env.DB.prepare('SELECT value FROM app_config WHERE key=?').bind(key).first(); return r ? r.value : null; }
async function cfgSet(env, key, value){
  await env.DB.prepare('INSERT INTO app_config (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at')
    .bind(key, value, nowISO()).run();
}
function oauthStart(env){
  if(!env.GOOGLE_CLIENT_ID) return new Response('GOOGLE_CLIENT_ID belum diset', {status:500});
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  u.searchParams.set('redirect_uri', OAUTH_REDIRECT);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', OWNER_SCOPE);
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent'); // force a refresh_token every time
  return Response.redirect(u.toString(), 302);
}
async function oauthCallback(request, env){
  const code = new URL(request.url).searchParams.get('code');
  const htmlResp = (msg, ok) => new Response(`<div style="font-family:sans-serif;padding:40px;text-align:center"><h2>${ok?'✅ Berjaya!':'⚠️ Gagal'}</h2><p>${msg}</p></div>`, {status: ok?200:400, headers:{'Content-Type':'text/html;charset=utf-8'}});
  if(!code) return htmlResp('Tiada kod kebenaran.', false);
  if(!env.GOOGLE_CLIENT_SECRET) return htmlResp('GOOGLE_CLIENT_SECRET belum diset pada worker.', false);
  const r = await fetch('https://oauth2.googleapis.com/token', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: OAUTH_REDIRECT, grant_type: 'authorization_code' })});
  const d = await r.json();
  if(d.error) return htmlResp('Token error: '+(d.error_description||d.error), false);
  if(!d.refresh_token) return htmlResp('Tiada refresh_token. Pergi myaccount.google.com/permissions → buang akses app ini → cuba /oauth/start semula.', false);
  await cfgSet(env, 'owner_refresh_token', d.refresh_token);
  try{ const ur=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:'Bearer '+d.access_token}}); const u=await ur.json(); if(u.email) await cfgSet(env,'owner_email', u.email); }catch(e){}
  return htmlResp('Worker dah dapat akses Drive/Sheet anda. Tutup tab ini.', true);
}
let _ownerTok = null, _ownerTokExp = 0;
async function getOwnerToken(env){
  if(_ownerTok && Date.now() < _ownerTokExp - 60000) return _ownerTok;
  const rt = await cfgGet(env, 'owner_refresh_token');
  if(!rt) throw new Error('Owner belum authorize');
  const r = await fetch('https://oauth2.googleapis.com/token', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: rt, grant_type: 'refresh_token' })});
  const d = await r.json();
  if(d.error) throw new Error('Refresh error: '+(d.error_description||d.error));
  _ownerTok = d.access_token; _ownerTokExp = Date.now() + (d.expires_in||3600)*1000;
  return _ownerTok;
}
async function oauthStatus(request, env){
  if(!(await adminEmail(request, env))) return sjson({ error:'Unauthorized' }, 401);
  const rt = await cfgGet(env,'owner_refresh_token'); const em = await cfgGet(env,'owner_email');
  let token_ok=false, err=null;
  try{ if(rt){ await getOwnerToken(env); token_ok=true; } }catch(e){ err=e.message; }
  return sjson({ connected: !!rt, owner_email: em||null, token_ok, err });
}

// ===========================================================================
// Data gateway — Sheet/Drive operations done AS THE OWNER, gated by the caller's JWT company.
// The app never sends a sheetId; the worker resolves it from the company, so a user can only
// touch the company they belong to.
// ===========================================================================
const COMPANY_SHEETS = {
  ezysupplier:'1u3H6D57vx7jahjc40S9u_qwhCXduMQ7gMTZyoP7J8Z8',
  ezybranch:'1V5qK1giqd83qjUyV3hznvzIsmOluo_3WkxCLVBIQgAw',
  ezybakery:'1tEn5oSoYrFsiDQ_CtQnLSVHMk5vplhjvdP0XOvwY_I4',
  ezycafe:'185oycpZwZDn0sl8cQCTmycrPGY084vL43aJXTzy6TNY',
  ezydurian:'1u3H6D57vx7jahjc40S9u_qwhCXduMQ7gMTZyoP7J8Z8',
  ezydurianhq:'1I9RE0hef3y86iB7K9TYM7l3CKR0M-WTJuWJmsHWbHJc',
  ezycashier:'10zrv3S5Yetz8M3zqZDpu70bxDbJDHJWSvKOY7kNwWmE',
  ezysentralkitchen:'15bDRxspLWHZLqSwh3Tt4iXiH1CEVUH2PV1KQiUJKNwk',
};
// Which company the caller may act on: email user (JWT) -> their own; Google admin -> any.
async function dataActor(request, env, company){
  const claims = await staffClaims(request, env);
  if(claims){
    const roles = claims.roles || {};
    if(roles[company]) return {ok:true, who:claims.email, role:roles[company]};
    if(claims.company && claims.company===company) return {ok:true, who:claims.email}; // legacy
    return {ok:false};
  }
  const adm = await adminEmail(request, env);
  if(adm) return {ok:true, who:adm, admin:true};
  return {ok:false};
}
async function dataSheet(request, env){
  const b = await request.json().catch(()=>({}));
  const company = (b.company||'').trim();
  const sheetId = COMPANY_SHEETS[company];
  if(!sheetId) return sjson({error:'Syarikat tidak sah'},400);
  const act = await dataActor(request, env, company);
  if(!act.ok) return sjson({error:'Unauthorized'},401);
  let token; try{ token=await getOwnerToken(env); }catch(e){ return sjson({error:'Owner token: '+e.message},500); }
  const op=b.op||'get';
  const base=`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const H={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  try{
    let r;
    if(op==='get'){ r=await fetch(`${base}/values/${encodeURIComponent(b.range)}`,{headers:{Authorization:'Bearer '+token}}); }
    else if(op==='append'){ r=await fetch(`${base}/values/${encodeURIComponent(b.range)}:append?valueInputOption=${b.valueInputOption||'USER_ENTERED'}&insertDataOption=INSERT_ROWS`,{method:'POST',headers:H,body:JSON.stringify({values:b.values||[]})}); }
    else if(op==='update'){ r=await fetch(`${base}/values/${encodeURIComponent(b.range)}?valueInputOption=${b.valueInputOption||'USER_ENTERED'}`,{method:'PUT',headers:H,body:JSON.stringify({values:b.values||[]})}); }
    else if(op==='batchUpdate'){ r=await fetch(`${base}:batchUpdate`,{method:'POST',headers:H,body:JSON.stringify(b.body||{})}); }
    else return sjson({error:'Unknown op'},400);
    return sjson(await r.json(), r.status);
  }catch(e){ return sjson({error:'Sheet proxy: '+e.message},500); }
}

// ===========================================================================
// CFO API — an authorized AI agent ("Miss CFO") processes pending staff receipts:
// reads the image, then files a COMPLETED receipt (resit + resit_items) into the company
// sheet AS THE OWNER and pushes the image into the owner's Drive. Gated by one CFO_API_KEY
// secret (scoped to /cfo/* only — it can NOT approve staff or touch other admin endpoints).
// ===========================================================================
const CFO_DRIVE_ROOT = '1GmJWOikquZb-As-XdJAYgZao_EXQcfY-';
const CFO_COMMS_SHEET = '1E-esYH5cTy0sQpdWax-B3k0maO9Cj4XdRRLwrgCdC0Y'; // Miss CFO comms + CFO Inbox mirror (she is Claude: Sheets+Drive only)
const MALAY_MONTHS = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];
function cfoAuth(request, env){
  const h = request.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  const key = (m ? m[1] : (new URL(request.url).searchParams.get('key') || '')).trim();
  return !!(env.CFO_API_KEY && key && key === env.CFO_API_KEY);
}
function colLetter(n){ let s=''; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
async function cfoInbox(request, env){
  if(!cfoAuth(request, env)) return sjson({ error:'Unauthorized' }, 401);
  const url = new URL(request.url);
  const company = url.searchParams.get('company');
  const q = company
    ? env.DB.prepare("SELECT id,email,company,branch,amount,note,content_type,created_at FROM pending_uploads WHERE status='pending' AND company=? ORDER BY created_at ASC").bind(company)
    : env.DB.prepare("SELECT id,email,company,branch,amount,note,content_type,created_at FROM pending_uploads WHERE status='pending' ORDER BY created_at ASC");
  const rows = (await q.all()).results || [];
  const uploads = rows.map(r => ({ ...r, image_url: url.origin + '/cfo/image/' + r.id }));
  return sjson({ count: uploads.length, uploads });
}
async function cfoImage(request, env, id){
  if(!cfoAuth(request, env)) return new Response('Unauthorized', { status:401, headers:CORS });
  const row = await env.DB.prepare('SELECT r2_key,content_type FROM pending_uploads WHERE id=?').bind(id).first();
  if(!row) return new Response('Not found', { status:404, headers:CORS });
  const obj = await env.RECEIPTS.get(row.r2_key);
  if(!obj) return new Response('Gone', { status:410, headers:CORS });
  return new Response(obj.body, { headers: { ...CORS, 'Content-Type': row.content_type || 'image/jpeg' } });
}
async function driveSubfolder(token, parentId, name){
  const q = `name='${String(name).replace(/'/g,"\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, { headers:{ Authorization:'Bearer '+token } });
  const d = await r.json();
  if(d.files && d.files.length) return d.files[0].id;
  const cr = await fetch('https://www.googleapis.com/drive/v3/files', { method:'POST', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ name, mimeType:'application/vnd.google-apps.folder', parents:[parentId] }) });
  const cd = await cr.json();
  if(cd.error) throw new Error('Drive folder: '+cd.error.message);
  return cd.id;
}
async function driveUploadImage(token, company, filename, bytes, contentType){
  const companyFolder = await driveSubfolder(token, CFO_DRIVE_ROOT, company);
  const monthFolder = await driveSubfolder(token, companyFolder, MALAY_MONTHS[new Date().getMonth()]);
  const meta = { name: filename, parents:[monthFolder] };
  const boundary = '----cfo'+Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const pre = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`);
  const post = enc.encode(`\r\n--${boundary}--`);
  const body = new Blob([pre, bytes, post]);
  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', { method:'POST', headers:{ Authorization:'Bearer '+token, 'Content-Type':`multipart/related; boundary=${boundary}` }, body });
  const d = await r.json();
  if(d.error) throw new Error('Drive upload: '+d.error.message);
  return d.webViewLink || '';
}
async function ensureSheet(token, sheetId, tab, header){
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const r = await fetch(`${base}/values/${encodeURIComponent(tab+'!A1:'+colLetter(header.length)+'1')}`, { headers:{ Authorization:'Bearer '+token } });
  const d = await r.json();
  if(d.error){ await fetch(`${base}:batchUpdate`, { method:'POST', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ requests:[{ addSheet:{ properties:{ title:tab } } }] }) }); }
  if(d.error || !d.values || !d.values.length){
    await fetch(`${base}/values/${encodeURIComponent(tab+'!A1')}?valueInputOption=USER_ENTERED`, { method:'PUT', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ values:[header] }) });
  }
}
async function sheetAppend(token, sheetId, range, values){
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const r = await fetch(`${base}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method:'POST', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ values }) });
  const d = await r.json();
  if(d.error) throw new Error('Sheet append: '+d.error.message);
  return d;
}
// Deterministic append: find the next empty row via column A, then PUT the rows there.
// Google's values:append does fragile "table detection" that can shift data into the wrong
// columns when recent rows are sparse (observed: a CFO row offset 15 cols right). Counting
// column A (always populated: Tarikh for resit, ResitID for resit_items) + PUT at A{row}
// guarantees column-A alignment every time. Miss CFO files sequentially, so no append race.
async function sheetAppendSafe(token, sheetId, tab, values){
  if(!values.length) return;
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const g = await fetch(`${base}/values/${encodeURIComponent(tab+'!A:A')}`, { headers:{ Authorization:'Bearer '+token } });
  const gd = await g.json();
  if(gd.error) throw new Error('Sheet read A:A: '+gd.error.message);
  const start = ((gd.values||[]).length) + 1;
  const width = Math.max(...values.map(r => r.length));
  const end = start + values.length - 1;
  const range = `${tab}!A${start}:${colLetter(width)}${end}`;
  const r = await fetch(`${base}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, { method:'PUT', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ values }) });
  const d = await r.json();
  if(d.error) throw new Error('Sheet write: '+d.error.message);
  return d;
}
// Rewrite row 1 to the given header when it does not match (predicate(header)===true means "stale").
async function healHeader(token, sheetId, tab, header, isStale){
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const r = await fetch(`${base}/values/${encodeURIComponent(tab+'!A1:'+colLetter(header.length)+'1')}`, { headers:{ Authorization:'Bearer '+token } });
  const d = await r.json();
  if(d.error) return; // tab missing; ensureSheet handles creation+header
  const h = (d.values && d.values[0]) || [];
  if(isStale(h)){
    await fetch(`${base}/values/${encodeURIComponent(tab+'!A1:'+colLetter(header.length)+'1')}?valueInputOption=USER_ENTERED`, { method:'PUT', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ values:[header] }) });
  }
}
async function cfoFile(request, env){
  if(!cfoAuth(request, env)) return sjson({ error:'Unauthorized' }, 401);
  const b = await request.json().catch(()=>({}));
  const id = (b.id||'').trim();
  if(!id) return sjson({ error:'id (pending upload) wajib' }, 400);
  const up = await env.DB.prepare("SELECT id,email,company,branch,r2_key,content_type,status FROM pending_uploads WHERE id=?").bind(id).first();
  if(!up) return sjson({ error:'Resit pending tak dijumpai' }, 404);
  if(up.status === 'flushed') return sjson({ error:'Resit ni dah diproses' }, 409);
  const company = (b.company && COMPANY_SHEETS[b.company]) ? b.company : up.company; // allow re-route (e.g. Miss CFO: ezysupplier -> ezycafe)
  const sheetId = COMPANY_SHEETS[company];
  if(!sheetId) return sjson({ error:'Syarikat tak sah: '+company }, 400);

  const date = (b.date||'').trim() || nowISO().slice(0,10);
  const vendor = (b.vendor||'').trim();
  const amount = Number(b.amount||0) || 0;
  const account = (b.account||'').toString().trim() || '108';
  const category = (b.category||'').trim() || 'UNCLASSIFIED';
  const branch = (b.branch||up.branch||'').trim();
  const note = (b.note||'').trim();
  const status = (b.status||'Pending').trim();
  const items = Array.isArray(b.items) ? b.items : [];
  const resitId = 'r'+Date.now()+Math.random().toString(36).slice(2,7);

  let token; try{ token = await getOwnerToken(env); }catch(e){ return sjson({ error:'Owner token: '+e.message }, 500); }

  // Push the R2 image into the owner's Drive (same root/company/month structure the app uses). Non-fatal.
  let driveLink = '';
  try{
    const obj = await env.RECEIPTS.get(up.r2_key);
    if(obj){
      const bytes = await obj.arrayBuffer();
      const d = new Date(date);
      const dd=String(d.getDate()).padStart(2,'0'), mm=String(d.getMonth()+1).padStart(2,'0'), yy=String(d.getFullYear()).slice(-2);
      const cleanV=(vendor||'Resit').replace(/[^a-zA-Z0-9]/g,'').slice(0,20);
      const fn = `${dd}${mm}${yy}-${cleanV}-RM${amount.toFixed(2)}.jpg`;
      driveLink = await driveUploadImage(token, company, fn, bytes, up.content_type||'image/jpeg');
    }
  }catch(e){ /* keep filing even if Drive fails */ }

  // resit row — Tarikh-first A:R layout the app writes (ID in col N, payment fields O:R).
  const RESIT_HDR = ['Tarikh','Vendor','Item','Jumlah','Akaun','Kategori','Cawangan','Staff','Email','Status','Approved By','Drive Link','Nota','ID','Sumber Bayar','Status Bayar','Due','Tarikh Bayar'];
  await ensureSheet(token, sheetId, 'resit', RESIT_HDR);
  await healHeader(token, sheetId, 'resit', RESIT_HDR, h => (h[2]||'')!=='Item' || (h[13]||'')!=='ID');
  const resitRow = [date, vendor, '', amount, account, category, branch, 'Miss CFO', up.email, status, 'Miss CFO', driveLink, note, resitId, '', 'Outstanding', '', ''];
  await sheetAppendSafe(token, sheetId, 'resit', [resitRow]);

  // resit_items rows (A:K) — SKU/price tracing.
  let itemCount = 0;
  if(items.length){
    await ensureSheet(token, sheetId, 'resit_items', ['ResitID','Supplier','Tarikh','Item','Kod','Qty','Harga','LineTotal','Kategori','Unit','Akaun']);
    const itemRows = items.map(it => {
      const qty = Number(it.qty||1) || 1, price = Number(it.price||0) || 0;
      return [resitId, vendor, date, (it.name||'').toString(), (it.code||it.sku||'').toString(), qty, price, Math.round(qty*price*100)/100, (it.category||category), (it.unit||''), (it.account||account)];
    });
    await sheetAppendSafe(token, sheetId, 'resit_items', itemRows);
    itemCount = itemRows.length;
  }

  await env.DB.prepare("UPDATE pending_uploads SET status='flushed', flushed_at=?, flushed_by=? WHERE id=?").bind(nowISO(), 'Miss CFO', id).run();
  return sjson({ ok:true, id, resitId, company, branch, driveLink, items: itemCount });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';
    try {
      if (path === '/' && request.method === 'GET') return sjson({ ok: true, service: 'ezyaccount-staff' });
      if (path === '/oauth/start' && request.method === 'GET') return oauthStart(env);
      if (path === '/oauth/callback' && request.method === 'GET') return oauthCallback(request, env);
      if (path === '/oauth/status' && request.method === 'GET') return oauthStatus(request, env);
      if (path === '/data/sheet' && request.method === 'POST') return dataSheet(request, env);
      if (path === '/cfo/inbox' && request.method === 'GET') return cfoInbox(request, env);
      if (path === '/cfo/file' && request.method === 'POST') return cfoFile(request, env);
      let _ci; if ((_ci = path.match(/^\/cfo\/image\/([^/]+)$/)) && request.method === 'GET') return cfoImage(request, env, decodeURIComponent(_ci[1]));
      if (path.startsWith('/staff/')) return await staffRouter(path, request.method, request, env);
      return sjson({ error: 'Not found' }, 404);
    } catch (e) {
      return sjson({ error: 'Worker error: ' + (e && e.message ? e.message : String(e)) }, 500);
    }
  },
};

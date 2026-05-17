const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const helmet = require('helmet');
const geoip = require('geoip-lite');
const pino = require('pino');
const pinoHttp = require('pino-http');
const crypto = require('crypto');

const { sequelize, AnalyticsPayload, AnalyticsEvent, AnalyticsSearch, UniqueIp, AppUser, DimCountry, DimCollection, DimAction, CountryDaily, CollectionDaily } = require('./db/sequelize');
const { Op, fn, col, literal } = require('sequelize');
const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || '0.0.0.0';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const API_TOKEN = (process.env.ANALYTICS_API_TOKEN || '').trim();
const HLQUERY_URL = (process.env.HLQUERY_URL || '').trim();
const HLQUERY_API_TOKEN = (process.env.HLQUERY_API_TOKEN || '').trim();
const AUTOLOGIN = String(process.env.AUTOLOGIN || process.env.autologin || process.env.ANALYTICS_AUTOLOGIN || '0').trim() === '1';
const SESSION_SECRET = (process.env.ANALYTICS_SESSION_SECRET || '').trim();

const app = express();
const log = pino({ level: LOG_LEVEL });

app.set('trust proxy', true);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(pinoHttp({ logger: log }));
app.use(express.json({ limit: '1mb' }));

function parseCookies(headerValue) {
  const out = {};
  if (!headerValue) return out;
  const parts = String(headerValue).split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function base64urlEncode(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecode(input) {
  const padded = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8');
}

function signSession(payloadObj) {
  const payload = base64urlEncode(JSON.stringify(payloadObj));
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64');
  const sigUrl = sig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `${payload}.${sigUrl}`;
}

function verifySession(token) {
  if (!token || !SESSION_SECRET) return null;
  const parts = String(token).split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) return null;
  } catch (_) {
    return null;
  }
  try {
    const obj = JSON.parse(base64urlDecode(payload));
    if (!obj || typeof obj !== 'object') return null;
    if (typeof obj.exp === 'number' && Date.now() > obj.exp) return null;
    if (!obj.userId) return null;
    return obj;
  } catch (_) {
    return null;
  }
}

async function getAuthUser(req) {
  if (AUTOLOGIN) {
    return { id: 0, username: 'autologin', role: 'admin', autologin: true };
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.analytics_session;
  const sess = verifySession(token);
  if (!sess) return null;
  const user = await AppUser.findByPk(sess.userId);
  if (!user) return null;
  return { id: user.id, username: user.username, role: user.role, autologin: false };
}

function setSessionCookie(res, token) {
  const attrs = ['Path=/', 'HttpOnly', 'SameSite=Lax'];
  res.setHeader('Set-Cookie', `analytics_session=${encodeURIComponent(token)}; ${attrs.join('; ')}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'analytics_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

async function requireLogin(req, res, next) {
  if (AUTOLOGIN) return next();
  if (!SESSION_SECRET) {
    return res.status(500).json({
      error: 'server_not_configured',
      message: 'Set ANALYTICS_SESSION_SECRET (or enable AUTOLOGIN=1).',
    });
  }

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'auth_required' });
  req.authUser = user;
  return next();
}

function requireAdmin(req, res, next) {
  if (AUTOLOGIN) return res.status(409).json({ error: 'autologin_enabled', message: 'User management is disabled when AUTOLOGIN=1.' });
  if (!req.authUser) return res.status(401).json({ error: 'auth_required' });
  if (req.authUser.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  return next();
}

function getIncomingToken(req) {
  const headerKey = req.get('x-api-key');
  if (headerKey && headerKey.trim()) return headerKey.trim();
  const auth = req.get('authorization');
  if (!auth) return '';
  return auth.trim();
}

function isAuthorized(req) {
  if (!API_TOKEN) return true;
  const provided = getIncomingToken(req);
  if (!provided) return false;
  if (provided === API_TOKEN) return true;
  if (provided === `Bearer ${API_TOKEN}`) return true;
  return false;
}

function stripIPv6Prefix(ip) {
  if (!ip) return '';
  const value = String(ip).trim();
  if (value.startsWith('::ffff:')) return value.slice('::ffff:'.length);
  return value;
}

function geoForIp(ip) {
  const normalized = stripIPv6Prefix(ip);
  const lookup = normalized ? geoip.lookup(normalized) : null;
  if (!lookup) {
    return {
      iso: null,
      name: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }

  const latitude = Array.isArray(lookup.ll) && lookup.ll.length >= 2 ? lookup.ll[0] : null;
  const longitude = Array.isArray(lookup.ll) && lookup.ll.length >= 2 ? lookup.ll[1] : null;

  return {
    iso: lookup.country || null,
    name: lookup.country || null,
    region: lookup.region || null,
    city: lookup.city || null,
    latitude,
    longitude,
  };
}

function isoDay(dateObj) {
  const d = new Date(dateObj);
  return d.toISOString().slice(0, 10);
}

function hashIp(ip) {
  const normalized = stripIPv6Prefix(ip);
  if (!normalized) return '';
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function upsertRollups(day, eventRow, tx) {
  const searches = Number(eventRow.searchCount || 0);
  const clicks = Number(eventRow.clickCount || 0);
  const events = 1;

  const countryIso = eventRow.requesterCountryIso || '??';
  const [countryRow] = await CountryDaily.findOrCreate({
    where: { day, countryIso },
    defaults: { events: 0, searches: 0, clicks: 0, createdAt: new Date() },
    transaction: tx,
  });
  await countryRow.increment({ events, searches, clicks }, { transaction: tx });

  const collection = eventRow.collection || '*';
  const [collectionRow] = await CollectionDaily.findOrCreate({
    where: { day, collection },
    defaults: { events: 0, searches: 0, clicks: 0, createdAt: new Date() },
    transaction: tx,
  });
  await collectionRow.increment({ events, searches, clicks }, { transaction: tx });
}

function toSafeJson(value) {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return JSON.stringify({ error: 'json_stringify_failed' });
  }
}

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    return res.json({ ok: true, service: 'hlquery-analytics', db: 'connected' });
  } catch (error) {
    return res.status(503).json({ ok: false, service: 'hlquery-analytics', db: 'disconnected', error: error.message });
  }
});

function parseIntSafe(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function windowSinceDate(windowHours) {
  const hours = Math.min(24 * 31, Math.max(1, windowHours));
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return since;
}

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return '';
  return String(baseUrl).trim().replace(/\/+$/, '');
}

function scryptPassword(password, saltHex) {
  return crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64).toString('hex');
}

app.get('/api/auth/me', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(200).json({ ok: true, autologin: AUTOLOGIN, authenticated: false, user: null });
  }
  return res.status(200).json({ ok: true, autologin: AUTOLOGIN, authenticated: true, user });
});

app.post('/api/auth/login', async (req, res) => {
  if (AUTOLOGIN) {
    return res.status(409).json({ error: 'autologin_enabled' });
  }
  if (!SESSION_SECRET) {
    return res.status(500).json({ error: 'server_not_configured', message: 'Set ANALYTICS_SESSION_SECRET.' });
  }

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || !password) return res.status(400).json({ error: 'invalid_request' });

  const user = await AppUser.findOne({ where: { username } });
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const computed = scryptPassword(password, user.passwordSalt);
  if (computed !== user.passwordHash) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signSession({ userId: user.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  setSessionCookie(res, token);
  return res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
});

// One-time bootstrap: create the first admin user when the table is empty.
app.post('/api/auth/bootstrap', async (req, res) => {
  if (AUTOLOGIN) return res.status(409).json({ error: 'autologin_enabled' });
  if (!SESSION_SECRET) {
    return res.status(500).json({ error: 'server_not_configured', message: 'Set ANALYTICS_SESSION_SECRET.' });
  }

  const existing = await AppUser.count();
  if (existing > 0) return res.status(409).json({ error: 'bootstrap_closed' });

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || username.length < 2 || username.length > 64) return res.status(400).json({ error: 'invalid_username' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'invalid_password' });

  const salt = crypto.randomBytes(32).toString('hex');
  const hash = scryptPassword(password, salt);
  const createdAt = new Date();
  const user = await AppUser.create({ username, passwordSalt: salt, passwordHash: hash, role: 'admin', createdAt });
  const token = signSession({ userId: user.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  setSessionCookie(res, token);
  return res.status(201).json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/api/auth/logout', async (req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

app.post('/v1/analytics/hlquery', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'unauthorized', auth_required: true });
  }

  const payload = req.body || {};
  const payloadType = payload.type || null;
  const receivedAt = new Date();

  const totals = {
    total_requests: payload.total_requests,
    total_searches: payload.total_searches,
    total_clicks: payload.total_clicks,
    authenticated_requests: payload.authenticated_requests,
    anonymous_requests: payload.anonymous_requests,
    request_bytes_total: payload.request_bytes_total,
    response_bytes_total: payload.response_bytes_total,
    transferred_bytes_total: payload.transferred_bytes_total,
    dropped_events: payload.dropped_events,
    failed_posts_total: payload.failed_posts_total,
  };

  const t = await sequelize.transaction();
  try {
    const payloadRow = await AnalyticsPayload.create(
      {
        service: 'hlquery_analytics',
        path: req.path,
        receivedAt,
        remoteAddress: req.ip,
        headersJson: toSafeJson(req.headers),
        payloadType,
        usedDb: payload.used_db || null,
        windowStartMs: payload.window_start_ms || null,
        windowEndMs: payload.window_end_ms || null,
        bucketCount: payload.bucket_count || null,
        totalsJson: toSafeJson(totals),
        rawPayloadJson: toSafeJson(payload),
        createdAt: receivedAt,
      },
      { transaction: t },
    );

    const events = Array.isArray(payload.events) ? payload.events : [];
    const eventRows = [];

    for (const event of events) {
      const requesterIp = event.requester_ip || null;
      const geo = geoForIp(requesterIp);

      eventRows.push({
        payloadId: payloadRow.id,
        action: String(event.action || 'Unknown'),
        collection: String(event.collection || '*'),
        requesterIp,
        requesterUser: event.requester_user || null,
        requesterCountryIso: geo.iso,
        requesterCountryName: geo.name,
        requesterRegion: geo.region,
        requesterCity: geo.city,
        requesterLatitude: geo.latitude,
        requesterLongitude: geo.longitude,
        count: event.count ?? null,
        authenticatedCount: event.authenticated_count ?? null,
        requestBytes: event.request_bytes ?? null,
        responseBytes: event.response_bytes ?? null,
        transferredBytes: event.transferred_bytes ?? null,
        status2xx: event.status_2xx ?? null,
        status4xx: event.status_4xx ?? null,
        status5xx: event.status_5xx ?? null,
        searchCount: event.search_count ?? null,
        clickCount: event.click_count ?? null,
        searchResultsFound: event.search_results_found ?? null,
        searchResultsReturned: event.search_results_returned ?? null,
        searchTimeMs: event.search_time_ms ?? null,
        clickRankSum: event.click_rank_sum ?? null,
        createdAt: receivedAt,
      });
    }

    if (eventRows.length) {
      await AnalyticsEvent.bulkCreate(eventRows, { transaction: t });
      const day = isoDay(receivedAt);
      for (const row of eventRows) {
        if (row.requesterCountryIso) {
          await DimCountry.upsert({ iso: row.requesterCountryIso, name: row.requesterCountryName, createdAt: receivedAt }, { transaction: t });
        }
        await DimCollection.upsert({ name: row.collection, createdAt: receivedAt }, { transaction: t });
        await DimAction.upsert({ name: row.action, createdAt: receivedAt }, { transaction: t });
        await upsertRollups(day, row, t);
      }
    }

    const searches = Array.isArray(payload.searches) ? payload.searches : [];
    const searchRows = [];

    for (const entry of searches) {
      const query = typeof entry.query === 'string' ? entry.query : '';
      if (!query) continue;

      const requesterIp = entry.requester_ip || null;
      const geo = geoForIp(requesterIp);

      searchRows.push({
        payloadId: payloadRow.id,
        action: String(entry.action || 'Search'),
        collection: String(entry.collection || '*'),
        query,
        documentId: entry.document_id || null,
        requesterIp,
        requesterUser: entry.requester_user || null,
        requesterCountryIso: geo.iso,
        requesterCountryName: geo.name,
        requesterRegion: geo.region,
        requesterCity: geo.city,
        requesterLatitude: geo.latitude,
        requesterLongitude: geo.longitude,
        authenticated: Boolean(entry.authenticated),
        searchTimeMs: entry.search_time_ms ?? null,
        found: entry.found ?? null,
        returned: entry.returned ?? null,
        documentCount: entry.document_count ?? null,
        createdAt: receivedAt,
      });
    }

    if (searchRows.length) {
      await AnalyticsSearch.bulkCreate(searchRows, { transaction: t });
    }

    if (eventRows.length) {
      const day = isoDay(receivedAt);
      const uniqueRows = [];

      for (const row of eventRows) {
        const ipHash = hashIp(row.requesterIp);
        if (!ipHash) continue;
        uniqueRows.push({
          day,
          requesterCountryIso: row.requesterCountryIso || null,
          ipHash,
          createdAt: receivedAt,
        });
      }

      if (uniqueRows.length) {
        await UniqueIp.bulkCreate(uniqueRows, { transaction: t, ignoreDuplicates: true });
      }
    }

    await t.commit();
    return res.status(202).json({ ok: true, accepted: true, stored_events: eventRows.length, stored_searches: searchRows.length });
  } catch (error) {
    await t.rollback();
    req.log.error({ err: error }, 'analytics ingest failed');
    return res.status(500).json({ error: 'failed to persist payload', message: error.message });
  }
});

// Require auth for all /api/* except auth endpoints.
app.use('/api', async (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  return requireLogin(req, res, next);
});

app.get('/api/events', async (req, res) => {
  const page = Math.max(1, parseIntSafe(req.query.page, 1));
  const pageSize = Math.min(200, Math.max(10, parseIntSafe(req.query.pageSize, 50)));
  const offset = (page - 1) * pageSize;

  const where = {};
  if (req.query.action) where.action = String(req.query.action);
  if (req.query.collection) where.collection = String(req.query.collection);
  if (req.query.country) where.requesterCountryIso = String(req.query.country);
  if (req.query.user) where.requesterUser = String(req.query.user);

  const allowSort = new Set(['createdAt', 'searchCount', 'clickCount', 'requesterCountryIso', 'action', 'collection']);
  const sortBy = allowSort.has(String(req.query.sortBy || '')) ? String(req.query.sortBy) : 'createdAt';
  const sortDir = String(req.query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { rows, count } = await AnalyticsEvent.findAndCountAll({
    where,
    order: [[sortBy, sortDir]],
    limit: pageSize,
    offset,
  });

  res.json({ ok: true, page, pageSize, total: count, events: rows });
});

app.get('/api/searches', async (req, res) => {
  const page = Math.max(1, parseIntSafe(req.query.page, 1));
  const pageSize = Math.min(200, Math.max(10, parseIntSafe(req.query.pageSize, 50)));
  const offset = (page - 1) * pageSize;

  const where = {};
  if (req.query.action) where.action = String(req.query.action);
  if (req.query.collection) where.collection = String(req.query.collection);
  if (req.query.country) where.requesterCountryIso = String(req.query.country);
  if (req.query.user) where.requesterUser = String(req.query.user);

  if (req.query.authenticated === 'true') where.authenticated = true;
  if (req.query.authenticated === 'false') where.authenticated = false;

  if (req.query.q) {
    const q = String(req.query.q).trim();
    if (q) where.query = { [Op.like]: `%${q}%` };
  }

  const allowSort = new Set(['createdAt', 'searchTimeMs', 'found', 'returned', 'collection', 'action', 'authenticated']);
  const sortBy = allowSort.has(String(req.query.sortBy || '')) ? String(req.query.sortBy) : 'createdAt';
  const sortDir = String(req.query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { rows, count } = await AnalyticsSearch.findAndCountAll({
    where,
    order: [[sortBy, sortDir]],
    limit: pageSize,
    offset,
  });

  res.json({ ok: true, page, pageSize, total: count, searches: rows });
});

app.get('/api/visitors', async (req, res) => {
  const windowHours = parseIntSafe(req.query.windowHours, 24);
  const limit = Math.min(100, Math.max(1, parseIntSafe(req.query.limit, 25)));
  const since = windowSinceDate(windowHours);

  const where = { createdAt: { [Op.gte]: since } };

  const [totalUniqueVisitors, countriesAgg] = await Promise.all([
    UniqueIp.count({ where }),
    UniqueIp.findAll({
      where,
      attributes: [
        [col('requesterCountryIso'), 'iso'],
        [fn('COUNT', col('id')), 'uniqueVisitors'],
      ],
      group: ['requesterCountryIso'],
      order: [[literal('uniqueVisitors'), 'DESC']],
      limit,
      raw: true,
    }),
  ]);

  res.json({
    ok: true,
    window: { sinceIso: since.toISOString(), hours: windowHours },
    totals: { uniqueVisitors: Number(totalUniqueVisitors || 0) },
    byCountry: countriesAgg.map((r) => ({
      iso: r.iso || '??',
      uniqueVisitors: Number(r.uniqueVisitors || 0),
    })),
  });
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const rows = await AppUser.findAll({ order: [['createdAt', 'DESC']] });
  res.json({
    ok: true,
    users: rows.map((u) => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })),
  });
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const role = req.body?.role === 'admin' ? 'admin' : 'user';
  if (!username || username.length < 2 || username.length > 64) return res.status(400).json({ error: 'invalid_username' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'invalid_password' });

  const salt = crypto.randomBytes(32).toString('hex');
  const hash = scryptPassword(password, salt);
  try {
    const createdAt = new Date();
    const user = await AppUser.create({ username, passwordSalt: salt, passwordHash: hash, role, createdAt });
    return res.status(201).json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    if (String(error?.name || '').includes('SequelizeUniqueConstraint')) {
      return res.status(409).json({ error: 'username_taken' });
    }
    throw error;
  }
});

app.get('/api/countries', async (req, res) => {
  const windowHours = parseIntSafe(req.query.windowHours, 24);
  const limit = Math.min(100, Math.max(1, parseIntSafe(req.query.limit, 50)));
  const since = windowSinceDate(windowHours);
  const where = { createdAt: { [Op.gte]: since } };

  const rows = await AnalyticsEvent.findAll({
    where,
    attributes: [
      [col('requesterCountryIso'), 'iso'],
      [fn('MAX', col('requesterCountryName')), 'name'],
      [fn('SUM', col('searchCount')), 'searches'],
      [fn('SUM', col('clickCount')), 'clicks'],
      [fn('COUNT', col('id')), 'events'],
    ],
    group: ['requesterCountryIso'],
    order: [[literal('searches'), 'DESC']],
    limit,
    raw: true,
  });

  res.json({
    ok: true,
    window: { sinceIso: since.toISOString(), hours: windowHours },
    countries: rows.map((r) => ({
      iso: r.iso || '??',
      name: r.name || null,
      searches: Number(r.searches || 0),
      clicks: Number(r.clicks || 0),
      events: Number(r.events || 0),
    })),
  });
});

app.get('/api/users', async (req, res) => {
  const windowHours = parseIntSafe(req.query.windowHours, 24);
  const limit = Math.min(100, Math.max(1, parseIntSafe(req.query.limit, 50)));
  const since = windowSinceDate(windowHours);
  const where = { createdAt: { [Op.gte]: since }, requesterUser: { [Op.ne]: null } };

  const rows = await AnalyticsEvent.findAll({
    where,
    attributes: [
      [col('requesterUser'), 'user'],
      [fn('SUM', col('searchCount')), 'searches'],
      [fn('SUM', col('clickCount')), 'clicks'],
      [fn('COUNT', col('id')), 'events'],
    ],
    group: ['requesterUser'],
    order: [[literal('events'), 'DESC']],
    limit,
    raw: true,
  });

  res.json({
    ok: true,
    window: { sinceIso: since.toISOString(), hours: windowHours },
    users: rows.map((r) => ({
      user: r.user,
      searches: Number(r.searches || 0),
      clicks: Number(r.clicks || 0),
      events: Number(r.events || 0),
    })),
  });
});

app.get('/api/stats', async (req, res) => {
  const windowHours = parseIntSafe(req.query.windowHours, 24);
  const recentLimit = Math.min(200, Math.max(1, parseIntSafe(req.query.recentLimit, 50)));
  const topCountriesLimit = Math.min(50, Math.max(1, parseIntSafe(req.query.topCountriesLimit, 10)));
  const topCollectionsLimit = Math.min(50, Math.max(1, parseIntSafe(req.query.topCollectionsLimit, 10)));
  const topUsersLimit = Math.min(50, Math.max(1, parseIntSafe(req.query.topUsersLimit, 10)));
  const recentSearchesLimit = Math.min(200, Math.max(1, parseIntSafe(req.query.recentSearchesLimit, 50)));
  const since = windowSinceDate(windowHours);

  const where = { createdAt: { [Op.gte]: since } };

  const [recentEvents, countriesAgg, collectionsAgg, usersAgg, totalsAgg, recentSearches, searchesAuthAgg] = await Promise.all([
    AnalyticsEvent.findAll({ where, order: [['createdAt', 'DESC']], limit: recentLimit }),
    AnalyticsEvent.findAll({
      where,
      attributes: [
        [col('requesterCountryIso'), 'iso'],
        [fn('SUM', col('searchCount')), 'searches'],
        [fn('COUNT', col('id')), 'events'],
      ],
      group: ['requesterCountryIso'],
      order: [[literal('searches'), 'DESC']],
      limit: topCountriesLimit,
      raw: true,
    }),
    AnalyticsEvent.findAll({
      where,
      attributes: [
        [col('collection'), 'collection'],
        [fn('SUM', col('searchCount')), 'searches'],
        [fn('SUM', col('clickCount')), 'clicks'],
        [fn('COUNT', col('id')), 'events'],
      ],
      group: ['collection'],
      order: [[literal('searches'), 'DESC']],
      limit: topCollectionsLimit,
      raw: true,
    }),
    AnalyticsEvent.findAll({
      where: { ...where, requesterUser: { [Op.ne]: null } },
      attributes: [
        [col('requesterUser'), 'user'],
        [fn('SUM', col('searchCount')), 'searches'],
        [fn('SUM', col('clickCount')), 'clicks'],
        [fn('COUNT', col('id')), 'events'],
      ],
      group: ['requesterUser'],
      order: [[literal('events'), 'DESC']],
      limit: topUsersLimit,
      raw: true,
    }),
    AnalyticsEvent.findAll({
      where,
      attributes: [
        [fn('SUM', col('searchCount')), 'searches'],
        [fn('SUM', col('clickCount')), 'clicks'],
        [fn('COUNT', col('id')), 'events'],
        [fn('COUNT', fn('DISTINCT', col('requesterCountryIso'))), 'countries'],
        [fn('COUNT', fn('DISTINCT', col('requesterUser'))), 'users'],
      ],
      raw: true,
    }),
    AnalyticsSearch.findAll({ where, order: [['createdAt', 'DESC']], limit: recentSearchesLimit }),
    AnalyticsSearch.findAll({
      where,
      attributes: [
        [col('authenticated'), 'authenticated'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['authenticated'],
      raw: true,
    }),
  ]);

  const totals = totalsAgg && totalsAgg[0] ? totalsAgg[0] : { searches: null, events: null, countries: null };
  const authedSearches = searchesAuthAgg.reduce(
    (acc, row) => {
      const key = row.authenticated ? 'authenticated' : 'anonymous';
      acc[key] = Number(row.count || 0);
      return acc;
    },
    { authenticated: 0, anonymous: 0 },
  );

  res.json({
    ok: true,
    window: { sinceIso: since.toISOString(), hours: windowHours },
    totals: {
      searches: Number(totals.searches || 0),
      clicks: Number(totals.clicks || 0),
      events: Number(totals.events || 0),
      countries: Number(totals.countries || 0),
      users: Number(totals.users || 0),
    },
    searchesAuth: authedSearches,
    topCountries: countriesAgg.map((r) => ({
      iso: r.iso || '??',
      searches: Number(r.searches || 0),
      events: Number(r.events || 0),
    })),
    topCollections: collectionsAgg.map((r) => ({
      collection: r.collection || '*',
      searches: Number(r.searches || 0),
      clicks: Number(r.clicks || 0),
      events: Number(r.events || 0),
    })),
    topUsers: usersAgg.map((r) => ({
      user: r.user,
      searches: Number(r.searches || 0),
      clicks: Number(r.clicks || 0),
      events: Number(r.events || 0),
    })),
    recentEvents,
    recentSearches,
  });
});

app.post('/api/hlquery/refresh', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'unauthorized', auth_required: true });
  }

  const base = normalizeBaseUrl(HLQUERY_URL);
  if (!base) {
    return res.status(409).json({ error: 'hlquery_not_configured', message: 'Set HLQUERY_URL to enable forced refresh.' });
  }

  const url = `${base}/modules/analytics/flush`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const headers = {};
    if (HLQUERY_API_TOKEN) headers['Authorization'] = `Bearer ${HLQUERY_API_TOKEN}`;

    const response = await fetch(url, { method: 'POST', headers, signal: controller.signal });
    const contentType = String(response.headers.get('content-type') || '');
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    return res.status(response.status).json({
      ok: response.ok,
      hlquery: { url, status: response.status },
      response: payload,
    });
  } catch (error) {
    req.log.error({ err: error }, 'hlquery refresh failed');
    return res.status(502).json({ error: 'hlquery_refresh_failed', message: error.message });
  } finally {
    clearTimeout(timer);
  }
});

// Serve Vue SPA when built (etc/analytics/web/dist).
const webDist = path.join(__dirname, '..', 'web', 'dist');
const webIndex = path.join(webDist, 'index.html');
if (fs.existsSync(webDist) && fs.existsSync(webIndex)) {
  app.use(express.static(webDist));
  app.get(['/', '/login', '/events', '/countries', '/users', '/searches', '/visitors', '/admin/users'], (req, res) => res.sendFile(webIndex));
} else {
  app.get('/', (req, res) => {
    res.type('text/plain').send('analytics web not built yet. Run: cd etc/analytics/web && npm i && npm run build');
  });
}

async function start() {
  try {
    await sequelize.authenticate();
  } catch (error) {
    log.error({ err: error }, 'db connection failed (did you run migrations?)');
  }

  app.listen(PORT, HOST, () => {
    log.info(`listening on http://${HOST}:${PORT}`);
  });
}

start().catch((error) => {
  log.error({ err: error }, 'fatal start error');
  process.exitCode = 1;
});

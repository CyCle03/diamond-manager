/**
 * 다이아몬드 매니저 서버 저장 백엔드.
 *
 * bm.elcherlab.com/api/* 를 Caddy 가 여기(127.0.0.1:3600)로 프록시한다.
 * 같은 출처라 브라우저가 쿠키를 자동으로 실어 보내므로 CORS 가 필요 없다.
 *
 *   GET    /api/health          동작 확인
 *   GET    /api/me              세션 확인 → { loggedIn, username? }
 *   GET    /api/saves           슬롯 목록(메타만) → [{ slot, timestamp, updatedAt }]
 *   GET    /api/save?slot=1     슬롯 하나 → { data: object|null }
 *   PUT    /api/save?slot=1     슬롯 하나 저장 (1MB 제한)
 *   DELETE /api/save?slot=1     슬롯 하나 삭제
 *
 *   POST /internal/export-user  통합 인증의 "내 데이터 내려받기" 전용(루프백)
 *
 * **픽셀 펫·사이버 클리커와 달리 저장이 슬롯별로 나뉜다.** 이 게임은 세이브
 * 슬롯이 여러 개이고 한 슬롯이 250~400KB(8팀 × 26명 로스터 + 누적 성적)라,
 * 전부 한 덩어리로 묶으면 매 저장마다 수 MB 를 올리게 된다. 그래서
 * (user_id, slot) 을 기본키로 두고 바뀐 슬롯만 오간다.
 *
 * 목록(/api/saves)이 data 전체가 아니라 timestamp 만 주는 것도 같은 이유다.
 * 어느 쪽이 최신인지 판단하는 데는 그거면 충분하고, 부팅마다 전 슬롯을
 * 내려받을 필요가 없다.
 *
 * 게임 규칙은 전부 클라이언트에 있고 서버는 검증하지 않는다(pet·cc 와 같은 판단).
 * 탈퇴 시 삭제 경로가 없는 것도 같다 — bm.saves 가 identity.users 를
 * on delete cascade 로 참조하므로 계정 행을 지울 때 함께 사라진다.
 */

import http from 'node:http';
import dotenv from 'dotenv';
import pg from 'pg';
import { readCookie, verifyInternal, verifySession } from './session.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3600);
const HOST = process.env.HOST || '127.0.0.1';
const COOKIE_NAME = process.env.COOKIE_NAME || 'elab_session';
// 한 슬롯이 250~400KB 다. 시즌이 쌓이면 더 커지므로 여유를 둔다.
const MAX_BODY = 1024 * 1024;
// 슬롯 이름은 클라이언트가 정한다. 키로 쓰이므로 형태를 못박는다.
const SLOT_RE = /^[A-Za-z0-9_-]{1,32}$/;

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
  console.error('AUTH_SECRET 이 없거나 너무 짧습니다(32자 이상). 통합 인증과 같은 값을 .env 에 넣으세요.');
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: Number(process.env.DB_POOL_MAX || 3),
  // Supabase 풀러는 TLS 를 쓰되 체인 검증은 하지 않는다(auth·pc·pet·cc 와 동일).
  ssl: String(process.env.DB_SSL || 'true') === 'true' ? { rejectUnauthorized: false } : false,
});
pool.on('error', (e) => console.error('[db] 유휴 커넥션 오류:', e.message));

/** 반복 적용해도 안전한 스키마 — 부팅 때마다 확인한다. */
const SCHEMA_SQL = `
  create schema if not exists bm;
  create table if not exists bm.saves (
    user_id    uuid not null references identity.users(id) on delete cascade,
    slot       text not null,
    data       jsonb not null,
    updated_at timestamptz not null default now(),
    primary key (user_id, slot)
  );
`;

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sessionOf(req) {
  return verifySession(readCookie(req.headers.cookie, COOKIE_NAME), AUTH_SECRET);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let over = false;
    req.on('data', (c) => {
      if (over) return;
      size += c.length;
      if (size > MAX_BODY) {
        over = true;
        // req.destroy() 로 끊으면 413 을 보내기 전에 커넥션이 닫혀 앞단이 502 를
        // 대신 돌려준다(pet·cc 에서 겪은 것과 같은 문제). 남은 본문만 흘려보낸다.
        req.resume();
        reject(Object.assign(new Error('저장 데이터가 너무 큽니다.'), { code: 413 }));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!over) resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;
  try {
    if (req.method === 'GET' && path === '/api/health') {
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && path === '/api/me') {
      const s = sessionOf(req);
      return json(res, 200, s ? { loggedIn: true, username: s.username } : { loggedIn: false });
    }

    if (req.method === 'POST' && path === '/internal/export-user') {
      if (!verifyInternal(req.headers['x-internal-auth'], AUTH_SECRET)) {
        return json(res, 403, { error: 'forbidden' });
      }
      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        return json(res, 400, { error: '본문이 올바른 JSON 이 아닙니다.' });
      }
      const userId = body && body.userId;
      if (typeof userId !== 'string' || !userId) return json(res, 400, { error: 'userId 가 필요합니다.' });
      const r = await pool.query(
        'select slot, data, updated_at from bm.saves where user_id = $1 order by slot',
        [userId]
      );
      return json(res, 200, {
        서비스: '다이아몬드 매니저 (bm.elcherlab.com)',
        저장슬롯: r.rows.map((row) => ({
          슬롯: row.slot,
          마지막저장: row.updated_at,
          게임데이터: row.data,
        })),
        참고: '로그인하지 않고 플레이한 기록은 그 브라우저의 localStorage 에만 있어 서버에 없습니다.',
      });
    }

    // 이하 전부 로그인 필요
    const s = sessionOf(req);
    if (!s) return json(res, 401, { error: '로그인이 필요합니다.' });

    // 슬롯 목록 — 어느 쪽이 최신인지 고르는 데 쓰므로 data 전체는 주지 않는다.
    if (req.method === 'GET' && path === '/api/saves') {
      const r = await pool.query(
        `select slot, updated_at, (data->>'timestamp') as timestamp
           from bm.saves where user_id = $1 order by slot`,
        [s.uid]
      );
      return json(res, 200, {
        saves: r.rows.map((row) => ({
          slot: row.slot,
          updatedAt: row.updated_at,
          timestamp: Number(row.timestamp) || 0,
        })),
      });
    }

    if (path === '/api/save') {
      const slot = url.searchParams.get('slot');
      if (!slot || !SLOT_RE.test(slot)) {
        return json(res, 400, { error: 'slot 이 올바르지 않습니다.' });
      }

      if (req.method === 'GET') {
        const r = await pool.query('select data from bm.saves where user_id = $1 and slot = $2', [s.uid, slot]);
        return json(res, 200, { data: r.rows[0] ? r.rows[0].data : null });
      }

      if (req.method === 'PUT') {
        let data;
        try {
          data = JSON.parse(await readBody(req));
        } catch (e) {
          return json(res, e.code === 413 ? 413 : 400, {
            error: e.code === 413 ? e.message : '본문이 올바른 JSON 이 아닙니다.',
          });
        }
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          return json(res, 400, { error: '저장 데이터는 객체여야 합니다.' });
        }
        await pool.query(
          `insert into bm.saves (user_id, slot, data, updated_at) values ($1, $2, $3, now())
           on conflict (user_id, slot) do update set data = excluded.data, updated_at = now()`,
          [s.uid, slot, data]
        );
        return json(res, 200, { ok: true });
      }

      if (req.method === 'DELETE') {
        await pool.query('delete from bm.saves where user_id = $1 and slot = $2', [s.uid, slot]);
        return json(res, 200, { ok: true });
      }
    }

    return json(res, 404, { error: '없는 경로입니다.' });
  } catch (e) {
    console.error(`[${req.method} ${path}]`, e.message);
    return json(res, 500, { error: '서버 오류가 발생했습니다.' });
  }
});

try {
  await pool.query(SCHEMA_SQL);
  console.log('bm.saves 스키마 확인 완료');
} catch (e) {
  console.error('스키마 적용 실패:', e.message);
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log(`⚾ 다이아몬드 매니저 서버 저장 실행 중: http://${HOST}:${PORT} (쿠키 ${COOKIE_NAME})`);
});

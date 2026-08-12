/**
 * elcherlab 통합 로그인 세션 검증 (로컬).
 *
 * 신원은 auth.elcherlab.com 이 소유한다. 여기서는 `.elcherlab.com` 도메인
 * 쿠키(elab_session)를 공유 시크릿(AUTH_SECRET)으로 서명 검증만 한다 —
 * 네트워크 왕복이 없어 인증 서버가 잠깐 죽어도 기존 세션은 동작한다.
 * (gm·pet 의 같은 이름 파일과 동일한 구현이다)
 *
 * 토큰 형식: base64url(JSON payload) + '.' + base64url(HMAC-SHA256)
 * payload: { uid, u(username), v(token_version), exp(unix초) }
 */

import crypto from 'node:crypto';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** 쿠키 헤더에서 이름으로 값 하나를 꺼낸다(의존성 없이). */
export function readCookie(header, name) {
  if (!header || typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** 서명·만료를 검증하고 { uid, username } 을 돌려준다. 실패하면 null. */
export function verifySession(token, secret, nowMs = Date.now()) {
  if (!token || typeof token !== 'string') return null;
  const i = token.indexOf('.');
  if (i < 1) return null;
  const p = token.slice(0, i);
  const mac = token.slice(i + 1);

  const expected = b64url(crypto.createHmac('sha256', secret).update(p).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(unb64url(p).toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== 'number') return null;
  if (payload.exp < Math.floor(nowMs / 1000)) return null;
  if (!payload.uid) return null;
  return { uid: String(payload.uid), username: String(payload.u || '') };
}

/**
 * 통합 인증이 내 데이터 내려받기 처리 중에 부르는 내부 호출의 신원 확인.
 * 세션 서명 비밀값 자체를 헤더에 싣지 않으려고, 거기서 유도한 토큰을 쓴다.
 * (gm·pc 도 같은 방식이다 — 유도 문자열이 어긋나면 세 서비스가 서로 못 부른다)
 */
export function verifyInternal(value, secret) {
  const expected = crypto.createHash('sha256').update(`${secret}:internal-delete`).digest('hex');
  if (typeof value !== 'string' || value.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

/** 테스트용 — 검증과 짝이 맞는 토큰을 만든다(운영 발급은 auth 서비스 몫). */
export function signSession(payload, secret) {
  const p = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const mac = b64url(crypto.createHmac('sha256', secret).update(p).digest());
  return `${p}.${mac}`;
}

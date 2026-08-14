/**
 * elcherlab 통합 로그인 + 서버 저장.
 *
 * 로그인하지 않으면 이 파일은 아무 일도 하지 않는다 — 게임은 지금까지처럼
 * localStorage 만 쓴다. 로그인하면 같은 저장본을 서버(bm.saves)에도 올려
 * 다른 기기에서 이어서 할 수 있게 한다.
 *
 * **슬롯별로 오간다.** 한 슬롯이 250~400KB 라 전부 묶어 올리면 저장할 때마다
 * 수 MB 를 보내게 된다. 부팅 때는 슬롯 목록(timestamp 만)을 받아 어느 쪽이
 * 최신인지 고르고, 실제로 다른 슬롯만 주고받는다.
 *
 * 저장 API 는 같은 출처(bm.elcherlab.com/api/*)라 쿠키가 자동으로 실린다.
 * 가입·로그인만 통합 인증(auth.elcherlab.com)으로 나가므로 credentials 가 필요하다.
 *
 * GitHub Pages 처럼 백엔드가 없는 곳에서 열면 /api/me 가 실패하고, 그때는
 * 조용히 "로그아웃 상태"로 판단해 localStorage 만 쓴다. 배포처를 가리지 않는다.
 */

import { SaveManager } from './SaveManager.js';
import { t, getLang } from './i18n.js';

const AUTH_ORIGIN = 'https://auth.elcherlab.com';
const SAVE_PREFIX = 'diamond_manager_save_';
const LAST_SLOT_KEY = 'diamond_manager_last_slot';
/** 마지막으로 이 브라우저에서 로그인했던 계정. 계정이 바뀌면 저장본을 섞지 않는다. */
const ACCOUNT_KEY = 'bm_account';
/** 저장이 잦아 서버에는 몰아서 올린다. */
const PUSH_DELAY_MS = 3000;

export const session = { loggedIn: false, username: null };

/** 슬롯별 디바운스 타이머 — 한 슬롯을 연속 저장해도 전송은 한 번이다. */
const timers = new Map();

async function api(path, options) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || t('account.errRequest', { status: res.status }));
  return data;
}

async function authApi(path, body) {
  // 언어는 쿼리로 넘긴다 — auth 가 오류 문구를 그 언어로 내려준다. 헤더로 넘기면
  // 다른 오리진이라 프리플라이트가 뜨는데 auth 는 Content-Type 만 허용해서 막힌다
  // (gm 이 X-Lang 을 붙였다가 로그인이 통째로 죽은 적이 있다).
  const url = AUTH_ORIGIN + path + (path.includes('?') ? '&' : '?') + 'lang=' + getLang();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  // 문구는 auth 가 위 lang 을 보고 이미 맞춰 보낸다 — 여기서 다시 옮기지 않는다.
  if (!res.ok) throw new Error(data.error || t('account.errGeneric'));
  return data;
}

/** 이 브라우저에 있는 슬롯들의 { slot → timestamp } */
function localSlots() {
  const out = new Map();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(SAVE_PREFIX)) continue;
    const slot = key.slice(SAVE_PREFIX.length);
    let ts = 0;
    try {
      ts = Number(JSON.parse(localStorage.getItem(key)).timestamp) || 0;
    } catch {
      /* 깨진 저장본은 timestamp 0 으로 두고 서버 쪽이 이기게 한다 */
    }
    out.set(slot, ts);
  }
  return out;
}

function clearLocalSaves() {
  for (const slot of localSlots().keys()) localStorage.removeItem(SAVE_PREFIX + slot);
  localStorage.removeItem(LAST_SLOT_KEY);
}

/**
 * 부팅 전에 한 번 부른다. 로그인 상태면 서버와 슬롯을 맞춰 둔다.
 * 게임 코드는 지금까지처럼 localStorage 만 읽으면 되므로 나머지가 바뀌지 않는다.
 */
export async function syncBeforeBoot() {
  // 확인이 끝날 때까지 보이는 문구. 마크업에는 영어가 박혀 있고 data-i18n 을 붙일 수
  // 없어서(전환 때 로그인 상태 문장이 "Checking…" 으로 되돌아간다) 여기서 한 번 옮긴다.
  const checking = $('bm-account-status');
  if (checking) checking.textContent = t('account.checking');
  try {
    const me = await api('/api/me');
    session.loggedIn = !!me.loggedIn;
    session.username = me.username || null;
  } catch {
    // 백엔드가 없는 배포처(GitHub Pages 등) — 로컬 저장만 쓴다.
    session.loggedIn = false;
    session.username = null;
    return;
  }
  if (!session.loggedIn) return;

  // 다른 계정으로 갈아탄 경우, 앞 계정의 저장본을 이 계정에 올리면 안 된다.
  const last = localStorage.getItem(ACCOUNT_KEY);
  if (last && last !== session.username) clearLocalSaves();
  localStorage.setItem(ACCOUNT_KEY, session.username || '');

  let remote;
  try {
    remote = (await api('/api/saves')).saves || [];
  } catch (e) {
    console.error('[cloud] 서버 슬롯 목록을 읽지 못했습니다', e);
    return; // 로컬로 계속 진행한다 — 게임이 멈추는 것보다 낫다
  }

  const local = localSlots();
  const remoteMap = new Map(remote.map((r) => [r.slot, r.timestamp || 0]));
  const all = new Set([...local.keys(), ...remoteMap.keys()]);

  for (const slot of all) {
    const lt = local.get(slot) || 0;
    const rt = remoteMap.get(slot) || 0;
    try {
      if (rt > lt) {
        // 서버가 최신 — 내려받아 덮는다.
        const { data } = await api(`/api/save?slot=${encodeURIComponent(slot)}`);
        if (data) localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(data));
      } else if (lt > rt) {
        // 로컬이 최신(또는 서버에 없음) — 올린다.
        const raw = localStorage.getItem(SAVE_PREFIX + slot);
        if (raw) await api(`/api/save?slot=${encodeURIComponent(slot)}`, { method: 'PUT', body: raw });
      }
    } catch (e) {
      console.error(`[cloud] 슬롯 ${slot} 동기화 실패`, e);
    }
  }
}

/** SaveManager.save 가 부른다. 실제 전송은 슬롯별로 몰아서 한 번만 한다. */
export function queuePush(slotId, serialized) {
  if (!session.loggedIn) return;
  const slot = String(slotId);
  if (timers.has(slot)) clearTimeout(timers.get(slot));
  timers.set(
    slot,
    setTimeout(async () => {
      timers.delete(slot);
      try {
        await api(`/api/save?slot=${encodeURIComponent(slot)}`, { method: 'PUT', body: serialized });
      } catch (e) {
        // 저장 실패로 게임을 멈추지 않는다. 로컬에는 이미 저장돼 있다.
        console.error('[cloud] 서버 저장 실패', e);
      }
    }, PUSH_DELAY_MS)
  );
}

/** SaveManager.clear/delete 가 부른다. 서버 슬롯도 함께 지운다. */
export async function deleteRemote(slotId) {
  if (!session.loggedIn) return;
  const slot = String(slotId);
  if (timers.has(slot)) {
    clearTimeout(timers.get(slot));
    timers.delete(slot);
  }
  try {
    await api(`/api/save?slot=${encodeURIComponent(slot)}`, { method: 'DELETE' });
  } catch (e) {
    console.error('[cloud] 서버 슬롯 삭제 실패', e);
  }
}

// ---------- 화면 ----------

function $(id) {
  return document.getElementById(id);
}

function setAuthError(msg) {
  const el = $('bm-auth-error');
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
}

/** 계정 영역을 현재 상태에 맞춘다. */
export function renderAccount() {
  const status = $('bm-account-status');
  const form = $('bm-auth-form');
  const logoutBtn = $('bm-logout-btn');
  if (!status || !form || !logoutBtn) return;

  if (session.loggedIn) {
    status.textContent = t('account.loggedIn', { user: session.username });
    form.hidden = true;
    logoutBtn.hidden = false;
  } else {
    status.textContent = t('account.loggedOut');
    form.hidden = false;
    logoutBtn.hidden = true;
  }
  setAuthError('');
}

async function submitAuth(mode) {
  const userEl = $('bm-auth-user');
  const passEl = $('bm-auth-pass');
  const ageEl = $('bm-auth-age');
  if (!userEl || !passEl) return;

  const username = userEl.value.trim();
  const password = passEl.value;
  if (!username || !password) return setAuthError(t('account.errCredentials'));
  if (mode === 'signup' && !(ageEl && ageEl.checked)) {
    return setAuthError(t('account.errConsent'));
  }

  setAuthError('');
  try {
    const body = mode === 'signup' ? { username, password, ageConfirm: true } : { username, password };
    await authApi(mode === 'signup' ? '/api/signup' : '/api/login', body);
    passEl.value = '';
    // 쿠키가 생겼으니 처음부터 다시 부팅해 서버 저장본을 반영한다.
    location.reload();
  } catch (e) {
    setAuthError(e.message);
  }
}

/** 버튼에 직접 연결한다 — 인라인 핸들러를 쓰지 않는다(CSP: script-src 'self'). */
export function wireAccountUI() {
  const on = (id, fn) => {
    const el = $(id);
    if (el) el.addEventListener('click', fn);
  };
  on('bm-login-btn', () => submitAuth('login'));
  on('bm-signup-btn', () => submitAuth('signup'));
  on('bm-logout-btn', async () => {
    try {
      await authApi('/api/logout', {});
    } catch {
      /* 쿠키 만료 등 — 목적은 세션 제거이므로 무시 */
    }
    location.reload();
  });
  // 상태 줄과 오류 문구는 이 파일이 직접 쓰므로 applyI18n 이 건드리지 않는다.
  // 언어가 바뀌면 여기서 다시 쓴다.
  document.addEventListener('bm:langchange', () => renderAccount());
  renderAccount();
}

/**
 * 영어 / 한국어 전환.
 *
 * 이 게임의 원문은 영어다. 사전의 en 이 화면에 그대로 나가는 값이고,
 * ko 는 그 번역이다. 키가 사전에 없으면 en 으로, en 에도 없으면 키 문자열
 * 자체를 돌려준다 — 번역이 빠져도 화면이 비지 않게 하기 위해서다.
 *
 * **언어 설정은 localStorage 에만 둔다. 쿠키를 쓰지 않는다.**
 * 개인정보처리방침 9.1 이 "쿠키는 로그인 유지 목적 하나만 씁니다"라고
 * 못박고 있어서, 언어 쿠키를 하나 더 심으면 그 문장이 거짓이 된다.
 * 그래서 서브도메인끼리 자동으로 공유되지 않고, 대신 링크로 넘긴다
 * (영어 랜딩의 bm 링크가 ?lang=en 을 달고 온다).
 */

const STORE_KEY = 'bm_lang';
export const LANGS = ['en', 'ko'];

const DICT = {
  en: {
    'lang.other': '한국어',
    'lang.switchTitle': 'Switch language to Korean',

    // ── 시작 화면 ──
    'start.teamName': 'TEAM NAME',
    'start.selectSlot': 'SELECT SAVE SLOT',
    'start.slot': 'SLOT {n}',
    'start.slotEmpty': 'Empty - Create New',
    'start.slotSaved': '{team}<br>Season {season}<br>Round {round}',
    'start.aaaSettings': 'AAA SETTINGS',
    'start.autoAaa': 'Auto AAA management',
    'start.autoPromote': 'Auto promote/demote',
    'start.aaaActive': 'AAA ACTIVE (Season {season})',
    'start.aaaLocked': 'AAA unlocks in Season {season}',
    'start.matchSettings': 'MATCH SETTINGS',
    'start.autoClearLog': 'Auto clear match log after game',
    'start.close': 'Close options',

    // ── 계정 ──
    'account.title': 'ACCOUNT — elcherlab single sign-on',
    'account.checking': 'Checking…',
    'account.loggedIn': 'Signed in as {user} — your saves are stored on the server.',
    'account.loggedOut': 'Not signed in. Saves stay in this browser only.',
    'account.idPlaceholder': 'ID (letters, digits, underscore; 3-20 chars)',
    'account.pwPlaceholder': 'Password (6 or more characters)',
    'account.consent':
      'I am 14 or older and agree to the ' +
      '<a href="https://elcherlab.com/terms.html" target="_blank" rel="noopener">Terms of Service</a> and ' +
      '<a href="https://elcherlab.com/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> ' +
      '(Korean). Required to sign up.',
    'account.login': 'LOG IN',
    'account.signup': 'SIGN UP',
    'account.logout': 'LOG OUT',
    'account.errCredentials': 'Enter your ID and password.',
    'account.errConsent': 'Please confirm you are 14 or older and accept the terms.',
    'account.errRequest': 'Request failed ({status})',
    'account.errGeneric': 'The request could not be processed.',
  },

  ko: {
    'lang.other': 'English',
    'lang.switchTitle': '언어를 영어로 바꿉니다',

    // ── 시작 화면 ──
    'start.teamName': '팀 이름',
    'start.selectSlot': '세이브 슬롯 선택',
    'start.slot': '슬롯 {n}',
    'start.slotEmpty': '비어 있음 - 새로 시작',
    'start.slotSaved': '{team}<br>{season}시즌<br>{round}라운드',
    'start.aaaSettings': '3군 설정',
    'start.autoAaa': '3군 자동 관리',
    'start.autoPromote': '자동 승격/강등',
    'start.aaaActive': '3군 운영 중 ({season}시즌)',
    'start.aaaLocked': '3군은 {season}시즌부터 열립니다',
    'start.matchSettings': '경기 설정',
    'start.autoClearLog': '경기 후 경기 로그 자동 비우기',
    'start.close': '설정 닫기',

    // ── 계정 ──
    'account.title': '계정 — elcherlab 통합 로그인',
    'account.checking': '확인 중…',
    'account.loggedIn': '{user} 으로 로그인됨 — 세이브가 서버에 저장됩니다.',
    'account.loggedOut': '로그인하지 않았습니다. 세이브는 이 브라우저에만 저장됩니다.',
    'account.idPlaceholder': '아이디 (영문·숫자·밑줄 3~20자)',
    'account.pwPlaceholder': '비밀번호 (6자 이상)',
    'account.consent':
      '만 14세 이상이며, ' +
      '<a href="https://elcherlab.com/terms.html" target="_blank" rel="noopener">이용약관</a>과 ' +
      '<a href="https://elcherlab.com/privacy.html" target="_blank" rel="noopener">개인정보처리방침</a>에 ' +
      '동의합니다. (가입할 때만 필요)',
    'account.login': '로그인',
    'account.signup': '가입',
    'account.logout': '로그아웃',
    'account.errCredentials': '아이디와 비밀번호를 입력하세요.',
    'account.errConsent': '만 14세 이상 확인과 약관 동의에 체크해 주세요.',
    'account.errRequest': '요청 실패 ({status})',
    'account.errGeneric': '요청을 처리할 수 없습니다.',
  },
};

/**
 * 통합 인증 서버(auth.elcherlab.com)는 한국어 문구만 돌려준다. 그 서버를 고치면
 * gm·pc·pet 까지 같이 흔들리므로, 여기서 받은 문구를 영어로 갈아 끼운다.
 * 목록에 없는 문구는 서버가 준 그대로 보여준다 — 빈 화면보다 낫다.
 */
const SERVER_ERRORS_EN = {
  '가입 처리 중 오류가 발생했습니다.': 'Something went wrong while signing up.',
  '로그인 처리 중 오류가 발생했습니다.': 'Something went wrong while signing in.',
  '로그인이 필요합니다.': 'You need to sign in.',
  '만 14세 이상인지 확인해 주세요. 만 14세 미만은 가입할 수 없습니다.':
    'Please confirm you are 14 or older. Under-14s cannot sign up.',
  '비밀번호가 올바르지 않습니다.': 'That password is not correct.',
  '비밀번호는 6자 이상이어야 합니다.': 'The password must be at least 6 characters.',
  '시도가 너무 잦습니다. 잠시 후 다시 시도하세요.':
    'Too many attempts. Please try again in a moment.',
  '아이디 또는 비밀번호가 올바르지 않습니다.': 'That ID or password is not correct.',
  '아이디는 영문·숫자·밑줄 3~20자여야 합니다.':
    'The ID must be 3-20 characters: letters, digits or underscore.',
  '아이디와 비밀번호를 입력하세요.': 'Enter your ID and password.',
  '이미 사용 중인 아이디입니다.': 'That ID is already taken.',
};

function detect() {
  // 링크로 넘어온 값이 가장 세다 — 영어 랜딩에서 들어온 사람은 영어로 시작한다.
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
  } catch {
    /* URL 파싱 실패는 무시하고 다음 단계로 */
  }
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    /* 저장소가 막힌 브라우저 — 감지로 넘어간다 */
  }
  // 브라우저 밖(배포 파이프라인의 import 검사 등)에서도 불릴 수 있으므로 확인하고 읽는다.
  const nav = (typeof navigator !== 'undefined' && navigator.language || '').toLowerCase();
  return nav.startsWith('ko') ? 'ko' : 'en';
}

let lang = detect();

export function getLang() {
  return lang;
}

/**
 * 사전 문구에 <br> 이 들어 있어 innerHTML 로 넣는 자리가 있다. 거기에 팀 이름처럼
 * 사용자가 친 값을 끼울 때는 반드시 이걸 통과시킨다.
 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** t('start.slot', { n: 1 }) 처럼 {이름} 자리를 채운다. */
export function t(key, vars) {
  let s = DICT[lang]?.[key] ?? DICT.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

/** 인증 서버가 준 한국어 문구를 현재 언어로 옮긴다. */
export function translateServerError(msg) {
  if (lang === 'ko' || !msg) return msg;
  return SERVER_ERRORS_EN[msg] || msg;
}

/**
 * data-i18n* 속성이 붙은 노드를 현재 언어로 채운다.
 * 언어를 바꿀 때마다 다시 부르므로, 원문을 지우지 않고 키만 보고 다시 쓴다.
 */
export function applyI18n(root = document) {
  const fill = (attr, apply) => {
    root.querySelectorAll(`[${attr}]`).forEach((el) => {
      const key = el.getAttribute(attr);
      const vars = el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : null;
      apply(el, t(key, vars));
    });
  };
  fill('data-i18n', (el, v) => { el.textContent = v; });
  // 사전 안의 HTML 만 넣는다. 사용자 입력은 절대 여기로 오지 않는다.
  fill('data-i18n-html', (el, v) => { el.innerHTML = v; });
  fill('data-i18n-ph', (el, v) => { el.placeholder = v; });
  fill('data-i18n-title', (el, v) => { el.title = v; });
  fill('data-i18n-aria', (el, v) => { el.setAttribute('aria-label', v); });
  if (root === document) document.documentElement.lang = lang;
}

/**
 * 언어를 바꾸고 화면을 다시 칠한다.
 * 정적 문구는 여기서 바로 반영되고, 게임이 그려 넣은 부분은 bm:langchange 를
 * 듣는 쪽(Game.js)이 다시 그린다. 경기 중에도 새로고침 없이 바뀌어야 하므로
 * location.reload() 는 쓰지 않는다 — 진행 중인 경기가 날아간다.
 */
export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  try {
    localStorage.setItem(STORE_KEY, lang);
  } catch {
    /* 저장소가 막혀 있으면 이번 방문에만 적용된다 */
  }
  applyI18n(document);
  document.dispatchEvent(new CustomEvent('bm:langchange', { detail: { lang } }));
}

/** 토글 버튼에 붙인다. 지금 언어의 "반대쪽"으로 넘어간다. */
export function toggleLang() {
  setLang(lang === 'en' ? 'ko' : 'en');
}

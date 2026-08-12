/**
 * 개발용 로깅과 디버그 전역.
 *
 * 배포본에서는 전부 꺼진다. **켜는 조건을 명시적으로 적는다** — 끄는 조건을
 * 적으면 배포처가 늘 때마다 조건이 뒤집혀 그대로 새어 나간다
 * (사이버 클리커에서 실제로 그렇게 DEBUG 콘솔이 공개본에 나갔다).
 *
 * 켜는 방법
 *   - 로컬 개발(localhost, 127.0.0.1, file://)에서는 자동으로 켜진다
 *   - 배포본에서 잠깐 볼 일이 있으면 주소에 `?debug=1` 을 붙인다
 *
 * console.error 는 여기서 다루지 않는다. 진짜 오류는 배포본에서도 남아야
 * 이용자가 콘솔을 캡처해 보내줄 수 있다.
 */

export const DEBUG_ENABLED = (() => {
    if (typeof window === 'undefined' || !window.location) return false;
    const { hostname, protocol, search } = window.location;
    if (new URLSearchParams(search || '').get('debug') === '1') return true;
    if (protocol === 'file:') return true;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
})();

/**
 * 개발 중에만 남기는 로그. 배포본에서는 아무 일도 하지 않는다.
 * @param {...any} args
 */
export function debugLog(...args) {
    if (!DEBUG_ENABLED) return;
    console.log(...args);
}

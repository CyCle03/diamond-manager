/**
 * 선수 목록 카드의 공용 조각.
 *
 * Game.js 의 목록 렌더러들이 같은 HTML 을 각자 적고 있었다 — 스탯 줄은 다섯 벌,
 * 부상·피로 배지는 두 벌, "비었습니다" 줄은 열한 벌이었다. 한 곳만 고치면
 * 목록마다 카드 모양이 갈리므로 여기 한 벌만 둔다.
 *
 * DOM 을 만들지 않고 **문자열만** 돌려준다. 카드의 나머지(클릭 동작·버튼)는
 * 목록마다 다르므로 그대로 각자 조립한다.
 */

/**
 * 카드 아래쪽 스탯 줄. 투수와 야수가 보는 값이 다르다.
 * @param {{position: string, stats: object}} player
 */
export function playerStatsLine(player) {
  const s = player.stats;
  return player.position === 'P'
    ? `PIT:${s.pitching} STA:${Math.round(s.stamina || 0)} SPD:${s.speed}`
    : `CON:${s.contact} POW:${s.power} SPD:${s.speed} DEF:${s.defense}`;
}

/**
 * 이름 옆에 붙는 부상·피로 배지. 해당 없으면 빈 문자열이라 그대로 이어 붙이면 된다.
 * @param {{health?: {injuryDays?: number, fatigue?: number}}} player
 */
export function healthBadges(player) {
  const injuryDays = player.health?.injuryDays || 0;
  const fatigue = player.health?.fatigue || 0;
  const badges = [];
  if (injuryDays > 0) badges.push(`<span class="status-badge injury">INJ ${injuryDays}</span>`);
  if (fatigue >= 60) badges.push(`<span class="status-badge fatigue">FAT ${Math.round(fatigue)}</span>`);
  return badges.join('');
}

/** 목록이 비었을 때 자리에 넣는 안내 줄. */
export function emptyRow(text) {
  return `<div style="padding:10px; color:#888;">${text}</div>`;
}

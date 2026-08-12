#!/usr/bin/env bash
#
# 다이아몬드 매니저 배포 — 체크아웃(diamond-manager-src) → 웹루트(cyber-clicker)
#
# 저장소를 그대로 웹루트로 쓰지 않는다. 그렇게 하면 README·테스트 러너·
# 예전 코드(backup/)까지 공개되기 때문이다. elcherlab 에서 이미 두 번
# 겪은 사고라(elcherlab-home 의 docs/, pixel-pet 의 README.md) 처음부터
# 앱 파일만 추려 내보낸다.
#
# 빌드가 없는 정적 앱이라 스테이징 후 rsync --delete 가 전부다.
set -euo pipefail

SRC="${SRC:-/home/ubuntu/diamond-manager-src}"
WEBROOT="${WEBROOT:-/home/ubuntu/diamond-manager}"
STAGE="$(mktemp -d)"
BACKUP="${WEBROOT}.prev"

log() { printf '  %s\n' "$*"; }
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

# ── 1) 스테이징 — 앱이 아닌 것은 전부 뺀다 ─────────────────
rsync -a \
  --exclude '.git' --exclude '.github' --exclude '.gitignore' --exclude '.claude' \
  --exclude 'scripts' --exclude 'server' --exclude 'docs' \
  --exclude '*.md' \
  "$SRC/" "$STAGE/"

# 최소한 게임이 뜰 파일은 있어야 한다. 빈 디렉터리를 배포해 사이트를 날리지 않는다.
for must in index.html style.css js/main.js fonts/fonts.css; do
  [ -f "$STAGE/$must" ] || { echo "필수 파일 없음: $must — 배포 중단"; exit 1; }
done
log "스테이징 완료: $(find "$STAGE" -type f | wc -l)개 파일"

# ── 2) 백업 후 교체 ────────────────────────────────────────
rm -rf "$BACKUP"
if [ -d "$WEBROOT" ]; then cp -a "$WEBROOT" "$BACKUP"; else mkdir -p "$WEBROOT"; fi
rsync -a --delete "$STAGE/" "$WEBROOT/"
log "배포 완료: $WEBROOT"

# ── 3) 확인 — 실패하면 되돌린다 ────────────────────────────
if [ -f "$WEBROOT/index.html" ] && [ -f "$WEBROOT/js/core/cloud.js" ]; then
  log "확인 통과"
else
  echo "배포 결과가 비정상 — 이전 버전으로 되돌린다"
  [ -d "$BACKUP" ] && rsync -a --delete "$BACKUP/" "$WEBROOT/"
  exit 1
fi

#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

SCOPE="${1:---scope=all}"

case "$SCOPE" in
	--scope=all)
		SMOKE_USER_WHERE="email LIKE 'smoke-%@test.com' OR email LIKE 'ws-smoke-%@test.com' OR username LIKE 'guest-smoke-%'"
		;;
	--scope=ws)
		SMOKE_USER_WHERE="email LIKE 'ws-smoke-%@test.com'"
		;;
	*)
		printf '[KO] Scope de cleanup inconnu: %s\n' "$SCOPE" >&2
		exit 1
		;;
esac

SMOKE_QUIZ_WHERE="title LIKE 'WS Smoke Quiz %'"
SMOKE_ROOM_PREFIXES="WS Smoke "

run_database_query() {
	query="$1"

	docker exec -i quiz_db sh -lc \
		"PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -h 127.0.0.1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -v ON_ERROR_STOP=1 -t -A -c \"$query\""
}

query_csv() {
	query="$1"

	run_database_query "$query" | tr -d '\r[:space:]'
}

cleanup_room_store() {
	smoke_user_ids="$1"
	smoke_quiz_ids="$2"

	docker exec -i quiz_backend sh -lc \
		"SMOKE_USER_IDS='${smoke_user_ids}' SMOKE_QUIZ_IDS='${smoke_quiz_ids}' SMOKE_ROOM_PREFIXES='${SMOKE_ROOM_PREFIXES}' node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const storeFilePath = path.resolve(process.cwd(), '.runtime/rooms-store.json');

if (!fs.existsSync(storeFilePath)) {
  process.exit(0);
}

const parseCsv = (value) =>
  new Set(
    String(value || '')
      .split(',')
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry > 0),
  );

const roomPrefixes = String(process.env.SMOKE_ROOM_PREFIXES || '')
  .split('|')
  .map((entry) => entry.trim())
  .filter(Boolean);
const smokeUserIds = parseCsv(process.env.SMOKE_USER_IDS);
const smokeQuizIds = parseCsv(process.env.SMOKE_QUIZ_IDS);

let store;
try {
  store = JSON.parse(fs.readFileSync(storeFilePath, 'utf8'));
} catch {
  process.exit(0);
}

const rooms = Array.isArray(store.rooms) ? store.rooms : [];
const filteredRooms = rooms.filter((room) => {
  const roomName = typeof room?.name === 'string' ? room.name : '';
  const roomPlayers = Array.isArray(room?.players) ? room.players : [];
  const ownerUserId =
    typeof room?.ownerUserId === 'number' ? room.ownerUserId : null;
  const quizId = typeof room?.quizId === 'number' ? room.quizId : null;

  const matchesPrefix = roomPrefixes.some((prefix) => roomName.startsWith(prefix));
  const matchesOwner = ownerUserId !== null && smokeUserIds.has(ownerUserId);
  const matchesPlayer = roomPlayers.some(
    (player) =>
      typeof player?.userId === 'number' && smokeUserIds.has(player.userId),
  );
  const matchesQuiz = quizId !== null && smokeQuizIds.has(quizId);

  return !(matchesPrefix || matchesOwner || matchesPlayer || matchesQuiz);
});

const highestRoomId = filteredRooms.reduce((currentMax, room) => {
  if (typeof room?.id !== 'number') {
    return currentMax;
  }

  return Math.max(currentMax, room.id);
}, 0);

const nextRoomId =
  typeof store.nextRoomId === 'number'
    ? Math.max(highestRoomId + 1, 1)
    : highestRoomId + 1;

fs.writeFileSync(
  storeFilePath,
  JSON.stringify(
    {
      ...store,
      nextRoomId,
      rooms: filteredRooms,
    },
    null,
    2,
  ),
  'utf8',
);
NODE" \
		>/dev/null 2>&1 || true
}

cleanup_database_artifacts() {
	run_database_query "DELETE FROM \\\"QuizLeaderboard\\\" WHERE \\\"quizId\\\" IN (SELECT id FROM \\\"Quiz\\\" WHERE ${SMOKE_QUIZ_WHERE}) OR \\\"userId\\\" IN (SELECT id FROM \\\"User\\\" WHERE ${SMOKE_USER_WHERE});" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"QuizQuestion\\\" WHERE \\\"quizId\\\" IN (SELECT id FROM \\\"Quiz\\\" WHERE ${SMOKE_QUIZ_WHERE});" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"Quiz\\\" WHERE ${SMOKE_QUIZ_WHERE};" \
		>/dev/null 2>&1 || true
	run_database_query "DELETE FROM \\\"User\\\" WHERE ${SMOKE_USER_WHERE};" \
		>/dev/null 2>&1 || true
}

main() {
	smoke_user_ids="$(query_csv "SELECT COALESCE(string_agg(id::text, ','), '') FROM \\\"User\\\" WHERE ${SMOKE_USER_WHERE};" 2>/dev/null || true)"
	smoke_quiz_ids="$(query_csv "SELECT COALESCE(string_agg(id::text, ','), '') FROM \\\"Quiz\\\" WHERE ${SMOKE_QUIZ_WHERE};" 2>/dev/null || true)"

	cleanup_room_store "$smoke_user_ids" "$smoke_quiz_ids"
	cleanup_database_artifacts
}

main

import Avatar from "../Avatar";
import RoomSectionHeader from "./room-section-header";
import RoomSectionLabel from "./room-section-label";
import type { LeaderboardEntry } from "./room-types";
import RoomSection from "./RoomSection";

type RoomLeaderboardSectionProps = {
  entries: LeaderboardEntry[];
};

export default function RoomLeaderboardSection({
  entries,
}: RoomLeaderboardSectionProps) {
  return (
    <RoomSection className="xl:flex xl:flex-1 xl:flex-col">
      <RoomSectionLabel className="text-slate-400">
        Leaderboard
      </RoomSectionLabel>
      <RoomSectionHeader>Classement de la room</RoomSectionHeader>

      <div className="mt-6 space-y-3 xl:flex-1">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div key={`score-${entry.userId}`} className="flex items-center">
              <div className="flex min-w-0 flex-1 items-center justify-between rounded-[1.25rem] border border-white/10 bg-bg px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    alt={`Avatar de ${entry.username}`}
                    avatarUrl={entry.avatarUrl}
                    className="h-10 w-10 shrink-0 border border-white/15"
                    fallbackClassName="text-xs"
                    username={entry.username}
                  />
                  <p className="truncate text-sm font-medium text-text-muted">
                    {entry.username}
                  </p>
                </div>

                <span className="rounded-full bg-white/8 px-3 py-1 text-base font-semibold">
                  {entry.score}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.25rem] border border-white/10 bg-bg px-4 py-4 text-sm">
            La room n'a pas encore de score.
          </div>
        )}
      </div>
    </RoomSection>
  );
}

import { useCallback, useEffect, useState } from "react";
import type { Room } from "../services/quiz";
import { getUserById } from "../services/users";

type ScoreEntry = {
  userId: number;
  username: string;
  score: number;
};

type LeaderboardEntry = {
  userId: number;
  score: number;
};

type UseRoomParticipantsResult = {
  scoreEntries: ScoreEntry[];
  applyLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
};

export function useRoomParticipants(
  currentRoom: Room | null,
): UseRoomParticipantsResult {
  const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    if (!currentRoom) {
      setScoreEntries([]);
      return;
    }

    const loadRoomUsers = async () => {
      const entries = await Promise.all(
        currentRoom.players.map(async (player) => {
          const userId = player.userId;
          try {
            const user = await getUserById(userId);
            return { userId, username: user.username, score: 0 };
          } catch {
            return { userId, username: `Joueur #${userId}`, score: 0 };
          }
        }),
      );

      setScoreEntries((previous) =>
        entries.map((entry) => ({
          ...entry,
          score:
            previous.find((previousEntry) => previousEntry.userId === entry.userId)?.score ??
            entry.score,
        })),
      );
    };

    void loadRoomUsers();
  }, [currentRoom]);

  const applyLeaderboard = useCallback((leaderboard: LeaderboardEntry[]) => {
    setScoreEntries((previous) => {
      const scoreByUserId = new Map(
        leaderboard.map((entry) => [entry.userId, entry.score]),
      );

      const updatedEntries = previous.map((entry) => ({
        ...entry,
        score: scoreByUserId.get(entry.userId) ?? entry.score,
      }));

      const knownUserIds = new Set(updatedEntries.map((entry) => entry.userId));
      const missingEntries = leaderboard
        .filter((entry) => !knownUserIds.has(entry.userId))
        .map((entry) => ({
          userId: entry.userId,
          username: `Joueur #${entry.userId}`,
          score: entry.score,
        }));

      return [...updatedEntries, ...missingEntries].sort((a, b) => b.score - a.score);
    });
  }, []);

  return {
    scoreEntries,
    applyLeaderboard,
  };
}

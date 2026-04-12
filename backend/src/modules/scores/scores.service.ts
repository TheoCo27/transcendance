import { UsersService } from "@/modules/users/users.service";
import { Injectable, NotFoundException } from "@nestjs/common";

export type UserScore = {
  userId: number;
  username: string;
  score: number;
  wins: number;
};

type ScoreSnapshot = {
  score: number;
  wins: number;
};

@Injectable()
export class ScoresService {
  private readonly leaderboard = new Map<number, ScoreSnapshot>();

  constructor(private readonly usersService: UsersService) {}

  recordGameResult(
    entries: Array<{ userId: number; score: number }>,
    winnerUserId: number | null,
  ): void {
    for (const entry of entries) {
      const existing = this.leaderboard.get(entry.userId) || { score: 0, wins: 0 };
      this.leaderboard.set(entry.userId, {
        score: existing.score + entry.score,
        wins: existing.wins + (winnerUserId === entry.userId ? 1 : 0),
      });
    }
  }

  async getLeaderboard(limit = 10): Promise<UserScore[]> {
    const leaderboard: UserScore[] = [];

    for (const entry of this.getSortedEntries()) {
      const userScore = await this.toUserScore(entry);
      if (!userScore) {
        continue;
      }

      leaderboard.push(userScore);
      if (leaderboard.length >= limit) {
        break;
      }
    }

    return leaderboard;
  }

  async getUserScore(userId: number): Promise<UserScore> {
    const snapshot = this.leaderboard.get(userId);
    if (!snapshot) {
      throw new NotFoundException(`Score for user ${userId} not found`);
    }

    const userScore = await this.toUserScore({ userId, ...snapshot });
    if (!userScore) {
      throw new NotFoundException(`Score for user ${userId} not found`);
    }

    return userScore;
  }

  private getSortedEntries(): Array<{
    userId: number;
    score: number;
    wins: number;
  }> {
    return [...this.leaderboard.entries()]
      .map(([userId, snapshot]) => ({ userId, ...snapshot }))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (right.wins !== left.wins) {
          return right.wins - left.wins;
        }
        return left.userId - right.userId;
      });
  }

  private async toUserScore(entry: {
    userId: number;
    score: number;
    wins: number;
  }): Promise<UserScore | null> {
    const user = await this.usersService.findUser({ id: entry.userId });
    if (!user) {
      this.leaderboard.delete(entry.userId);
      return null;
    }

    return {
      userId: entry.userId,
      username: user.username,
      score: entry.score,
      wins: entry.wins,
    };
  }
}

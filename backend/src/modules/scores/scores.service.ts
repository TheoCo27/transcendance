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
    const entries = [...this.leaderboard.entries()]
      .map(([userId, snapshot]) => ({ userId, ...snapshot }))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (right.wins !== left.wins) {
          return right.wins - left.wins;
        }
        return left.userId - right.userId;
      })
      .slice(0, limit);

    return Promise.all(entries.map((entry) => this.toUserScore(entry)));
  }

  async getUserScore(userId: number): Promise<UserScore> {
    const snapshot = this.leaderboard.get(userId);
    if (!snapshot) {
      throw new NotFoundException(`Score for user ${userId} not found`);
    }

    return this.toUserScore({ userId, ...snapshot });
  }

  private async toUserScore(entry: {
    userId: number;
    score: number;
    wins: number;
  }): Promise<UserScore> {
    const user = await this.usersService.findUser({ id: entry.userId });

    return {
      userId: entry.userId,
      username: user?.username ?? `Joueur #${entry.userId}`,
      score: entry.score,
      wins: entry.wins,
    };
  }
}

import { PrismaService } from "@/prisma/prisma.service";
import { UsersService } from "@/modules/users/users.service";
import { Injectable, NotFoundException } from "@nestjs/common";

export type UserScore = {
  userId: number;
  username: string;
  score: number;
  wins: number;
};

export type QuizUserScore = UserScore & {
  gamesPlayed: number;
};

type ScoreSnapshot = {
  score: number;
  wins: number;
};

@Injectable()
export class ScoresService {
  private readonly leaderboard = new Map<number, ScoreSnapshot>();

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  // Enregistre le resultat d'une partie en memoire et par quiz.
  async recordGameResult(
    entries: Array<{ userId: number; score: number }>,
    winnerUserId: number | null,
    quizId?: number | null,
  ): Promise<void> {
    for (const entry of entries) {
      const existing = this.leaderboard.get(entry.userId) || { score: 0, wins: 0 };
      this.leaderboard.set(entry.userId, {
        score: existing.score + entry.score,
        wins: existing.wins + (winnerUserId === entry.userId ? 1 : 0),
      });
    }

    if (typeof quizId !== "number") {
      return;
    }

    await Promise.all(
      entries.map((entry) =>
        this.prisma.client.quizLeaderboard.upsert({
          where: {
            quizId_userId: {
              quizId,
              userId: entry.userId,
            },
          },
          create: {
            quizId,
            userId: entry.userId,
            totalScore: entry.score,
            wins: winnerUserId === entry.userId ? 1 : 0,
            gamesPlayed: 1,
          },
          update: {
            totalScore: {
              increment: entry.score,
            },
            wins: {
              increment: winnerUserId === entry.userId ? 1 : 0,
            },
            gamesPlayed: {
              increment: 1,
            },
          },
        }),
      ),
    );
  }

  // Retourne le classement global en memoire.
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

  // Retourne le score global d'un utilisateur.
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

  // Retourne le classement cumule pour un quiz donne.
  async getQuizLeaderboard(quizId: number, limit = 10): Promise<QuizUserScore[]> {
    const entries = await this.prisma.client.quizLeaderboard.findMany({
      where: {
        quizId,
      },
      orderBy: [
        { totalScore: "desc" },
        { wins: "desc" },
        { userId: "asc" },
      ],
      take: limit,
    });

    const resolvedEntries = await Promise.all(
      entries.map(async (entry) => {
        const userScore = await this.toUserScore({
          userId: entry.userId,
          score: entry.totalScore,
          wins: entry.wins,
        });

        if (!userScore) {
          return null;
        }

        return {
          ...userScore,
          gamesPlayed: entry.gamesPlayed,
        } satisfies QuizUserScore;
      }),
    );

    return resolvedEntries.filter((entry): entry is QuizUserScore => entry !== null);
  }

  // Trie les entrees du classement global.
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

  // Associe un score aux informations utilisateur correspondantes.
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

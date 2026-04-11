import { Injectable, NotFoundException } from "@nestjs/common";

export type UserScore = {
  userId: number;
  username: string;
  score: number;
  wins: number;
};

@Injectable()
export class ScoresService {
  private readonly leaderboard: UserScore[] = [];

  getLeaderboard(limit = 10): UserScore[] {
    return this.leaderboard.slice(0, limit);
  }

  getUserScore(userId: number): UserScore {
    const score = this.leaderboard.find((item) => item.userId === userId);
    if (!score) {
      throw new NotFoundException(`Score for user ${userId} not found`);
    }
    return score;
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";

export type UserScore = {
  userId: number;
  username: string;
  score: number;
  wins: number;
};

@Injectable()
export class ScoresService {
  private readonly leaderboard: UserScore[] = [
    { userId: 1, username: "PlayerOne", score: 1200, wins: 14 },
    { userId: 2, username: "QuizMaster", score: 980, wins: 11 },
    { userId: 3, username: "FastThinker", score: 860, wins: 9 },
    { userId: 4, username: "LuckyShot", score: 750, wins: 7 },
  ];

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


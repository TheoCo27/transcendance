import { PrismaService } from "@/prisma/prisma.service";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  DEFAULT_QUIZZES,
  upsertDefaultQuizzes,
} from "./default-quizzes";

@Injectable()
export class QuizzesBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(QuizzesBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const existingDefaultQuizCount = await this.prisma.client.quiz.count({
      where: {
        id: {
          in: DEFAULT_QUIZZES.map((quiz) => quiz.id),
        },
      },
    });

    if (existingDefaultQuizCount === DEFAULT_QUIZZES.length) {
      return;
    }

    await upsertDefaultQuizzes(this.prisma.client);
    this.logger.log(
      `${DEFAULT_QUIZZES.length} default quizzes are now available.`,
    );
  }
}

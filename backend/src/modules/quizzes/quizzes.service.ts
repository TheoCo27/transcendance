import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@generated/prisma/client";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateQuizDto } from "./dto/create-quiz.dto";

type QuizQuestionResponse = {
  id: number;
  questionText: string;
  answers: string[];
  correctAnswer: string;
  position: number;
  points: number;
  createdAt: string;
};

export type QuizResponse = {
  id: number;
  title: string;
  questionDurationSec: number | null;
  createdAt: string;
  questions: QuizQuestionResponse[];
};

type QuizWithQuestions = {
  id: number;
  title: string;
  questionDurationSec: number | null;
  createdAt: Date;
  questions: Array<{
    id: number;
    questionText: string;
    answers: Prisma.JsonValue;
    correctAnswer: string;
    position: number;
    points: number;
    createdAt: Date;
  }>;
};

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  // Cree un quiz et ses questions en base.
  async createQuiz(dto: CreateQuizDto): Promise<QuizResponse> {
    this.assertValidQuestions(dto);

    const quiz = (await this.prisma.client.quiz.create({
      data: {
        title: dto.title.trim(),
        questionDurationSec: dto.questionDurationSec ?? null,
        questions: {
          create: dto.questions.map((question, index) => {
            const answers = question.answers.map((answer) => answer.trim());

            return {
              questionText: question.questionText.trim(),
              answers,
              correctAnswer: answers[question.correctAnswerIndex],
              position: index + 1,
              ...(typeof question.points === "number"
                ? { points: question.points }
                : {}),
            };
          }),
        },
      },
      include: {
        questions: {
          orderBy: {
            position: "asc",
          },
        },
      },
    })) as QuizWithQuestions;

    return this.toQuizResponse(quiz);
  }

  // Retourne tous les quiz tries du plus recent au plus ancien.
  async listQuizzes(): Promise<QuizResponse[]> {
    const quizzes = (await this.prisma.client.quiz.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        questions: {
          orderBy: {
            position: "asc",
          },
        },
      },
    })) as QuizWithQuestions[];

    return quizzes.map((quiz) => this.toQuizResponse(quiz));
  }

  // Recupere un quiz complet par son identifiant.
  async getQuizById(quizId: number): Promise<QuizResponse> {
    const quiz = (await this.prisma.client.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: {
            position: "asc",
          },
        },
      },
    })) as QuizWithQuestions | null;

    if (!quiz) {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    }

    return this.toQuizResponse(quiz);
  }

  // Verifie la coherence des bonnes reponses declarees.
  private assertValidQuestions(dto: CreateQuizDto): void {
    dto.questions.forEach((question, index) => {
      if (question.correctAnswerIndex >= question.answers.length) {
        throw new BadRequestException(
          `Question ${index + 1} has an invalid correctAnswerIndex`,
        );
      }
    });
  }

  // Convertit un quiz Prisma vers le format expose par l'API.
  private toQuizResponse(quiz: QuizWithQuestions): QuizResponse {
    return {
      id: quiz.id,
      title: quiz.title,
      questionDurationSec: quiz.questionDurationSec,
      createdAt: quiz.createdAt.toISOString(),
      questions: quiz.questions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        answers: this.parseAnswers(question.answers),
        correctAnswer: question.correctAnswer,
        position: question.position,
        points: question.points,
        createdAt: question.createdAt.toISOString(),
      })),
    };
  }

  // Convertit les reponses JSON stockees en tableau de chaines.
  private parseAnswers(value: Prisma.JsonValue): string[] {
    if (
      Array.isArray(value) &&
      value.every((entry) => typeof entry === "string")
    ) {
      return [...value];
    }

    throw new BadRequestException(
      "Quiz answers are not stored in the expected format",
    );
  }
}

import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString =
  "postgresql://mduchauf:Marseille7513!@db:5432/transcendance";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const quizzes = [
    {
      id: 1001,
      title: "Culture Générale",
      questionDurationSec: 30,
      questions: [
        {
          questionText: "Quelle est la capitale de la France ?",
          answers: ["Paris", "Londres", "Berlin", "Rome"],
          correctAnswer: "Paris",
          points: 100,
        },
        {
          questionText:
            "Quelle planète est connue sous le nom de planète rouge ?",
          answers: ["Terre", "Mars", "Jupiter", "Vénus"],
          correctAnswer: "Mars",
          points: 100,
        },
        {
          questionText:
            "Quel est l'élément chimique représenté par le symbole 'O' ?",
          answers: ["Oxygène", "Or", "Osmium", "Oganesson"],
          correctAnswer: "Oxygène",
          points: 100,
        },
      ],
    },
    {
      id: 1002,
      title: "Mathématiques de base",
      questionDurationSec: 20,
      questions: [
        {
          questionText: "Combien font 2 + 2 ?",
          answers: ["3", "4", "5", "22"],
          correctAnswer: "4",
          points: 50,
        },
        {
          questionText: "Combien font 10 x 5 ?",
          answers: ["50", "40", "100", "15"],
          correctAnswer: "50",
          points: 50,
        },
        {
          questionText: "Quel est le carré de 6 ?",
          answers: ["12", "36", "18", "42"],
          correctAnswer: "36",
          points: 50,
        },
      ],
    },
    {
      id: 1003,
      title: "Science Rapide",
      questionDurationSec: 25,
      questions: [
        {
          questionText:
            "Quel gaz les plantes absorbent-elles pour la photosynthèse ?",
          answers: ["Oxygène", "Dioxyde de carbone", "Azote", "Hydrogène"],
          correctAnswer: "Dioxyde de carbone",
          points: 75,
        },
        {
          questionText: "Comment appelle-t-on couramment H2O ?",
          answers: ["Peroxyde d'hydrogène", "Eau", "Sel", "Ammoniac"],
          correctAnswer: "Eau",
          points: 75,
        },
        {
          questionText: "Quel organe humain pompe le sang dans le corps ?",
          answers: ["Foie", "Cerveau", "Cœur", "Poumon"],
          correctAnswer: "Cœur",
          points: 75,
        },
      ],
    },
  ];

  for (const quiz of quizzes) {
    const savedQuiz = await prisma.quiz.upsert({
      where: { id: quiz.id },
      update: {
        questionDurationSec: quiz.questionDurationSec,
        questions: {
          deleteMany: {},
          create: quiz.questions.map((q, idx) => ({
            questionText: q.questionText,
            answers: q.answers,
            correctAnswer: q.correctAnswer,
            position: idx + 1,
            points: q.points,
          })),
        },
      },
      create: {
        id: quiz.id,
        title: quiz.title,
        questionDurationSec: quiz.questionDurationSec,
        questions: {
          create: quiz.questions.map((q, idx) => ({
            questionText: q.questionText,
            answers: q.answers,
            correctAnswer: q.correctAnswer,
            position: idx + 1,
            points: q.points,
          })),
        },
      },
    });
  }
  console.log(`Successfully created ${quizzes.length} quizzes.`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // ignore
    }
    await pool.end();
  });

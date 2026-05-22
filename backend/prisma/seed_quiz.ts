import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { Pool } from "pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import {
  DEFAULT_QUIZZES,
  upsertDefaultQuizzes,
} from "../src/modules/quizzes/default-quizzes";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function formatSeedError(error: unknown): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P1000"
  ) {
    return "Quiz seed failed: database authentication failed. Check DATABASE_URL and POSTGRES_* values.";
  }

  if (error instanceof Error) {
    return `Quiz seed failed: ${error.message}`;
  }

  return "Quiz seed failed.";
}

async function main() {
  await upsertDefaultQuizzes(prisma);
  console.log(`Successfully created ${DEFAULT_QUIZZES.length} quizzes.`);
}

main()
  .catch((e) => {
    console.error(formatSeedError(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // ignore
    }
    await pool.end();
  });

import { apiRequest } from "./api";

export type SimpleQuizApiCategory =
  | "musique"
  | "culture_generale"
  | "art_litterature"
  | "tv_cinema"
  | "actu_politique"
  | "sport"
  | "jeux_videos"
  | "histoire"
  | "geographie"
  | "science"
  | "gastronomie";

export type SimpleQuizApiDifficulty = "facile" | "normal" | "difficile";

export type SimpleQuizApiItem = {
  _id: string;
  question: string;
  answer: string;
  badAnswers: string[];
  category: SimpleQuizApiCategory;
  difficulty: SimpleQuizApiDifficulty;
};

type SimpleQuizApiResponse = {
  count: number;
  quizzes: SimpleQuizApiItem[];
};

export type FetchSimpleQuizParams = {
  category: SimpleQuizApiCategory;
  difficulty: SimpleQuizApiDifficulty;
  limit: number;
};

export async function fetchSimpleQuizQuestions({
  category,
  difficulty,
  limit,
}: FetchSimpleQuizParams): Promise<SimpleQuizApiItem[]> {
  const query = new URLSearchParams({
    category,
    difficulty,
    limit: String(limit),
  });

  const data = await apiRequest<SimpleQuizApiResponse>(
    `/quizzes/simple-api?${query.toString()}`,
  );

  if (!Array.isArray(data.quizzes)) {
    throw new Error("Réponse invalide de l'API de quiz.");
  }

  return data.quizzes;
}

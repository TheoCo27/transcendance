import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthSession } from "../hooks/useAuthSession";

export default function QuizPage() {
  const { quizId: quizIdParam } = useParams();
  const quizId = Number(quizIdParam);
  const { user, isLoading } = useAuthSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, navigate, user]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="flex-1">
      <h1>QuizPage</h1>
    </div>
  );
}

import { Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import {
  HomePage,
  LoginPage,
  NotFound,
  QuizPage,
  RegisterPage,
  RoomPage,
} from "./pages";

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rooms/:roomId" element={<RoomPage />} />
        <Route path="/quiz/:quizId" element={<QuizPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
}

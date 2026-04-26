import { Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import FriendsPage from "./pages/FriendsPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/ProfilePage";
import QuizAdminPage from "./pages/QuizAdminPage";
import QuizPage from "./pages/QuizPage";
import RegisterPage from "./pages/RegisterPage";
import RoomPage from "./pages/RoomPage";
import GamesPage from "./pages/GamesPage";

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<QuizAdminPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rooms/:roomId" element={<RoomPage />} />
        <Route path="/rooms/:roomId/games/:gameId" element={<GamesPage />} />
        <Route path="/quiz/:quizId" element={<QuizPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
}

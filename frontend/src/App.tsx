import { Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import {
  FriendsPage,
  GamesPage,
  HomePage,
  LoginPage,
  NotFound,
  PrivacyPolicyPage,
  ProfilePage,
  QuizAdminPage,
  RegisterPage,
  RoomPage,
  TermsOfServicePage,
} from "./pages";

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <div className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<QuizAdminPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/politique-confidentialite"
            element={<PrivacyPolicyPage />}
          />
          <Route
            path="/conditions-utilisation"
            element={<TermsOfServicePage />}
          />
          <Route path="/rooms/:roomId" element={<RoomPage />} />
          <Route path="/games/:roomId" element={<GamesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import StatusPage from "./pages/StatusPage";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <StatusPage />
      <Footer />
    </div>
  );
}

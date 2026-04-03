import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <HomePage />
      <Footer />
    </div>
  );
}

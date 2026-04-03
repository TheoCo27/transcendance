import { useState } from "react";
import GamePanel from "../components/Quiz/GamePanel";
import LobbyPanel from "../components/Quiz/LobbyPanel";
import RulesPanel from "../components/Quiz/RulesPanel";

type ActivePanel = "lobby" | "game";

export default function HomePage() {
  const [activePanel, setActivePanel] = useState<ActivePanel>("lobby");
  const [isRulesOpen, setIsRulesOpen] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  return (
    <main className="flex flex-1 px-[10%] py-6">
      {activePanel === "lobby" ? (
        <LobbyPanel
          isRulesOpen={isRulesOpen}
          onToggleRules={() => setIsRulesOpen((currentValue) => !currentValue)}
          onPlay={() => {
            setActivePanel("game");
            setIsRulesOpen(false);
          }}
        />
      ) : null}

      {activePanel === "game" ? (
        <GamePanel
          isRulesOpen={isRulesOpen}
          onToggleRules={() => setIsRulesOpen((currentValue) => !currentValue)}
          selectedAnswer={selectedAnswer}
          onSelectAnswer={setSelectedAnswer}
        />
      ) : null}
    </main>
  );
}

import { useState } from "react";
import PrimaryButton from "../PrimaryButton";
import RulesPanel from "./RulesPanel";

type LobbyPanelProps = {
  isRulesOpen: boolean;
  onToggleRules: () => void;
  onPlay: () => void;
};

export default function LobbyPanel({
  isRulesOpen,
  onToggleRules,
  onPlay,
}: LobbyPanelProps) {
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);

  if (isRulesOpen) {
    return (
      <div className="min-h-[80vh] w-full">
        <RulesPanel onClose={onToggleRules} />
      </div>
    );
  }

  return (
    <div className="flex w-full gap-6">
      <div className="flex min-h-[80vh] flex-1 flex-col rounded-2xl border border-white/10 bg-surface px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Parties en cours</h1>
          <button
            className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
            type="button"
            onClick={onToggleRules}
          >
            Règles
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-4">
            <div>
              <p className="m-0 text-text">Nom de salon 1</p>
              <p className="m-0 mt-1 text-sm text-text/60">3 joueurs • 5 manches</p>
            </div>
            <PrimaryButton className="px-4 py-2 text-sm" onClick={onPlay}>
              Rejoindre
            </PrimaryButton>
          </div>
        </div>
      </div>
      <div className="flex min-h-[80vh] w-[30%] min-w-[200px] flex-col rounded-2xl border border-white/10 bg-surface px-6 py-6">
        <h2 className="mb-5 text-2xl font-semibold text-text">
          Créer une partie
        </h2>
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-text/70">Nom de la partie</p>
            <input
              className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
              type="text"
              placeholder="Nom de la partie"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-text/70">Nombre de manches</p>
            <select className="h-12 w-full rounded-xl border border-white/10 bg-background px-4 text-text outline-none">
              <option>3 manches</option>
              <option>4 manches</option>
              <option>5 manches</option>
              <option>6 manches</option>
              <option>7 manches</option>
              <option>8 manches</option>
              <option>9 manches</option>
              <option>10 manches</option>
            </select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-text/70">Salon privé</p>
            <div className="inline-flex rounded-lg border border-white/10 bg-background p-1">
              <button
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  isPrivateRoom
                    ? "text-text/70"
                    : "bg-primary text-text",
                ].join(" ")}
                type="button"
                onClick={() => setIsPrivateRoom(false)}
              >
                Non
              </button>
              <button
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  isPrivateRoom
                    ? "bg-primary text-text"
                    : "text-text/70",
                ].join(" ")}
                type="button"
                onClick={() => setIsPrivateRoom(true)}
              >
                Oui
              </button>
            </div>
          </div>
          {isPrivateRoom ? (
            <div>
              <p className="mb-2 text-sm font-medium text-text/70">Mot de passe</p>
              <input
                className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
                type="password"
                placeholder="Mot de passe"
              />
            </div>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-center pt-6">
          <PrimaryButton className="px-6 py-3 text-base" onClick={onPlay}>
            Créer et jouer
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

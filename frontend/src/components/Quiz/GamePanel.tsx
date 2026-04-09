import { useState } from "react";
import Panel from "../Panel";
import PrimaryButton from "../PrimaryButton";

type ScoreEntry = {
  userId: number;
  username: string;
  score: number;
};

type ChatEntry = {
  userId: number;
  username: string;
  content: string;
  sentAt: string;
  isSelf: boolean;
};

type GamePanelProps = {
  onToggleRules: () => void;
  onLeaveRoom: () => void;
  selectedAnswer: number | null;
  onSelectAnswer: (answerIndex: number) => void;
  scoreEntries: ScoreEntry[];
  chatMessages: ChatEntry[];
  chatError: string | null;
  onSendChatMessage: (content: string) => void;
};

export default function GamePanel({
  onToggleRules,
  onLeaveRoom,
  selectedAnswer,
  onSelectAnswer,
  scoreEntries,
  chatMessages,
  chatError,
  onSendChatMessage,
}: GamePanelProps) {
  const [messageInput, setMessageInput] = useState("");

  const handleSendMessage = () => {
    const content = messageInput.trim();
    if (!content) {
      return;
    }
    onSendChatMessage(content);
    setMessageInput("");
  };

  return (
    <div className="flex w-full gap-6">
      <Panel className="min-h-[80vh] min-w-75 w-[25%] px-6 py-6">
        <p className="mb-4 text-2xl font-semibold text-text">Chat</p>
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {chatMessages.map((message) => (
            <div
              className={[
                "max-w-[75%] rounded-2xl px-4 py-3",
                message.isSelf ? "self-end bg-primary" : "bg-background",
              ].join(" ")}
              key={`${message.userId}-${message.sentAt}-${message.content}`}
            >
              {!message.isSelf ? (
                <p className="m-0 text-sm text-text/70">{message.username}</p>
              ) : null}
              <p className="m-0 text-base text-text">{message.content}</p>
            </div>
          ))}
        </div>
        <form
          className="mt-4 flex items-center gap-3 rounded-2xl bg-background px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text/50"
            type="text"
            placeholder="Écrire un message..."
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
          />
          <PrimaryButton className="shrink-0 px-4 py-2 text-sm" type="submit">
            Envoyer
          </PrimaryButton>
        </form>
        {chatError ? (
          <p className="mt-3 text-sm text-red-300">{chatError}</p>
        ) : null}
      </Panel>
      <Panel className="min-h-[80vh] min-w-125 flex-1 px-8 py-6">
        <div className="mb-6 flex items-center justify-end gap-3">
          <button
            className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
            type="button"
            onClick={onLeaveRoom}
          >
            Quitter la room
          </button>
          <button
            className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
            type="button"
            onClick={onToggleRules}
          >
            Règles
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-around">
          <p className="text-center text-3xl font-semibold text-text">
            Question ?
          </p>
          <div className="flex w-full max-w-140 flex-col gap-4">
            <button
              className={[
                "h-20 rounded-xl border text-base font-medium text-text transition",
                selectedAnswer === 0
                  ? "border-primary bg-primary"
                  : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
              ].join(" ")}
              type="button"
              onClick={() => onSelectAnswer(0)}
            >
              Réponse 1
            </button>
            <button
              className={[
                "h-20 rounded-xl border text-base font-medium text-text transition",
                selectedAnswer === 1
                  ? "border-primary bg-primary"
                  : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
              ].join(" ")}
              type="button"
              onClick={() => onSelectAnswer(1)}
            >
              Réponse 2
            </button>
            <button
              className={[
                "h-20 rounded-xl border text-base font-medium text-text transition",
                selectedAnswer === 2
                  ? "border-primary bg-primary"
                  : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
              ].join(" ")}
              type="button"
              onClick={() => onSelectAnswer(2)}
            >
              Réponse 3
            </button>
            <button
              className={[
                "h-20 rounded-xl border text-base font-medium text-text transition",
                selectedAnswer === 3
                  ? "border-primary bg-primary"
                  : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
              ].join(" ")}
              type="button"
              onClick={() => onSelectAnswer(3)}
            >
              Réponse 4
            </button>
          </div>
        </div>
      </Panel>
      <Panel className="min-h-[80vh] min-w-50 w-[25%] px-6 py-6">
        <p className="mb-5 text-xl font-semibold text-text">Points</p>
        <div className="space-y-3">
          {scoreEntries.map((entry) => (
            <div
              className="flex items-center justify-between rounded-xl bg-background px-4 py-3"
              key={entry.userId}
            >
              <span className="min-w-0 truncate">{entry.username}</span>
              <span>{entry.score}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import Panel from "../Panel";
import PrimaryButton from "../PrimaryButton";
import type { PublicQuestion } from "../../types/game";

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
  onStartRoom: () => void;
  canStartRoom: boolean;
  selectedAnswer: number | null;
  onSelectAnswer: (answerIndex: number) => void;
  currentQuestion: PublicQuestion | null;
  scoreEntries: ScoreEntry[];
  chatMessages: ChatEntry[];
  chatError: string | null;
  onSendChatMessage: (content: string) => void;
};

export default function GamePanel({
  onToggleRules,
  onLeaveRoom,
  onStartRoom,
  canStartRoom,
  selectedAnswer,
  onSelectAnswer,
  currentQuestion,
  scoreEntries,
  chatMessages,
  chatError,
  onSendChatMessage,
}: GamePanelProps) {
  const [messageInput, setMessageInput] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [chatMessages]);

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
      <Panel className="h-[80vh] min-w-75 w-[25%] overflow-hidden px-6 py-6">
        <p className="mb-4 text-2xl font-semibold text-text">Chat</p>
        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full flex-col gap-3 overflow-y-auto pr-2"
            ref={messagesContainerRef}
          >
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
        </div>
        <form
          className="mt-4 flex shrink-0 items-center gap-3 rounded-2xl bg-background px-4 py-3"
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
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            {canStartRoom ? (
              <PrimaryButton
                className="px-4 py-2 text-sm"
                onClick={onStartRoom}
              >
                Démarrer
              </PrimaryButton>
            ) : null}
          </div>
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
            {currentQuestion?.text ?? "En attente de la prochaine question"}
          </p>
          <div className="flex w-full max-w-140 flex-col gap-4">
            {(currentQuestion?.options ?? []).map((option, index) => (
              <button
                className={[
                  "h-20 rounded-xl border px-4 text-base font-medium text-text transition",
                  selectedAnswer === index
                    ? "border-primary bg-primary"
                    : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
                ].join(" ")}
                key={`${currentQuestion?.id}-${index}-${option}`}
                type="button"
                onClick={() => onSelectAnswer(index)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </Panel>
      <Panel className="min-h-[80vh] min-w-50 w-[25%] px-6 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="m-0 text-xl font-semibold text-text">Points</p>
          <button
            className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
            type="button"
            onClick={onLeaveRoom}
          >
            Quitter
          </button>
        </div>
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

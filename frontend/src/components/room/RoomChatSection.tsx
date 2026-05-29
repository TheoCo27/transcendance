import { useEffect, useRef } from "react";
import Avatar from "../ui/Avatar";
import Input from "../ui/input";
import PrimaryButton from "../ui/PrimaryButton";
import RoomSectionHeader from "./room-section-header";
import RoomSectionLabel from "./room-section-label";
import type { ChatEntry } from "./room-types";
import RoomSection from "./RoomSection";

const ROOM_CHAT_MESSAGE_MAX_LENGTH = 500;

type RoomChatSectionProps = {
  entries: ChatEntry[];
  chatInput: string;
  chatError: string | null;
  isUserInRoom: boolean;
  onChatInputChange: (value: string) => void;
  onSendMessage: () => void;
};

function formatChatTime(sentAt: string): string {
  const parsed = new Date(sentAt);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export default function RoomChatSection({
  entries,
  chatInput,
  chatError,
  isUserInRoom,
  onChatInputChange,
  onSendMessage,
}: RoomChatSectionProps) {
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const hasInitializedScrollRef = useRef(false);
  const hasReachedChatLimit = chatInput.length >= ROOM_CHAT_MESSAGE_MAX_LENGTH;

  const isNearBottom = (container: HTMLDivElement) =>
    container.scrollHeight - container.scrollTop - container.clientHeight <= 48;

  const handleChatScroll = () => {
    if (!chatContainerRef.current) {
      return;
    }

    shouldAutoScrollRef.current = isNearBottom(chatContainerRef.current);
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) {
      return;
    }

    if (!hasInitializedScrollRef.current) {
      container.scrollTop = container.scrollHeight;
      shouldAutoScrollRef.current = true;
      hasInitializedScrollRef.current = true;
      return;
    }

    if (shouldAutoScrollRef.current) {
      container.scrollTop = container.scrollHeight;
      shouldAutoScrollRef.current = true;
    }
  }, [entries.length]);

  return (
    <RoomSection className="flex-1 min-h-0">
      <RoomSectionLabel className="text-slate-400">Chat room</RoomSectionLabel>
      <RoomSectionHeader>Discussion en direct</RoomSectionHeader>

      <div
        className="mt-6 max-h-100 overflow-y-auto overflow-x-hidden rounded-3xl border border-white/10 bg-bg p-4"
        onScroll={handleChatScroll}
        ref={chatContainerRef}
      >
        {!isUserInRoom ? (
          <div className="rounded-[1.25rem] bg-surface border border-white/10 px-4 py-4 text-sm">
            Veuillez rejoindre la room pour participer à la discussion.
          </div>
        ) : entries.length > 0 ? (
          entries.map((message, index) => {
            const previousMessage = entries[index - 1];
            const isConsecutiveFromSameSender =
              index > 0 && previousMessage.userId === message.userId;
            const showSenderMeta = !isConsecutiveFromSameSender;
            const sentTime = formatChatTime(message.sentAt);

            return (
              <article
                className={
                  index === 0
                    ? ""
                    : isConsecutiveFromSameSender
                      ? "mt-1"
                      : "mt-4"
                }
                key={`${message.sentAt}-${message.userId}-${index}`}
              >
                {showSenderMeta ? (
                  <div
                    className={[
                      "flex items-center gap-2",
                      message.isSelf ? "justify-end" : "justify-start",
                    ].join(" ")}
                  >
                    {message.isSelf ? (
                      <>
                        <p className="text-xs font-medium text-slate-400/85">
                          {sentTime}
                        </p>
                        <p className="text-sm font-medium text-slate-300">
                          Moi
                        </p>
                        <Avatar
                          alt={`Avatar de ${message.username}`}
                          avatarUrl={message.avatarUrl}
                          className="h-9 w-9 shrink-0 border border-white/15"
                          fallbackClassName="text-xs"
                          username={message.username}
                        />
                      </>
                    ) : (
                      <>
                        <Avatar
                          alt={`Avatar de ${message.username}`}
                          avatarUrl={message.avatarUrl}
                          className="h-9 w-9 shrink-0 border border-white/15"
                          fallbackClassName="text-xs"
                          username={message.username}
                        />
                        <p className="text-sm font-medium text-slate-300">
                          {message.username}
                        </p>
                        <p className="text-xs font-medium text-slate-400/85">
                          {sentTime}
                        </p>
                      </>
                    )}
                  </div>
                ) : null}

                <div
                  className={[
                    "w-fit max-w-[70%] rounded-2xl border px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.2)]",
                    showSenderMeta ? "mt-2" : "mt-0",
                    message.isSelf
                      ? "ml-auto mr-11 border-white/15 bg-primary text-white"
                      : "ml-11 mr-auto border-amber-200/35 bg-accent text-amber-900",
                  ].join(" ")}
                >
                  <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-6">
                    {message.content}
                  </p>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[1.25rem] bg-surface border border-white/10 px-4 py-4 text-sm">
            Aucun message pour l'instant. Lance la conversation.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Input
          className="w-full"
          maxLength={ROOM_CHAT_MESSAGE_MAX_LENGTH}
          placeholder={
            isUserInRoom
              ? "Écrire un message a la room..."
              : "Rejoins la room pour discuter..."
          }
          value={chatInput}
          disabled={!isUserInRoom}
          onChange={(event) => onChatInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSendMessage();
            }
          }}
        />
        <PrimaryButton
          disabled={!isUserInRoom || chatInput.trim().length === 0}
          onClick={onSendMessage}
        >
          Envoyer
        </PrimaryButton>
      </div>

      {hasReachedChatLimit ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Attention : le message a été tronqué. Maximum{" "}
          {ROOM_CHAT_MESSAGE_MAX_LENGTH} caractères.
        </p>
      ) : null}

      {chatError ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {chatError}
        </p>
      ) : null}
    </RoomSection>
  );
}

import type { FormEvent } from "react";
import type { FriendUserSummary, PrivateMessage } from "../../services/users";
import Section from "../section";
import SectionHeader from "../section-header";
import SectionLabel from "../section-label";
import PrimaryButton from "../ui/PrimaryButton";
import EmptyCard from "../ui/empty-card";

type PrivateMessagesPanelProps = {
  currentUserId: number;
  selectedFriend: FriendUserSummary | null;
  messages: PrivateMessage[];
  isConversationLoading: boolean;
  conversationError: string | null;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onMessageSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSendingMessage: boolean;
};

function formatTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function PrivateMessagesPanel({
  currentUserId,
  selectedFriend,
  messages,
  isConversationLoading,
  conversationError,
  messageInput,
  onMessageInputChange,
  onMessageSubmit,
  isSendingMessage,
}: PrivateMessagesPanelProps) {
  return (
    <Section className="min-h-176">
      <div className="border-b border-slate-900/8 pb-5">
        <SectionLabel className="text-slate-400">Messages prives</SectionLabel>
        <SectionHeader>
          {selectedFriend ? selectedFriend.username : "Choisis un ami"}
        </SectionHeader>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          {selectedFriend
            ? "La conversation privee est reservee aux amis acceptes."
            : "Selectionne un ami dans le reseau pour ouvrir ou reprendre une conversation."}
        </p>
      </div>

      {selectedFriend ? (
        <>
          <div className="mt-5 flex-1 space-y-3 overflow-y-auto rounded-[1.75rem] bg-bg p-4">
            {isConversationLoading ? (
              <div className="rounded bg-foreground/80 px-4 py-4 text-sm text-slate-600">
                Chargement de la conversation...
              </div>
            ) : null}

            {conversationError ? (
              <div className="rounded-[1.25rem] bg-rose-50 px-4 py-4 text-sm text-rose-700">
                {conversationError}
              </div>
            ) : null}

            {!isConversationLoading &&
            !conversationError &&
            messages.length === 0 ? (
              <EmptyCard>
                {" "}
                Aucun message pour l'instant. Lance la conversation avec{" "}
                {selectedFriend.username}.
              </EmptyCard>
            ) : null}

            {messages.map((message) => {
              const isOwnMessage = message.senderId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[1.4rem] px-4 py-3 shadow-sm ${
                      isOwnMessage
                        ? "bg-slate-950 text-text"
                        : "bg-text text-slate-950"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-7">
                      {message.content}
                    </p>
                    <div
                      className={`mt-2 flex items-center gap-2 text-xs ${
                        isOwnMessage ? "text-white/60" : "text-slate-500"
                      }`}
                    >
                      <span>{formatTimestamp(message.createdAt)}</span>
                      {isOwnMessage ? (
                        <span>{message.readAt ? "Lu" : "Envoyé"}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            className="mt-5"
            onSubmit={(event) => void onMessageSubmit(event)}
          >
            <label
              className="mb-2 block text-sm font-medium text-slate-400"
              htmlFor="private-message"
            >
              Écrire à {selectedFriend.username}
            </label>
            <textarea
              className="min-h-32 w-full rounded-xl border border-white/10 bg-bg px-4 py-4 text-text outline-none placeholder:text-text/40 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              id="private-message"
              placeholder="Ecris un message prive..."
              value={messageInput}
              onChange={(event) => onMessageInputChange(event.target.value)}
              disabled={isSendingMessage}
              maxLength={1000}
              required
            />
            <div className="mt-4 flex justify-end">
              <PrimaryButton disabled={isSendingMessage} type="submit">
                {isSendingMessage ? "Envoi..." : "Envoyer le message"}
              </PrimaryButton>
            </div>
          </form>
        </>
      ) : (
        <div className="mt-5 rounded-[1.75rem] bg-slate-100/80 px-5 py-5 text-sm leading-7 text-slate-600">
          Ton reseau apparait a gauche. Clique sur un ami pour afficher le fil
          prive et commencer a discuter.
        </div>
      )}
    </Section>
  );
}

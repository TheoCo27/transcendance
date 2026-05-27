import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import FriendNetworkPanel, {
  type FriendNotice,
} from "../components/Friends/FriendNetworkPanel";
import PrivateMessagesPanel from "../components/Friends/PrivateMessagesPanel";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { getUserFacingErrorMessage } from "../services/api";
import { AUTH_USERNAME_MIN_LENGTH } from "../services/auth";
import {
  getConversationSummaries,
  getMyFriendOverview,
  getPrivateConversation,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
  sendPrivateMessage,
  type FriendOverview,
  type PrivateConversationSummary,
  type PrivateMessage,
} from "../services/users";

const FRIENDS_POLL_INTERVAL_MS = 2000;
const CONVERSATION_POLL_INTERVAL_MS = 500;
const PRIVATE_MESSAGE_RATE_LIMITS = [
  { limit: 5, windowMs: 5_000 },
  { limit: 20, windowMs: 60_000 },
] as const;

function areMessagesEqual(left: PrivateMessage[], right: PrivateMessage[]) {
  return (
    left.length === right.length &&
    left.every((message, index) => {
      const candidate = right[index];

      return (
        message.id === candidate?.id &&
        message.senderId === candidate.senderId &&
        message.receiverId === candidate.receiverId &&
        message.content === candidate.content &&
        message.createdAt === candidate.createdAt &&
        message.readAt === candidate.readAt
      );
    })
  );
}

export default function FriendsPage() {
  const { user, isLoading } = useAuthSession();
  const [friendOverview, setFriendOverview] = useState<FriendOverview | null>(
    null,
  );
  const [conversationSummaries, setConversationSummaries] = useState<
    PrivateConversationSummary[]
  >([]);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [friendNotice, setFriendNotice] = useState<FriendNotice | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [pendingRemovalFriendId, setPendingRemovalFriendId] = useState<
    number | null
  >(null);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [conversationError, setConversationError] = useState<string | null>(
    null,
  );
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const isSendingMessageRef = useRef(false);
  const privateMessageTimestampsRef = useRef<number[]>([]);

  const conversationSummariesByFriendId = useMemo(
    () =>
      conversationSummaries.reduce<Record<number, PrivateConversationSummary>>(
        (accumulator, summary) => {
          accumulator[summary.friendId] = summary;
          return accumulator;
        },
        {},
      ),
    [conversationSummaries],
  );

  const selectedFriend =
    friendOverview?.friends.find((friend) => friend.id === selectedFriendId) ??
    null;

  const refreshFriendData = async (showLoading = false) => {
    if (showLoading) {
      setIsFriendsLoading(true);
    }

    const [overview, summaries] = await Promise.all([
      getMyFriendOverview(),
      getConversationSummaries(),
    ]);

    setFriendOverview(overview);
    setConversationSummaries(summaries);
    setFriendsError(null);

    if (showLoading) {
      setIsFriendsLoading(false);
    }
  };

  const refreshConversation = async (friendId: number) => {
    const conversation = await getPrivateConversation(friendId);
    setMessages(conversation);
    setConversationError(null);
  };

  useEffect(() => {
    if (!user || user.isGuest) {
      setFriendOverview(null);
      setConversationSummaries([]);
      setFriendsError(null);
      setSelectedFriendId(null);
      return;
    }

    let cancelled = false;

    const loadData = async (showLoading = false) => {
      if (showLoading) {
        setIsFriendsLoading(true);
      }

      try {
        const [overview, summaries] = await Promise.all([
          getMyFriendOverview(),
          getConversationSummaries(),
        ]);

        if (cancelled) {
          return;
        }

        setFriendOverview(overview);
        setConversationSummaries(summaries);
        setFriendsError(null);
      } catch (error) {
        if (!cancelled) {
          setFriendsError(
            getUserFacingErrorMessage(
              error,
              "Impossible de charger la page amis",
            ),
          );
        }
      } finally {
        if (!cancelled && showLoading) {
          setIsFriendsLoading(false);
        }
      }
    };

    void loadData(true);

    const interval = window.setInterval(() => {
      void loadData();
    }, FRIENDS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (!friendOverview || friendOverview.friends.length === 0) {
      setSelectedFriendId(null);
      return;
    }

    if (
      selectedFriendId !== null &&
      friendOverview.friends.some((friend) => friend.id === selectedFriendId)
    ) {
      return;
    }

    const prioritizedFriendId =
      conversationSummaries.find((summary) =>
        friendOverview.friends.some((friend) => friend.id === summary.friendId),
      )?.friendId ??
      friendOverview.friends[0]?.id ??
      null;

    setSelectedFriendId(prioritizedFriendId);
  }, [friendOverview, selectedFriendId, conversationSummaries]);

  useEffect(() => {
    if (!user || user.isGuest || selectedFriendId === null) {
      setMessages([]);
      setConversationError(null);
      return;
    }

    let cancelled = false;

    const loadConversation = async (
      showLoading = false,
      syncFriendData = false,
    ) => {
      if (showLoading) {
        setIsConversationLoading(true);
      }

      try {
        const conversation = await getPrivateConversation(selectedFriendId);

        if (!cancelled) {
          setMessages((currentMessages) =>
            areMessagesEqual(currentMessages, conversation)
              ? currentMessages
              : conversation,
          );
          setConversationError(null);

          if (syncFriendData) {
            void refreshFriendData().catch(() => {
              // The conversation remains usable even if the side summary refresh fails.
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setConversationError(
            getUserFacingErrorMessage(
              error,
              "Impossible de charger cette conversation",
            ),
          );
        }
      } finally {
        if (!cancelled && showLoading) {
          setIsConversationLoading(false);
        }
      }
    };

    void loadConversation(true, true);

    const interval = window.setInterval(() => {
      void loadConversation();
    }, CONVERSATION_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedFriendId, user]);

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
        <div className="w-full rounded-4xl border border-slate-900/10 bg-white/70 p-8 text-slate-600 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          Chargement de la page amis...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
        <section className="w-full rounded-[2.5rem] border border-amber-200 bg-amber-50 p-8 text-amber-950 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800">
            Amis
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Connexion requise</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-amber-900/80">
            Connecte-toi pour gérer ta liste d'amis et ouvrir des messages
            privés.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/login">
              <PrimaryButton>Se connecter</PrimaryButton>
            </Link>
            <Link to="/register">
              <SecondaryButton>S'inscrire</SecondaryButton>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const handleFriendSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFriendNotice(null);
    setIsSendingRequest(true);

    try {
      const result = await sendFriendRequest(friendUsername.trim());
      setFriendUsername("");
      setFriendNotice({
        kind: "success",
        message: result.message,
      });
      await refreshFriendData();
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible d'ajouter cet ami",
      );
      if (message) {
        setFriendNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleFriendRequestAction = async (
    requestId: number,
    action: "accepted" | "declined",
  ) => {
    setFriendNotice(null);
    setPendingActionId(requestId);

    try {
      const result = await respondToFriendRequest(requestId, action);
      setFriendNotice({
        kind: "success",
        message: result.message,
      });
      await refreshFriendData();
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de mettre à jour la demande",
      );
      if (message) {
        setFriendNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setPendingActionId(null);
    }
  };

  const handleFriendRemoval = async (friendId: number) => {
    setFriendNotice(null);
    setPendingRemovalFriendId(friendId);

    try {
      const result = await removeFriend(friendId);
      setFriendNotice({
        kind: "success",
        message: result.message,
      });
      await refreshFriendData();
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible de retirer cet ami",
      );
      if (message) {
        setFriendNotice({
          kind: "error",
          message,
        });
      }
    } finally {
      setPendingRemovalFriendId(null);
    }
  };

  const handleMessageSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedFriendId === null || messageInput.trim().length === 0) {
      return;
    }

    if (isSendingMessageRef.current) {
      return;
    }

    const rateLimitMessage = consumePrivateMessageRateLimit(
      privateMessageTimestampsRef.current,
    );

    if (rateLimitMessage) {
      setConversationError(rateLimitMessage);
      return;
    }

    isSendingMessageRef.current = true;
    setIsSendingMessage(true);

    try {
      await sendPrivateMessage(selectedFriendId, messageInput.trim());
      setMessageInput("");
      setConversationError(null);
      await Promise.all([
        refreshConversation(selectedFriendId),
        refreshFriendData(),
      ]);
    } catch (error) {
      setConversationError(
        getUserFacingErrorMessage(error, "Impossible d'envoyer le message"),
      );
    } finally {
      isSendingMessageRef.current = false;
      setIsSendingMessage(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10 md:px-10">
      <section className="grid w-full gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <FriendNetworkPanel
          currentUser={user}
          friendOverview={friendOverview}
          friendsError={friendsError}
          isFriendsLoading={isFriendsLoading}
          friendUsername={friendUsername}
          onFriendUsernameChange={setFriendUsername}
          onFriendSubmit={handleFriendSubmit}
          friendNotice={friendNotice}
          isSendingRequest={isSendingRequest}
          pendingActionId={pendingActionId}
          onFriendRequestAction={handleFriendRequestAction}
          pendingRemovalFriendId={pendingRemovalFriendId}
          onFriendRemoval={handleFriendRemoval}
          selectedFriendId={selectedFriendId}
          onSelectFriend={setSelectedFriendId}
          conversationSummariesByFriendId={conversationSummariesByFriendId}
          usernameMinLength={AUTH_USERNAME_MIN_LENGTH}
        />

        <PrivateMessagesPanel
          currentUserId={user.id}
          selectedFriend={selectedFriend}
          messages={messages}
          isConversationLoading={isConversationLoading}
          conversationError={conversationError}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          onMessageSubmit={handleMessageSubmit}
          isSendingMessage={isSendingMessage}
        />
      </section>
    </main>
  );
}

function consumePrivateMessageRateLimit(timestamps: number[]): string | null {
  const now = Date.now();
  const maxWindowMs = Math.max(
    ...PRIVATE_MESSAGE_RATE_LIMITS.map((rule) => rule.windowMs),
  );
  const retained = timestamps.filter(
    (timestamp) => now - timestamp < maxWindowMs,
  );

  for (const rule of PRIVATE_MESSAGE_RATE_LIMITS) {
    const hitsInWindow = retained.filter(
      (timestamp) => now - timestamp < rule.windowMs,
    );

    if (hitsInWindow.length >= rule.limit) {
      const retryAfterMs = Math.max(0, rule.windowMs - (now - hitsInWindow[0]));

      timestamps.splice(0, timestamps.length, ...retained);
      return `Vous avez envoye trop de messages. Reessayez dans ${Math.ceil(retryAfterMs / 1000)} secondes.`;
    }
  }

  retained.push(now);
  timestamps.splice(0, timestamps.length, ...retained);
  return null;
}

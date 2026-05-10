import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import FriendNetworkPanel, {
  type FriendNotice,
} from "../components/Friends/FriendNetworkPanel";
import PrivateMessagesPanel from "../components/Friends/PrivateMessagesPanel";
import PrimaryButton from "../components/ui/PrimaryButton";
import SecondaryButton from "../components/ui/SecondaryButton";
import { useAuthSession } from "../hooks/useAuthSession";
import { AUTH_USERNAME_MIN_LENGTH } from "../services/auth";
import {
  getConversationSummaries,
  getMyFriendOverview,
  getPrivateConversation,
  respondToFriendRequest,
  sendFriendRequest,
  sendPrivateMessage,
  type FriendOverview,
  type PrivateConversationSummary,
  type PrivateMessage,
} from "../services/users";

const FRIENDS_POLL_INTERVAL_MS = 12000;
const CONVERSATION_POLL_INTERVAL_MS = 5000;

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
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [conversationError, setConversationError] = useState<string | null>(
    null,
  );
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

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

  const refreshFriendData = async () => {
    const [overview, summaries] = await Promise.all([
      getMyFriendOverview(),
      getConversationSummaries(),
    ]);

    setFriendOverview(overview);
    setConversationSummaries(summaries);
    setFriendsError(null);
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

    const loadData = async () => {
      setIsFriendsLoading(true);

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
            error instanceof Error
              ? error.message
              : "Impossible de charger la page amis",
          );
        }
      } finally {
        if (!cancelled) {
          setIsFriendsLoading(false);
        }
      }
    };

    void loadData();

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

    const loadConversation = async () => {
      setIsConversationLoading(true);

      try {
        const conversation = await getPrivateConversation(selectedFriendId);

        if (!cancelled) {
          setMessages(conversation);
          setConversationError(null);
          void refreshFriendData().catch(() => {
            // The conversation remains usable even if the side summary refresh fails.
          });
        }
      } catch (error) {
        if (!cancelled) {
          setConversationError(
            error instanceof Error
              ? error.message
              : "Impossible de charger cette conversation",
          );
        }
      } finally {
        if (!cancelled) {
          setIsConversationLoading(false);
        }
      }
    };

    void loadConversation();

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
            Connecte-toi pour gerer ta liste d'amis et ouvrir des messages
            prives.
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
      setFriendNotice({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'ajouter cet ami",
      });
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
      setFriendNotice({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre a jour la demande",
      });
    } finally {
      setPendingActionId(null);
    }
  };

  const handleMessageSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedFriendId === null || messageInput.trim().length === 0) {
      return;
    }

    setIsSendingMessage(true);

    try {
      await sendPrivateMessage(selectedFriendId, messageInput.trim());
      setMessageInput("");
      await Promise.all([
        refreshConversation(selectedFriendId),
        refreshFriendData(),
      ]);
    } catch (error) {
      setConversationError(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer le message",
      );
    } finally {
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

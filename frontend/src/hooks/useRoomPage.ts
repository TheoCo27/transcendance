import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { RoomConfigForm } from "../components/room/room-types";
import { useToast } from "../components/ui/toast";
import {
  getUserFacingErrorMessage,
  getUserFacingServerMessage,
} from "../services/api";
import { getGameState, type GameState } from "../services/game";
import { getQuizzes, type Quiz } from "../services/quizzes";
import { getRoomById, updateRoom, type Room } from "../services/rooms";
import { getUserById } from "../services/users";
import {
  connectWs,
  disconnectWs,
  emitWs,
  offWs,
  onWs,
  type WsResponse,
} from "../services/ws";
import { useAuthSession } from "./useAuthSession";

type PublicQuestion = {
  id: number;
  text: string;
  options: string[];
};

type QuestionStartedPayload = {
  roomId: number;
  questionId: number;
  question: PublicQuestion;
  questionNumber: number;
  totalQuestions: number;
  durationMs: number | null;
  startsAt: string;
  endsAt: string | null;
};

type TimerPayload = {
  roomId: number;
  remainingMs: number;
};

type RoomLeftPayload = {
  roomId: number;
  userId: number;
};

type RoomClosedPayload = {
  roomId: number;
  reason: string;
};

type GameEndedPayload = {
  roomId: number;
  reason: string;
  winnerUserId: number | null;
  leaderboard: GameState["leaderboard"];
};

type ChatMessagePayload = {
  roomId: number;
  userId: number;
  content: string;
  sentAt: string;
};

type ChatHistoryPayload = {
  roomId: number;
  messages: ChatMessagePayload[];
};

const DEFAULT_FORM: RoomConfigForm = {
  name: "",
  quizId: null,
  gameType: "wordle",
  wordleWordLength: 5,
  wordleMaxAttempts: 6,
};

type UseRoomPageOptions = {
  roomIdParam?: string;
};

export function useRoomPage({ roomIdParam }: UseRoomPageOptions) {
  const roomId = Number(roomIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user, isLoading: isSessionLoading } = useAuthSession();

  const [room, setRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomConfigForm>(DEFAULT_FORM);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(
    null,
  );
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] =
    useState(false);
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [playerAvatars, setPlayerAvatars] = useState<
    Record<number, string | null>
  >({});
  const [chatMessages, setChatMessages] = useState<ChatMessagePayload[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [roomClosedReason, setRoomClosedReason] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isRoomLinkCopied, setIsRoomLinkCopied] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const roomLinkCopiedTimeoutRef = useRef<number | null>(null);
  const previousUserIdRef = useRef<number | null>(null);
  const requestedChatHistoryKeyRef = useRef<string | null>(null);
  const cameFromWordleResult = Boolean(
    location.state &&
    typeof location.state === "object" &&
    (location.state as { fromWordleResult?: boolean }).fromWordleResult,
  );
  const cameFromWordleTimeout = Boolean(
    location.state &&
    typeof location.state === "object" &&
    (location.state as { fromWordleTimeout?: boolean }).fromWordleTimeout,
  );
  const requestedQuizSelectionId = useMemo(() => {
    const rawQuizId = new URLSearchParams(location.search).get("selectQuizId");
    const parsedQuizId = Number(rawQuizId);

    if (!Number.isInteger(parsedQuizId) || parsedQuizId <= 0) {
      return null;
    }

    return parsedQuizId;
  }, [location.search]);

  const refreshRoom = useCallback(async () => {
    if (!Number.isFinite(roomId) || roomId <= 0) {
      return;
    }

    setPageError(null);

    try {
      const fetchedRoom = await getRoomById(roomId);
      setRoom(fetchedRoom);
      setForm(buildFormFromRoom(fetchedRoom));
      setRoomClosedReason(null);
      setGameState(await getGameState(roomId));
    } catch (error) {
      setPageError(
        getUserFacingErrorMessage(
          error,
          "Impossible de rafraichir cette room.",
        ),
      );
    }
  }, [roomId]);

  useEffect(() => {
    const loadRoomPage = async () => {
      if (!Number.isFinite(roomId) || roomId <= 0) {
        setPageError("URL de room invalide.");
        setIsLoadingPage(false);
        return;
      }

      setIsLoadingPage(true);
      setPageError(null);
      setRoomActionError(null);
      setRoomClosedReason(null);

      try {
        const [fetchedRoom, fetchedGameState] = await Promise.all([
          getRoomById(roomId),
          getGameState(roomId),
        ]);

        setRoom(fetchedRoom);
        setForm(buildFormFromRoom(fetchedRoom));
        setGameState(fetchedGameState);
      } catch (error) {
        const message = getUserFacingErrorMessage(
          error,
          "Impossible de charger cette room.",
        );
        setPageError(message);
      } finally {
        setIsLoadingPage(false);
      }
    };

    void loadRoomPage();
  }, [roomId]);

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }

    if (user) {
      void connectWs().catch(() => {
        // Action-level flows already surface feedback.
      });
      return;
    }

    disconnectWs();
  }, [isSessionLoading, user]);

  useEffect(() => {
    if (isSessionLoading || !Number.isFinite(roomId) || roomId <= 0) {
      return;
    }

    const previousUserId = previousUserIdRef.current;
    const currentUserId = user?.id ?? null;
    previousUserIdRef.current = currentUserId;

    if (previousUserId !== null && currentUserId === null) {
      navigate("/", { replace: true });
      return;
    }

    void refreshRoom();
  }, [isSessionLoading, navigate, refreshRoom, roomId, user?.id]);

  useEffect(() => {
    if (
      room?.status === "playing" &&
      Number.isFinite(roomId) &&
      roomId > 0 &&
      !cameFromWordleResult &&
      !cameFromWordleTimeout
    ) {
      if (isSessionLoading) return;
      if (!user) {
        setPageError("Vous devez être connecté pour accéder à une partie en cours.");
        return;
      }
      
      const isUserInRoom = room.players.some((player) => player.userId === user.id);
      if (!isUserInRoom) {
        setPageError("La partie a déjà commencé. Les nouveaux joueurs ne peuvent plus la rejoindre.");
        return;
      }

      navigate(`/games/${roomId}`);
    }
  }, [
    cameFromWordleResult,
    cameFromWordleTimeout,
    isSessionLoading,
    navigate,
    room?.players,
    room?.status,
    roomId,
    user,
  ]);

  useEffect(() => {
    if (!Number.isFinite(roomId) || roomId <= 0) {
      return;
    }

    const handleRoomJoined = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setRoom(response.data);
      setForm(buildFormFromRoom(response.data));
      setRoomActionError(null);
      setRoomClosedReason(null);
      void refreshRoom();
    };

    const handleRoomState = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setRoom(response.data);
      setForm(buildFormFromRoom(response.data));
      setRoomActionError(null);
      setRoomClosedReason(null);
      void refreshRoom();
    };

    const handleRoomStarted = (response: WsResponse<Room>) => {
      if (!response.success || !response.data || response.data.id !== roomId) {
        return;
      }

      setIsStarting(false);
      setRoom(response.data);
      setForm(buildFormFromRoom(response.data));
      setRoomActionError(null);
    };

    const handleRoomLeft = (response: WsResponse<RoomLeftPayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      if (user && response.data.userId === user.id) {
        setIsLeaving(false);
        navigate("/");
        return;
      }

      void refreshRoom();
    };

    const handleRoomClosed = (response: WsResponse<RoomClosedPayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      setIsDeletingRoom(false);
      setIsLeaving(false);
      setIsStarting(false);

      if (
        response.data.reason === "deleted_by_owner" &&
        user &&
        room?.ownerUserId === user.id
      ) {
        toast.success("La room a bien été supprimée.");
        navigate("/");
        return;
      }

      setRoom(null);
      setGameState(null);
      setCurrentQuestion(null);
      setRemainingMs(null);
      setSelectedAnswer(null);
      setHasAnsweredCurrentQuestion(false);
      requestedChatHistoryKeyRef.current = null;
      setChatMessages([]);
      setChatInput("");
      setChatError(null);
      setRoomClosedReason(getRoomClosedReasonMessage(response.data.reason));
    };

    const handleQuestionStarted = (
      response: WsResponse<QuestionStartedPayload>,
    ) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      setCurrentQuestion(response.data.question);
      setSelectedAnswer(null);
      setHasAnsweredCurrentQuestion(false);
      setRemainingMs(response.data.durationMs);
    };

    const handleTimer = (response: WsResponse<TimerPayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      setRemainingMs(response.data.remainingMs);
    };

    const handleGameState = (response: WsResponse<GameState>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      setGameState(response.data);
    };

    const handleGameEnded = (response: WsResponse<GameEndedPayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      const gameEndedData = response.data;

      setCurrentQuestion(null);
      setRemainingMs(null);
      setHasAnsweredCurrentQuestion(false);
      setSelectedAnswer(null);
      setGameState((currentState) =>
        currentState
          ? {
              ...currentState,
              status: "finished",
              leaderboard: gameEndedData.leaderboard,
              winnerUserId: gameEndedData.winnerUserId,
            }
          : currentState,
      );
      void refreshRoom();
    };

    const handleChatHistory = (response: WsResponse<ChatHistoryPayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      const historyKey = `${response.data.roomId}:${user?.id ?? "guest"}`;
      requestedChatHistoryKeyRef.current = historyKey;
      setChatMessages(response.data.messages);
    };

    const handleChatMessage = (response: WsResponse<ChatMessagePayload>) => {
      if (
        !response.success ||
        !response.data ||
        response.data.roomId !== roomId
      ) {
        return;
      }

      const message = response.data;
      setChatMessages((currentMessages) => [...currentMessages, message]);
      setChatError(null);
    };

    const handleChatError = (response: WsResponse<never>) => {
      if (response.success) {
        return;
      }

      setChatError(
        getUserFacingServerMessage(
          response.error?.message,
          "Envoi du message impossible.",
        ),
      );
    };

    const handleRoomError = (response: WsResponse<never>) => {
      if (response.success) {
        return;
      }

      setIsStarting(false);
      setIsLeaving(false);
      setIsDeletingRoom(false);
      setRoomActionError(
        getUserFacingServerMessage(
          response.error?.message,
          "Action room impossible.",
        ),
      );
    };

    onWs("room:joined", handleRoomJoined);
    onWs("room:state", handleRoomState);
    onWs("room:left", handleRoomLeft);
    onWs("room:started", handleRoomStarted);
    onWs("room:closed", handleRoomClosed);
    onWs("room:join:error", handleRoomError);
    onWs("room:start:error", handleRoomError);
    onWs("room:leave:error", handleRoomError);
    onWs("room:delete:error", handleRoomError);
    onWs("game:answer:error", handleRoomError);
    onWs("chat:history", handleChatHistory);
    onWs("chat:message", handleChatMessage);
    onWs("chat:message:error", handleChatError);
    onWs("game:question:started", handleQuestionStarted);
    onWs("game:timer", handleTimer);
    onWs("game:state", handleGameState);
    onWs("game:ended", handleGameEnded);

    return () => {
      offWs("room:joined", handleRoomJoined);
      offWs("room:state", handleRoomState);
      offWs("room:left", handleRoomLeft);
      offWs("room:started", handleRoomStarted);
      offWs("room:closed", handleRoomClosed);
      offWs("room:join:error", handleRoomError);
      offWs("room:start:error", handleRoomError);
      offWs("room:leave:error", handleRoomError);
      offWs("room:delete:error", handleRoomError);
      offWs("game:answer:error", handleRoomError);
      offWs("chat:history", handleChatHistory);
      offWs("chat:message", handleChatMessage);
      offWs("chat:message:error", handleChatError);
      offWs("game:question:started", handleQuestionStarted);
      offWs("game:timer", handleTimer);
      offWs("game:state", handleGameState);
      offWs("game:ended", handleGameEnded);
    };
  }, [navigate, refreshRoom, room?.ownerUserId, roomId, toast, user]);

  useEffect(() => {
    if (
      !user ||
      !room ||
      !room.players.some((player) => player.userId === user.id)
    ) {
      return;
    }

    const requestKey = `${room.id}:${user.id}`;
    if (requestedChatHistoryKeyRef.current === requestKey) {
      return;
    }

    requestedChatHistoryKeyRef.current = requestKey;

    void connectWs()
      .then(() => {
        emitWs("chat:history:request", {
          roomId: room.id,
          userId: user.id,
        });
      })
      .catch(() => {
        requestedChatHistoryKeyRef.current = null;
      });
  }, [room, user]);

  useEffect(() => {
    const userIds = new Set<number>();

    room?.players.forEach((player) => userIds.add(player.userId));
    gameState?.leaderboard.forEach((entry) => userIds.add(entry.userId));
    chatMessages.forEach((message) => userIds.add(message.userId));

    if (userIds.size === 0) {
      return;
    }

    const loadPlayerProfiles = async () => {
      const nextEntries = await Promise.all(
        [...userIds].map(async (userId) => {
          try {
            const fetchedUser = await getUserById(userId);
            return {
              userId,
              username: fetchedUser.username,
              avatarUrl: fetchedUser.avatar_url,
            };
          } catch {
            return {
              userId,
              username: `Joueur #${userId}`,
              avatarUrl: null,
            };
          }
        }),
      );

      setPlayerNames((currentNames) => ({
        ...currentNames,
        ...Object.fromEntries(
          nextEntries.map((entry) => [entry.userId, entry.username]),
        ),
      }));

      setPlayerAvatars((currentAvatars) => ({
        ...currentAvatars,
        ...Object.fromEntries(
          nextEntries.map((entry) => [entry.userId, entry.avatarUrl]),
        ),
      }));
    };

    void loadPlayerProfiles();
  }, [chatMessages, gameState, room]);

  useEffect(() => {
    if (
      !user ||
      !room ||
      room.ownerUserId !== user.id ||
      room.status !== "waiting"
    ) {
      return;
    }

    let isCancelled = false;
    setIsLoadingQuizzes(true);

    void getQuizzes()
      .then((quizzes) => {
        if (isCancelled) {
          return;
        }

        setAvailableQuizzes(quizzes);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setAvailableQuizzes([]);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingQuizzes(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [room, user]);

  useEffect(() => {
    if (
      requestedQuizSelectionId === null ||
      !user ||
      !room ||
      room.ownerUserId !== user.id ||
      room.status !== "waiting" ||
      availableQuizzes.length === 0
    ) {
      return;
    }

    const quizExists = availableQuizzes.some(
      (quiz) => quiz.id === requestedQuizSelectionId,
    );

    if (!quizExists) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      gameType: "quiz",
      quizId: requestedQuizSelectionId,
    }));

    navigate(
      { pathname: location.pathname },
      { replace: true, state: location.state },
    );
    toast.success("Le nouveau quiz est prêt à être sélectionné.");
  }, [
    availableQuizzes,
    location.pathname,
    location.state,
    navigate,
    requestedQuizSelectionId,
    room,
    toast,
    user,
  ]);

  useEffect(() => {
    if (!gameState?.questionEndsAt) {
      return;
    }

    const updateTimer = () => {
      const nextRemainingMs =
        new Date(gameState.questionEndsAt as string).getTime() - Date.now();
      setRemainingMs(Math.max(0, nextRemainingMs));
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [gameState?.questionEndsAt]);

  useEffect(
    () => () => {
      if (roomLinkCopiedTimeoutRef.current !== null) {
        window.clearTimeout(roomLinkCopiedTimeoutRef.current);
      }
    },
    [],
  );

  const isUserInRoom = Boolean(
    user && room?.players.some((player) => player.userId === user.id),
  );

  const saveCurrentForm = useCallback(async () => {
    if (!room) return null;

    const nextConfig =
      form.gameType === "wordle"
        ? {
            wordLength: form.wordleWordLength,
            maxAttempts: form.wordleMaxAttempts,
          }
        : undefined;

    const updatedRoom = await updateRoom(room.id, {
      name: form.name.trim(),
      quizId: form.quizId,
      gameType: form.gameType,
      gameConfig: nextConfig,
    });

    setRoom(updatedRoom);
    setForm(buildFormFromRoom(updatedRoom));
    return updatedRoom;
  }, [form, room]);

  const handleSave = useCallback(async () => {
    if (!room) {
      return;
    }

    setIsSaving(true);
    setPageError(null);

    try {
      await saveCurrentForm();
      toast.success("Configuration enregistrée avec succès.");
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Impossible d'enregistrer la configuration",
      );
      setPageError(message);
      if (message) {
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  }, [room, saveCurrentForm, toast]);

  const joinRoom = useCallback(async () => {
    if (!user || !room) {
      navigate("/login");
      return;
    }

    try {
      setRoomActionError(null);
      await connectWs();
      emitWs("room:join", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
      setRoomActionError(
        getUserFacingErrorMessage(
          error,
          "Connexion temps reel impossible pour rejoindre la room.",
        ),
      );
    }
  }, [navigate, room, user]);

  const leaveRoom = useCallback(async () => {
    if (!user || !room || !isUserInRoom) {
      return;
    }

    try {
      setIsLeaving(true);
      setRoomActionError(null);
      await connectWs();
      emitWs("room:leave", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
      setIsLeaving(false);
      setRoomActionError(
        getUserFacingErrorMessage(
          error,
          "Connexion temps reel impossible pour quitter la room.",
        ),
      );
    }
  }, [isUserInRoom, room, user]);

  const deleteRoom = useCallback(async () => {
    if (!user || !room || room.ownerUserId !== user.id) {
      return;
    }

    try {
      setIsDeletingRoom(true);
      setRoomActionError(null);
      await connectWs();
      emitWs("room:delete", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
      setIsDeletingRoom(false);
      setRoomActionError(
        getUserFacingErrorMessage(
          error,
          "Connexion temps reel impossible pour supprimer la room.",
        ),
      );
    }
  }, [room, user]);

  const startRoom = useCallback(async () => {
    if (!user || !room || !isUserInRoom) {
      return;
    }

    try {
      setIsStarting(true);
      setRoomActionError(null);

      if (room.ownerUserId === user.id && room.status === "waiting") {
        const persistedForm = buildFormFromRoom(room);
        const hasUnsavedChanges =
          persistedForm.name.trim() !== form.name.trim() ||
          persistedForm.gameType !== form.gameType ||
          persistedForm.quizId !== form.quizId ||
          persistedForm.wordleWordLength !== form.wordleWordLength ||
          persistedForm.wordleMaxAttempts !== form.wordleMaxAttempts;

        if (hasUnsavedChanges) {
          setIsSaving(true);
          setPageError(null);
          try {
            await saveCurrentForm();
          } finally {
            setIsSaving(false);
          }
        }
      }

      await connectWs();
      emitWs("room:start", {
        roomId: room.id,
        userId: user.id,
      });
    } catch (error) {
      setIsStarting(false);
      setRoomActionError(
        getUserFacingErrorMessage(
          error,
          "Connexion temps reel impossible pour lancer la room.",
        ),
      );
    }
  }, [form, isUserInRoom, room, saveCurrentForm, user]);

  const submitAnswer = useCallback(async () => {
    if (
      !user ||
      !room ||
      !currentQuestion ||
      selectedAnswer === null ||
      !isUserInRoom
    ) {
      return;
    }

    try {
      setRoomActionError(null);
      await connectWs();
      emitWs("game:answer", {
        roomId: room.id,
        userId: user.id,
        questionId: currentQuestion.id,
        answerIndex: selectedAnswer,
      });
      setHasAnsweredCurrentQuestion(true);
    } catch (error) {
      setRoomActionError(
        getUserFacingErrorMessage(
          error,
          "Connexion temps reel impossible pour envoyer la reponse.",
        ),
      );
    }
  }, [currentQuestion, isUserInRoom, room, selectedAnswer, user]);

  const sendChatMessage = useCallback(async () => {
    if (!user || !room || !isUserInRoom || chatInput.trim().length === 0) {
      return;
    }

    try {
      setChatError(null);
      await connectWs();
      emitWs("chat:message", {
        roomId: room.id,
        userId: user.id,
        content: chatInput.trim(),
      });
      setChatInput("");
    } catch (error) {
      setChatError(
        getUserFacingErrorMessage(
          error,
          "Connexion temps reel impossible pour envoyer le message.",
        ),
      );
    }
  }, [chatInput, isUserInRoom, room, user]);

  const copyRoomLink = useCallback(async () => {
    if (!room) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/rooms/${room.id}`,
      );
      setIsRoomLinkCopied(true);
      if (roomLinkCopiedTimeoutRef.current !== null) {
        window.clearTimeout(roomLinkCopiedTimeoutRef.current);
      }
      roomLinkCopiedTimeoutRef.current = window.setTimeout(() => {
        setIsRoomLinkCopied(false);
      }, 1800);
    } catch {
      toast.error("Impossible de copier le lien de la room.");
    }
  }, [room, toast]);

  return {
    room,
    form,
    setForm,
    gameState,
    currentQuestion,
    remainingMs,
    selectedAnswer,
    setSelectedAnswer,
    hasAnsweredCurrentQuestion,
    playerNames,
    playerAvatars,
    chatMessages,
    chatInput,
    setChatInput,
    chatError,
    pageError,
    roomActionError,
    roomClosedReason,
    isLoadingPage,
    isSaving,
    isStarting,
    isLeaving,
    isDeletingRoom,
    isRoomLinkCopied,
    availableQuizzes,
    isLoadingQuizzes,
    user,
    isSessionLoading,
    refreshRoom,
    handleSave,
    joinRoom,
    leaveRoom,
    deleteRoom,
    startRoom,
    submitAnswer,
    sendChatMessage,
    copyRoomLink,
  };
}

function getRoomClosedReasonMessage(reason: string): string {
  if (reason === "deleted_by_owner") {
    return "Le proprietaire a supprime cette room.";
  }

  if (reason === "room_empty") {
    return "Cette room etait vide et a ete supprimee automatiquement.";
  }

  return "Cette room n'est plus active. Reviens a l'accueil pour en ouvrir une nouvelle.";
}

function buildFormFromRoom(room: Room): RoomConfigForm {
  const gameType =
    room.gameType === "quiz"
      ? "quiz"
      : room.gameType === "wordle"
        ? "wordle"
        : room.quizId
          ? "quiz"
          : "wordle";
  const config =
    room.gameConfig && typeof room.gameConfig === "object"
      ? room.gameConfig
      : {};

  const wordLengthRaw = (config as { wordLength?: unknown }).wordLength;
  const maxAttemptsRaw = (config as { maxAttempts?: unknown }).maxAttempts;

  const wordleWordLength =
    typeof wordLengthRaw === "number" && Number.isInteger(wordLengthRaw)
      ? wordLengthRaw
      : 5;
  const wordleMaxAttempts =
    typeof maxAttemptsRaw === "number" && Number.isInteger(maxAttemptsRaw)
      ? maxAttemptsRaw
      : 6;

  return {
    name: room.name,
    quizId: room.quizId,
    gameType,
    wordleWordLength,
    wordleMaxAttempts,
  };
}

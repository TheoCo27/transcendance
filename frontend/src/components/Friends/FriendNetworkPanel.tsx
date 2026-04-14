import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import type { SafeUser } from "../../services/auth";
import type {
  FriendOverview,
  PrivateConversationSummary,
} from "../../services/users";
import Avatar from "../Avatar";
import PrimaryButton from "../PrimaryButton";
import SecondaryButton from "../SecondaryButton";

export type FriendNotice = {
  kind: "success" | "error";
  message: string;
};

type FriendNetworkPanelProps = {
  currentUser: SafeUser;
  friendOverview: FriendOverview | null;
  friendsError: string | null;
  isFriendsLoading: boolean;
  friendUsername: string;
  onFriendUsernameChange: (value: string) => void;
  onFriendSubmit: (event: FormEvent<HTMLFormElement>) => void;
  friendNotice: FriendNotice | null;
  isSendingRequest: boolean;
  pendingActionId: number | null;
  onFriendRequestAction: (
    requestId: number,
    action: "accepted" | "declined",
  ) => void;
  selectedFriendId: number | null;
  onSelectFriend: (friendId: number) => void;
  conversationSummariesByFriendId: Record<number, PrivateConversationSummary>;
  usernameMinLength: number;
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatStatus(status: "online" | "offline") {
  return status === "online" ? "En ligne" : "Hors ligne";
}

export default function FriendNetworkPanel({
  currentUser,
  friendOverview,
  friendsError,
  isFriendsLoading,
  friendUsername,
  onFriendUsernameChange,
  onFriendSubmit,
  friendNotice,
  isSendingRequest,
  pendingActionId,
  onFriendRequestAction,
  selectedFriendId,
  onSelectFriend,
  conversationSummariesByFriendId,
  usernameMinLength,
}: FriendNetworkPanelProps) {
  return (
    <section className="rounded-[2rem] bg-slate-100/80 p-6">
      {currentUser.isGuest ? (
        <div className="mt-8 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-950">
          <p className="text-sm font-semibold">Compte invite detecte</p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-amber-900/85">
            Les amis et les messages prives sont reserves aux comptes classiques
            pour conserver ton reseau d'une session a l'autre.
          </p>
          <div className="mt-4">
            <Link to="/register">
              <PrimaryButton>Creer un compte classique</PrimaryButton>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-[1.5rem] bg-slate-950 px-5 py-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">Liste d'amis</h3>
                <p className="mt-2 text-sm leading-7 text-white/70">
                  Ouvre une conversation privee ou consulte l'activite recente.
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
                {friendOverview?.friends.length ?? 0} contact
                {(friendOverview?.friends.length ?? 0) > 1 ? "s" : ""}
              </span>
            </div>

            {friendsError ? (
              <div className="mt-5 rounded-[1.5rem] bg-rose-500/15 px-5 py-4 text-sm text-rose-100">
                {friendsError}
              </div>
            ) : null}

            {isFriendsLoading && !friendOverview ? (
              <div className="mt-5 rounded-[1.5rem] bg-white/10 px-5 py-5 text-sm text-white/75">
                Chargement de ta liste d'amis...
              </div>
            ) : null}

            {!friendsError &&
            !isFriendsLoading &&
            (friendOverview?.friends.length ?? 0) === 0 ? (
              <div className="mt-5 rounded-[1.5rem] bg-white/10 px-5 py-5 text-sm leading-7 text-white/75">
                Aucun ami pour l'instant. Commence par rechercher un joueur avec
                son pseudo.
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {friendOverview?.friends.map((friend) => {
                const summary = conversationSummariesByFriendId[friend.id];
                const isSelected = selectedFriendId === friend.id;

                return (
                  <button
                    key={friend.id}
                    className={`w-full rounded-[1.5rem] border px-5 py-4 text-left transition ${
                      isSelected
                        ? "border-white/35 bg-white/16"
                        : "border-white/10 bg-white/8 hover:bg-white/12"
                    }`}
                    type="button"
                    onClick={() => onSelectFriend(friend.id)}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar
                          alt={`Photo de profil de ${friend.username}`}
                          avatarUrl={friend.avatar_url}
                          className="h-12 w-12"
                          fallbackClassName="text-lg"
                          username={friend.username}
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-white">
                              {friend.username}
                            </p>
                            {summary?.unreadCount ? (
                              <span className="rounded-full bg-amber-300 px-2.5 py-1 text-xs font-semibold text-slate-950">
                                {summary.unreadCount} nouveau
                                {summary.unreadCount > 1 ? "x" : ""}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-white/65">
                            {formatStatus(friend.status)} • inscrit le{" "}
                            {formatDate(friend.createdAt)}
                          </p>
                          <p className="mt-2 text-sm text-white/70">
                            {summary?.lastMessagePreview ??
                              "Aucun message prive echange pour le moment."}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <span
                          className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-medium ${
                            friend.status === "online"
                              ? "bg-emerald-400/15 text-emerald-200"
                              : "bg-white/10 text-white/75"
                          }`}
                        >
                          {formatStatus(friend.status)}
                        </span>
                        <span className="text-sm text-white/65">
                          {summary?.lastMessageAt
                            ? `Dernier message le ${formatDate(summary.lastMessageAt)}`
                            : "Conversation vide"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form
            className="mt-5 rounded-[1.75rem] bg-white px-5 py-5"
            aria-busy={isSendingRequest}
            onSubmit={(event) => void onFriendSubmit(event)}
          >
            <h3 className="text-xl font-semibold text-slate-950">Ajouter un ami</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Saisis un pseudo exact. Si ce joueur t'a deja envoye une demande,
              elle sera acceptee automatiquement.
            </p>
            <label
              className="mb-2 mt-5 block text-sm font-medium text-slate-600"
              htmlFor="friend-username"
            >
              Pseudo du joueur
            </label>
            <input
              className="w-full rounded-[1.25rem] border border-slate-900/10 bg-slate-50 px-4 py-3 text-slate-950 outline-none placeholder:text-slate-400"
              id="friend-username"
              type="text"
              placeholder="Exemple: theo42"
              value={friendUsername}
              onChange={(event) => onFriendUsernameChange(event.target.value)}
              disabled={isSendingRequest}
              minLength={usernameMinLength}
              required
            />
            <PrimaryButton
              className="mt-4 w-full justify-center"
              disabled={isSendingRequest}
              type="submit"
            >
              {isSendingRequest ? "Envoi..." : "Ajouter par pseudo"}
            </PrimaryButton>

            {friendNotice ? (
              <p
                className={`mt-4 rounded-[1.25rem] px-4 py-3 text-sm ${
                  friendNotice.kind === "success"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-rose-50 text-rose-700"
                }`}
                role="alert"
              >
                {friendNotice.message}
              </p>
            ) : null}
          </form>

          <div className="mt-5 rounded-[1.5rem] bg-white px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Demandes recues
              </h4>
              {isFriendsLoading ? (
                <span className="text-xs text-slate-500">Chargement...</span>
              ) : null}
            </div>

            {friendsError ? (
              <p className="mt-4 text-sm text-rose-700">{friendsError}</p>
            ) : null}

            {!friendsError &&
            !isFriendsLoading &&
            (friendOverview?.receivedRequests.length ?? 0) === 0 ? (
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Aucune demande en attente pour le moment.
              </p>
            ) : null}

            <div className="mt-4 space-y-3">
              {friendOverview?.receivedRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-[1.25rem] border border-slate-900/10 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-950">
                        {request.user.username}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Recue le {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <PrimaryButton
                        className="justify-center px-5 py-2.5"
                        disabled={pendingActionId === request.id}
                        onClick={() =>
                          void onFriendRequestAction(request.id, "accepted")
                        }
                      >
                        {pendingActionId === request.id ? "Traitement..." : "Accepter"}
                      </PrimaryButton>
                      <SecondaryButton
                        className="px-5 py-2.5"
                        disabled={pendingActionId === request.id}
                        onClick={() =>
                          void onFriendRequestAction(request.id, "declined")
                        }
                      >
                        Refuser
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] bg-white px-5 py-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Demandes envoyees
            </h4>

            {!isFriendsLoading && (friendOverview?.sentRequests.length ?? 0) === 0 ? (
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Aucune demande envoyee en attente.
              </p>
            ) : null}

            <div className="mt-4 space-y-3">
              {friendOverview?.sentRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-[1.25rem] border border-slate-900/10 bg-slate-50 px-4 py-4"
                >
                  <p className="text-base font-semibold text-slate-950">
                    {request.user.username}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    En attente depuis le {formatDate(request.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "../services/notifications";

const NOTIFICATIONS_LIMIT = 8;
const REFRESH_INTERVAL_MS = 30_000;

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const refreshNotifications = async (preserveOpenState = false) => {
    if (!preserveOpenState) {
      setIsLoading(true);
    }

    try {
      const [nextNotifications, nextUnreadCount] = await Promise.all([
        listNotifications({ limit: NOTIFICATIONS_LIMIT }),
        getUnreadNotificationCount(),
      ]);

      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshNotifications();

    const intervalId = window.setInterval(() => {
      void refreshNotifications(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextOpenState = !isOpen;
    setIsOpen(nextOpenState);

    if (nextOpenState) {
      void refreshNotifications(true);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const updatedNotification = await markNotificationAsRead(notificationId);

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === notificationId ? updatedNotification : notification,
        ),
      );
      setUnreadCount((currentUnreadCount) => Math.max(currentUnreadCount - 1, 0));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de marquer la notification comme lue.",
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de marquer toutes les notifications comme lues.",
      );
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="relative inline-flex items-center rounded-full border border-slate-900/10 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
        onClick={handleToggle}
        type="button"
      >
        Alertes
        {unreadCount > 0 ? (
          <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-slate-950">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(92vw,26rem)] rounded-[1.75rem] border border-slate-900/10 bg-white p-5 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Notifications
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Boite de reception
              </h3>
            </div>

            <button
              className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
              disabled={unreadCount === 0}
              onClick={() => {
                void handleMarkAllAsRead();
              }}
              type="button"
            >
              Tout lire
            </button>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="mt-5 text-sm text-slate-500">Chargement des notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="mt-5 rounded-[1.25rem] bg-slate-100 px-4 py-4 text-sm text-slate-600">
              Aucune notification pour le moment.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {notifications.map((notification) => (
                <article
                  className={[
                    "rounded-[1.35rem] border px-4 py-4 transition",
                    notification.isRead
                      ? "border-slate-900/8 bg-slate-50"
                      : "border-amber-300/40 bg-amber-50/70",
                  ].join(" ")}
                  key={notification.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">
                        {notification.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {notification.message}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {formatTimestamp(notification.createdAt)}
                      </p>
                    </div>

                    {!notification.isRead ? (
                      <button
                        className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
                        onClick={() => {
                          void handleMarkAsRead(notification.id);
                        }}
                        type="button"
                      >
                        Lu
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

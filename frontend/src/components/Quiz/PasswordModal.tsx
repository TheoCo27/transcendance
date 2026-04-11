import { useEffect, useRef } from "react";
import Card from "../Card";
import PrimaryButton from "../PrimaryButton";

type PasswordModalProps = {
  isOpen: boolean;
  roomName: string | null;
  password: string;
  joinError: string | null;
  isJoining: boolean;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function PasswordModal({
  isOpen,
  roomName,
  password,
  joinError,
  isJoining,
  onPasswordChange,
  onClose,
  onConfirm,
}: PasswordModalProps) {
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    passwordInputRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !roomName) {
    return null;
  }

  return (
    <div
      aria-labelledby="private-room-title"
      aria-modal="true"
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 px-[10%] py-6"
      role="dialog"
    >
      <Card className="max-w-xl px-8 py-6">
        <p className="mb-3 text-2xl font-semibold text-text" id="private-room-title">
          Rejoindre une room privée
        </p>
        <p className="mb-4 text-sm text-text/70">{roomName}</p>
        <form
          aria-busy={isJoining}
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm();
          }}
        >
          <label
            className="mb-2 block text-sm font-medium text-text/70"
            htmlFor="private-room-password"
          >
            Mot de passe
          </label>
          <input
            aria-invalid={joinError ? "true" : "false"}
            className="mb-4 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
            id="private-room-password"
            placeholder="Mot de passe"
            ref={passwordInputRef}
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
          {joinError ? (
            <p className="mb-4 text-sm text-red-300" role="alert">
              {joinError}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-3">
            <button
              className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
              type="button"
              onClick={onClose}
            >
              Annuler
            </button>
            <PrimaryButton className="px-4 py-2 text-sm" disabled={isJoining} type="submit">
              {isJoining ? "Connexion..." : "Rejoindre"}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}

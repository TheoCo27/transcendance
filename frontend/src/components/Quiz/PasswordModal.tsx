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
  if (!isOpen || !roomName) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 px-[10%] py-6">
      <Card className="px-8 py-6">
        <p className="mb-3 text-2xl font-semibold text-text">
          Rejoindre une room privée
        </p>
        <p className="mb-4 text-sm text-text/70">{roomName}</p>
        <input
          className="mb-4 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-text outline-none placeholder:text-text/40"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        {joinError ? (
          <p className="mb-4 text-sm text-red-300">{joinError}</p>
        ) : null}
        <div className="flex items-center justify-end gap-3">
          <button
            className="rounded-md border border-white/10 bg-background px-4 py-2 text-sm font-semibold text-text"
            type="button"
            onClick={onClose}
          >
            Annuler
          </button>
          <PrimaryButton className="px-4 py-2 text-sm" onClick={onConfirm}>
            {isJoining ? "Connexion..." : "Rejoindre"}
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}

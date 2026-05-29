type AvatarProps = {
  username: string;
  avatarUrl: string | null;
  className?: string;
  fallbackClassName?: string;
  alt?: string;
};

export default function Avatar({
  username,
  avatarUrl,
  className = "",
  fallbackClassName = "",
  alt,
}: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        alt={alt ?? `Photo de profil de ${username}`}
        className={`rounded-full object-cover ${className}`.trim()}
        src={avatarUrl}
      />
    );
  }

  return (
    <div
      className={[
        "inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#f97316,#f59e0b)] font-semibold text-white",
        className,
        fallbackClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {username.slice(0, 1).toUpperCase()}
    </div>
  );
}

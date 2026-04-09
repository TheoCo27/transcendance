type ButtonProps = {
  children: string;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
};

export default function PrimaryButton({
  children,
  className = "",
  onClick,
  type = "button",
}: ButtonProps) {
  return (
    <button
      className={`rounded-md bg-primary font-semibold text-text transition hover:bg-primary/85 ${className}`}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

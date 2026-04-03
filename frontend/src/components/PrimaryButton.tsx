type ButtonProps = {
  children: string;
  className?: string;
  onClick?: () => void;
};

export default function PrimaryButton({
  children,
  className = "",
  onClick,
}: ButtonProps) {
  return (
    <button
      className={`rounded-md bg-primary font-semibold text-text ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

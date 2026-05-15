import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function PrimaryButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 bg-primary font-semibold text-text transition hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

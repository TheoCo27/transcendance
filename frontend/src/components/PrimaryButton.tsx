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
      className={[
        "inline-flex items-center gap-2 rounded-full border border-slate-900/5",
        "bg-[linear-gradient(135deg,#f97316,#f59e0b)] px-6 py-3 text-sm font-semibold",
        "text-white shadow-[0_18px_50px_rgba(249,115,22,0.28)] transition",
        "hover:-translate-y-0.5 hover:shadow-[0_24px_65px_rgba(249,115,22,0.34)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

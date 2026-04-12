import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function SecondaryButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "rounded-full border border-slate-800/15 bg-white/75 px-5 py-3",
        "font-semibold text-slate-900 transition hover:border-slate-900/30 hover:bg-white",
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

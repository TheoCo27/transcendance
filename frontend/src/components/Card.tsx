import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={[
        "flex w-full max-w-2xl flex-col rounded-[2rem] border border-slate-900/10",
        "bg-white/84 shadow-[0_32px_90px_rgba(15,23,42,0.08)] backdrop-blur",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

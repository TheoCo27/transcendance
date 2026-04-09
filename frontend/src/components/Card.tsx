import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`flex w-full max-w-[50%] flex-col rounded-2xl border border-white/10 bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

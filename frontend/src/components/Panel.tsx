import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export default function Panel({ children, className = "" }: PanelProps) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/10 bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

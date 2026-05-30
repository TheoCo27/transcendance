import { HTMLAttributes } from "react";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  className?: string;
}

export default function Section({
  className = "",
  ...props
}: SectionProps) {
  return (
    <section
      className={[
        "rounded-4xl border border-white/10 bg-surface p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

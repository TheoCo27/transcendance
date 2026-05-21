import { HTMLAttributes } from "react";

interface RoomSectionProps extends HTMLAttributes<HTMLElement> {
  className?: string;
}

export default function RoomSection({
  className = "",
  ...props
}: RoomSectionProps) {
  return (
    <section
      className={`rounded-4xl border border-white/10 bg-surface p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)] ${className}`}
      {...props}
    />
  );
}

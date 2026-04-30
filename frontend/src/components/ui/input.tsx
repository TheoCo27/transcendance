type InputProps = {
  className?: string;
  type?: string;
} & React.ComponentPropsWithoutRef<"input">;

export default function Input({ className = "", type, ...props }: InputProps) {
  return (
    <input
      className={`rounded-xl border border-white/10 bg-bg px-4 py-3 placeholder:text-text/40 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${className}`}
      type={type}
      {...props}
    />
  );
}

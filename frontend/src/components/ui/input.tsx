type InputProps = {
  className?: string;
  type?: string;
} & React.ComponentPropsWithoutRef<"input">;

export default function Input({ className = "", type, ...props }: InputProps) {
  return (
    <input
      className={`rounded-xl border border-white/10 bg-bg px-4 py-3 outline-none placeholder:text-text/40 ${className}`}
      type={type}
      {...props}
    />
  );
}

// Login
// mb-4 w-full

// ./kits/PatternKit/ZenHeading.tsx
interface ZenHeadingProps {
  children: string;
  size?: "lg" | "xl" | "2xl";
}

export const ZenHeading = ({ children, size = "xl" }: ZenHeadingProps) => {
  const sizeClasses = {
    lg: "text-2xl",
    xl: "text-3xl",
    "2xl": "text-4xl",
  };

  return (
    <h1
      className={`font-mono ${sizeClasses[size]} text-[#e5e5e5] font-normal tracking-wide`}
    >
      {children}
    </h1>
  );
};

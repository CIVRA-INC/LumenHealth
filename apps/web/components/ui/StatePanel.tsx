export const StatePanel = ({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "error" | "warning";
}) => {
  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-white text-slate-500";

  return <section className={`rounded-xl border p-4 text-sm shadow-sm ${toneClass}`}>{children}</section>;
};

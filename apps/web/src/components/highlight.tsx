/** Marks the parts of `text` that match any word of `query`, so search results explain themselves. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const words = query
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (words.length === 0) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'ig'));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-xs bg-lime-100 px-px text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

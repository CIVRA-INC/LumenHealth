type AuthRoadmapProps = {
  title: string;
  items: string[];
};

export function AuthRoadmap({ title, items }: AuthRoadmapProps) {
  return (
    <section className="authRoadmap">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

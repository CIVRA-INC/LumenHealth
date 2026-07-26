export default function PatientsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <nav>
        <a href="/patients">All Patients</a>
      </nav>
      {children}
    </section>
  );
}

import { config } from '@lumen/config';

export default async function Home() {
  const apiUrl = `http://localhost:${config.port}/health`;

  // DEBUG LOG: Check this in your VS Code terminal when you refresh
  console.log('🔍 Attempting to fetch from:', apiUrl);

  const res = await fetch(apiUrl, { cache: 'no-store' });

  // If the API sends HTML (error page), this throws the error you saw
  if (!res.ok) {
    throw new Error(`API returned status: ${res.status}`);
  }

  const data = await res.json();

  return (
    <main style={{ padding: '2rem' }}>
      <h1>LumenHealth Dashboard</h1>
      <p>
        Backend Status: <strong>{data.status}</strong>
      </p>
    </main>
  );
}

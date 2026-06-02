import { AuthScreen } from "../_components/auth-screen";

const DEMO_SESSION = {
  userId: "demo-user",
  clinicId: "demo-clinic",
  role: "owner" as const,
  accessToken: "demo.jwt.token",
};

export default function LoginPage() {
  const [uiState, setUiState] = useState<DemoState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (demoMode) return;
    const form = new FormData(e.currentTarget);
    const body: LoginRequest = {
      email: form.get("email") as string,
      password: form.get("password") as string,
    };
    setUiState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data: LoginResponse = await res.json();
        void data; // store token in real implementation
        setUiState("success");
      } else {
        const err: AuthError = await res.json();
        if (err.error === "AUTH_ACCOUNT_LOCKED") setUiState("locked");
        else setUiState("error");
        setErrorMsg(err.message);
      }
    } catch {
      setUiState("error");
      setErrorMsg("Network error — could not reach the server.");
    }
  }

  function activateDemoState(state: DemoState) {
    setDemoMode(true);
    setUiState(state);
    if (state === "error") setErrorMsg("Invalid email or password.");
    else if (state === "locked") setErrorMsg("Account locked after too many attempts.");
    else setErrorMsg(null);
  }

  return (
    <main className="authPage">
      <AuthScreen mode="login" />
    </main>
  );
}

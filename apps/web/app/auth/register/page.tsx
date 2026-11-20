import { AuthScreen } from "../_components/auth-screen";

export default function RegisterPage() {
  return (
    <main id="main-content" tabIndex={-1} className="authPage">
      <AuthScreen mode="register" />
    </main>
  );
}

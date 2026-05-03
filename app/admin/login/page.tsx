import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 font-serif text-2xl text-text">Admin</h1>
        <p className="mb-6 text-sm text-text-light">
          Acesso restrito ao gerenciamento dos presentes.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}

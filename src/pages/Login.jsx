import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo, Feedback } from "../components";
import { useAuth } from "../auth";
import { demoUsers } from "../lib/data";
export default function Login() {
  const { login, logout, isCloud, isDemo, authError } = useAuth();
  const [role, setRole] = useState("admin"),
    [email, setEmail] = useState(isDemo ? demoUsers.admin.email : ""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      if (u.role !== role) {
        await logout();
        setError(
          "Este usuário pertence ao perfil " +
            u.role +
            ". Selecione o perfil correto.",
        );
        return;
      }
      navigate("/" + u.role, { replace: true });
    } catch (ex) {
      setError(ex.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-cover">
        <div className="auth-cover-content">
          <span className="pill">
            <span className="dot" /> Sistema PulseFit
          </span>
          <h1>Treino e gestão em um só lugar.</h1>
          <p>
            Uma plataforma conectada para administradores, alunos e treinadores.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-box">
          <Logo />
          <h2>Bem-vindo de volta</h2>
          <p className="muted">Selecione seu perfil e entre com sua conta.</p>
          <div className="role-tabs">
            {Object.keys(demoUsers).map((r) => (
              <button
                key={r}
                type="button"
                className={"role-tab " + (role === r ? "active" : "")}
                onClick={() => {
                  setRole(r);
                  setError("");
                  if (isDemo) {
                    setEmail(demoUsers[r].email);
                    setPassword("");
                  }
                }}
              >
                {r === "admin"
                  ? "Administrador"
                  : r === "aluno"
                    ? "Aluno"
                    : "Treinador"}
              </button>
            ))}
          </div>
          <form className="auth-form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                className="input"
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                className="input"
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Feedback error={error || authError} />
            <button
              disabled={busy || (!isCloud && !isDemo)}
              className="btn btn-primary"
            >
              {busy ? "Entrando..." : "Entrar no sistema →"}
            </button>
            <Link className="btn btn-ghost" to="/">
              ← Voltar para o site
            </Link>
          </form>
          {isDemo && (
            <div className="demo-box">
              <strong>Contas de demonstração (somente neste navegador)</strong>
              {Object.entries(demoUsers).map(([r, u]) => (
                <div className="demo-row" key={r}>
                  <span>{r}</span>
                  <code>
                    {u.email} • {u.password}
                  </code>
                </div>
              ))}
            </div>
          )}
          {isCloud && (
            <p className="muted small" style={{ marginTop: 25 }}>
              Use o e-mail e a senha cadastrados pela sua academia.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
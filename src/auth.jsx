import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isCloud, isDemo, configurationError, supabase } from "./lib/supabase";
import { demoUsers, localGet, localSet } from "./lib/data";

const Auth = createContext(null);
const roles = new Set(["admin", "aluno", "treinador"]);
export const useAuth = () => useContext(Auth);

async function readProfile(session) {
  if (!session) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,role")
    .eq("id", session.user.id)
    .single();
  if (error || !data || !roles.has(data.role)) {
    throw Error(
      "Não foi possível carregar seu perfil. Peça ao administrador para verificar a conta e as permissões do banco.",
    );
  }
  return {
    id: data.id,
    name: data.full_name,
    role: data.role,
    email: session.user.email,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const revision = useRef(0);

  useEffect(() => {
    let active = true;
    const timers = new Set();
    if (!isCloud) {
      const saved = isDemo ? localGet("session", null) : null;
      setUser(saved && roles.has(saved.role) ? saved : null);
      setAuthError(configurationError);
      setLoading(false);
      return () => {
        active = false;
      };
    }
    async function applySession(session, ticket) {
      if (!active || ticket !== revision.current) return;
      setLoading(true);
      setUser(null);
      try {
        const next = await readProfile(session);
        if (active && ticket === revision.current) {
          setUser(next);
          setAuthError("");
        }
      } catch (error) {
        if (active && ticket === revision.current) setAuthError(error.message);
      } finally {
        if (active && ticket === revision.current) setLoading(false);
      }
    }
    let receivedEvent = false;
    const initialTicket = revision.current;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      const ticket = ++revision.current;
      // Consultas ao Supabase ficam fora do callback síncrono do Auth.
      const timer = setTimeout(() => {
        timers.delete(timer);
        applySession(session, ticket);
      }, 0);
      timers.add(timer);
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || receivedEvent || revision.current !== initialTicket)
          return;
        if (error) throw error;
        return applySession(data.session, ++revision.current);
      })
      .catch(() => {
        if (active && !receivedEvent) {
          setAuthError(
            "Não foi possível restaurar a sessão. Tente entrar novamente.",
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
      ++revision.current;
      timers.forEach(clearTimeout);
      subscription.unsubscribe();
    };
  }, []);

  async function login(email, password) {
    setAuthError("");
    if (isDemo) {
      const role = Object.keys(demoUsers).find(
        (r) =>
          demoUsers[r].email === email && demoUsers[r].password === password,
      );
      if (!role) throw Error("E-mail ou senha incorretos.");
      const next = {
        id: role === "aluno" ? "1" : role,
        email,
        name: demoUsers[role].name,
        role,
      };
      localSet("session", next);
      setUser(next);
      return next;
    }
    if (!isCloud) throw Error(configurationError);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      throw Error(
        error.code === "invalid_credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
      );
    try {
      const next = await readProfile(data.session);
      ++revision.current;
      setUser(next);
      setLoading(false);
      return next;
    } catch (profileError) {
      await supabase.auth.signOut();
      throw profileError;
    }
  }

  async function logout() {
    if (isCloud) {
      const { error } = await supabase.auth.signOut();
      if (error) throw Error("Não foi possível sair. Tente novamente.");
    } else if (isDemo) localStorage.removeItem("pulsefit:session");
    ++revision.current;
    setUser(null);
    setAuthError("");
    setLoading(false);
  }
  return (
    <Auth.Provider
      value={{ user, loading, authError, login, logout, isCloud, isDemo }}
    >
      {children}
    </Auth.Provider>
  );
}

export function Protected({ role, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="load-screen">Carregando PulseFit...</div>;
  if (!user)
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (user.role !== role) return <Navigate to={"/" + user.role} replace />;
  return children;
}
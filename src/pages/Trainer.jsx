import React, { useEffect, useState } from "react";
import { Shell, Panel, Metric, Feedback } from "../components";
import { api } from "../lib/api";
import { isCloud } from "../lib/supabase";
export default function Trainer() {
  const [members, setMembers] = useState([]),
    [selected, setSelected] = useState(""),
    [presence, setPresence] = useState({}),
    [workouts, setWorkouts] = useState([]),
    [error, setError] = useState(""),
    [info, setInfo] = useState("");
  const load = async () => {
    try {
      const [m, w] = await Promise.all([api.members(), api.workouts()]);
      setMembers(m);
      setWorkouts(w);
      if (m.length)
        setSelected(
          (old) =>
            old ||
            String(
              isCloud ? m.find((x) => x.profile_id)?.profile_id || "" : m[0].id,
            ),
        );
      const vals = await Promise.all(
        m.map(async (x) => [
          x.id,
          isCloud && !x.profile_id
            ? false
            : await api.presence(isCloud ? x.profile_id : x.id),
        ]),
      );
      setPresence(Object.fromEntries(vals));
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  async function act(fn) {
    setError("");
    setInfo("");
    try {
      await fn();
      await load();
      setInfo("Alterações registradas com sucesso.");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Shell
      role="treinador"
      title="Painel do treinador"
      subtitle="Acompanhamento dos alunos e evolução dos treinos"
    >
      <Feedback error={error} success={info} />
      <section className="dash-grid-4">
        <Metric icon="👥" value={members.length} label="alunos cadastrados" />
        <Metric
          icon="✅"
          value={Object.values(presence).filter(Boolean).length}
          label="presenças hoje"
        />
        <Metric icon="🏋️" value={workouts.length} label="treinos cadastrados" />
        <Metric
          icon="📆"
          value={new Date().toLocaleDateString("pt-BR")}
          label="data de hoje"
        />
      </section>
      <section className="panel" id="alunos" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>Acompanhamento e presença</h3>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Plano</th>
                <th>Situação</th>
                <th>Presença de hoje</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.full_name}</strong>
                  </td>
                  <td>{m.plan}</td>
                  <td>
                    <span className="status active">{m.status}</span>
                  </td>
                  <td>
                    <button
                      className={
                        "btn small " +
                        (presence[m.id] ? "btn-primary" : "btn-secondary")
                      }
                      disabled={isCloud && !m.profile_id}
                      title={
                        isCloud && !m.profile_id
                          ? "Aluno sem conta de acesso vinculada"
                          : ""
                      }
                      onClick={() =>
                        act(() =>
                          api.setPresence(
                            isCloud ? m.profile_id : m.id,
                            !presence[m.id],
                          ),
                        )
                      }
                    >
                      {presence[m.id] ? "Presente ✓" : "Marcar presença"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="dash-grid-2">
        <Panel id="montar" title="Montar/atualizar treino">
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              act(() =>
                api.saveWorkout({
                  student_id: String(f.get("student")),
                  goal: String(f.get("goal")),
                  description: String(f.get("description")),
                }),
              );
              e.currentTarget.reset();
            }}
          >
            <div className="field">
              <label>Aluno</label>
              <select
                className="input"
                name="student"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                required
              >
                {members
                  .filter((m) => !isCloud || m.profile_id)
                  .map((m) => (
                    <option key={m.id} value={isCloud ? m.profile_id : m.id}>
                      {m.full_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>Objetivo</label>
              <select className="input" name="goal">
                <option>Hipertrofia</option>
                <option>Emagrecimento</option>
                <option>Condicionamento</option>
                <option>Força</option>
              </select>
            </div>
            <div className="field">
              <label>Descrição</label>
              <textarea
                className="input textarea"
                name="description"
                required
                minLength={5}
                placeholder="Ex.: Supino 4x10, agachamento 3x12..."
              />
            </div>
            <button className="btn btn-primary" disabled={!selected}>
              Salvar treino
            </button>
          </form>
        </Panel>
        <Panel id="agenda" title="Treinos cadastrados">
          {workouts.length ? (
            workouts.slice(0, 10).map((w) => (
              <div className="quick-item" key={w.id}>
                <div>
                  <strong>{w.goal}</strong>
                  <p>{w.description}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">Nenhum treino cadastrado ainda.</p>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
import { useCallback, useEffect, useMemo, useState } from "react";
import { Checkbox, Input, InputNumber, Spin, Typography, message, Tag } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import { ReloadOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { http } from "../../api/http";
import "../../styles/team-generator.css";

const { Text } = Typography;

type UUID = string;

type Player = {
  id: UUID;
  name: string;
  sex: "M" | "F";
  active: boolean;
};

type Skill = {
  id: UUID;
  code: string;
  name: string;
  active: boolean;
};

type GenerateDbRequest = {
  teamCount: number;
  playersPerTeam: number;
  playerIds: UUID[];
  selectedSkills: Array<{ skillId: UUID; weight: number }>;
  sexBalance?: { enabled: boolean; maxMaleDiff: number };
  sexMultiplier?: Record<"M" | "F", number>;
};

type GenerateDbResponse = {
  sessionId: UUID;
  teams: Array<{
    teamIndex: number;
    sumScore: number;
    players: Array<{
      playerId: UUID;
      name: string;
      sex: "M" | "F";
      score: number;
    }>;
  }>;
};

type StepKey = "players" | "skills" | "result";

const DEFAULT_TEAM_COUNT = 8;
const DEFAULT_PLAYERS_PER_TEAM = 4;

export default function DbTeamGenerator() {
  const [step, setStep] = useState<StepKey>("players");

  const [playersLoading, setPlayersLoading] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const [teamCount, setTeamCount] = useState(DEFAULT_TEAM_COUNT);
  const [playersPerTeam, setPlayersPerTeam] = useState(DEFAULT_PLAYERS_PER_TEAM);

  const [playerQuery, setPlayerQuery] = useState("");
  const [skillQuery, setSkillQuery] = useState("");

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<UUID[]>([]);
  const [selectedSkillMap, setSelectedSkillMap] = useState<Record<UUID, number>>({}); // skillId -> weight

  // sempre disponíveis (e no step skills ficam do lado)
  const [sexBalanceEnabled, setSexBalanceEnabled] = useState(true);
  const [maxMaleDiff, setMaxMaleDiff] = useState(1);
  const [multM, setMultM] = useState(1.0);
  const [multF, setMultF] = useState(0.92);

  const [result, setResult] = useState<GenerateDbResponse | null>(null);

  const needed = teamCount * playersPerTeam;

  const activePlayers = useMemo(() => players.filter((p) => p.active), [players]);
  const activeSkills = useMemo(() => skills.filter((s) => s.active), [skills]);

  const filteredPlayers = useMemo(() => {
    const q = playerQuery.trim().toLowerCase();
    if (!q) return activePlayers;
    return activePlayers.filter((p) => p.name.toLowerCase().includes(q));
  }, [activePlayers, playerQuery]);

  const filteredSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    if (!q) return activeSkills;
    return activeSkills.filter((s) => `${s.name} ${s.code}`.toLowerCase().includes(q));
  }, [activeSkills, skillQuery]);

  const selectedSkills = useMemo(
    () => Object.entries(selectedSkillMap).map(([skillId, weight]) => ({ skillId, weight })),
    [selectedSkillMap]
  );

  const canGoNext = selectedPlayerIds.length >= needed;
  const canGenerate = canGoNext && selectedSkills.length > 0;

  const loadPlayers = useCallback(async () => {
    setPlayersLoading(true);
    try {
      const { data } = await http.get<Player[]>("/players");
      setPlayers(data);
    } catch (e) {
      console.error(e);
      message.error("Erro ao carregar jogadores");
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  const loadSkills = useCallback(async () => {
    setSkillsLoading(true);
    try {
      const { data } = await http.get<Skill[]>("/skills");
      setSkills(data);
    } catch (e) {
      console.error(e);
      message.error("Erro ao carregar skills");
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPlayers(), loadSkills()]);
  }, [loadPlayers, loadSkills]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const togglePlayer = useCallback((playerId: UUID, checked: boolean) => {
    setSelectedPlayerIds((prev) => {
      if (checked) {
        if (prev.includes(playerId)) return prev;
        return [...prev, playerId];
      }
      return prev.filter((id) => id !== playerId);
    });
  }, []);

  const toggleSkill = useCallback((skillId: UUID, checked: boolean) => {
    setSelectedSkillMap((prev) => {
      const copy = { ...prev };
      if (checked) copy[skillId] = copy[skillId] ?? 1;
      else delete copy[skillId];
      return copy;
    });
  }, []);

  const setSkillWeight = useCallback((skillId: UUID, w: number) => {
    setSelectedSkillMap((prev) => ({ ...prev, [skillId]: w }));
  }, []);

  const goNext = useCallback(() => {
    if (!canGoNext) {
      message.warning(`Selecione pelo menos ${needed} jogadores.`);
      return;
    }
    setStep("skills");
  }, [canGoNext, needed]);

  const goBackToPlayers = useCallback(() => {
    setStep("players");
  }, []);

  const goBackToSkills = useCallback(() => {
    setStep("skills");
  }, []);

  const generate = useCallback(async () => {
    if (!canGenerate) {
      message.warning("Selecione jogadores suficientes e pelo menos 1 skill.");
      return;
    }

    const payload: GenerateDbRequest = {
      teamCount,
      playersPerTeam,
      playerIds: selectedPlayerIds.slice(0, needed),
      selectedSkills,
      sexBalance: { enabled: sexBalanceEnabled, maxMaleDiff },
      sexMultiplier: { M: multM, F: multF },
    };

    setGenerating(true);
    setResult(null);

    try {
      console.log(payload);
      const { data } = await http.post<GenerateDbResponse>("/teams/generate/db", payload);      
      setResult(data);
      setStep("result");
      message.success("Times gerados com sucesso!");
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message ?? "Erro ao gerar times");
    } finally {
      setGenerating(false);
    }
  }, [
    canGenerate,
    needed,
    teamCount,
    playersPerTeam,
    selectedPlayerIds,
    selectedSkills,
    sexBalanceEnabled,
    maxMaleDiff,
    multM,
    multF,
  ]);

  const resetAll = useCallback(() => {
    setStep("players");
    setSelectedPlayerIds([]);
    setSelectedSkillMap({});
    setResult(null);
    setPlayerQuery("");
    setSkillQuery("");
    setTeamCount(DEFAULT_TEAM_COUNT);
    setPlayersPerTeam(DEFAULT_PLAYERS_PER_TEAM);
  }, []);

  const selectedPlayersCount = selectedPlayerIds.length;
  const selectedSkillsCount = selectedSkills.length;

  // =========================
  // UI blocks
  // =========================

  const TopBar = (
    <div className="ui-card" style={{ padding: 15 }}>
      <div className="config-header-compact">
        <span className="config-title"></span>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="action-btn-compact save"
            onClick={refreshAll}
            disabled={playersLoading || skillsLoading}
            title="Recarregar dados"
          >
            Recarregar
          </button>

          <button type="button" className="action-btn-compact reset" onClick={resetAll} title="Reiniciar">
            Limpar
          </button>
        </div>
      </div>

      <div className="config-controls-compact">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="input-group-compact">
            <label>Times:</label>
            <InputNumber min={1} value={teamCount} onChange={(v) => setTeamCount(Number(v || 1))} style={{ width: 160 }} />
          </div>

          <div className="input-group-compact">
            <label>Jogadores por time:</label>
            <InputNumber
              min={2}
              value={playersPerTeam}
              onChange={(v) => setPlayersPerTeam(Number(v || 2))}
              style={{ width: 160 }}
            />
          </div>
        </div>

        <div className="config-info-compact" style={{ marginTop: 10 }}>
          Precisa de <b>{needed}</b> jogadores • Selecionados: <b>{selectedPlayersCount}</b>
          {step !== "players" && (
            <>
              {" "}
              • Skills selecionadas: <b>{selectedSkillsCount}</b>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // =========================
  // STEP: PLAYERS (FULL)
  // =========================
  const PlayersStep = (
    <div className="ui-card" style={{ padding: 15 }}>
      <div className="players-header-compact">
        <h3>1) Selecionar Jogadores</h3>
        <span className="players-count ui-badge">{selectedPlayersCount}</span>
      </div>

      <button
        type="button"
        className="action-btn-compact generate"
        onClick={goNext}
        disabled={!canGoNext}
        title={!canGoNext ? `Selecione ${needed} jogadores` : "Ir para skills"}
        style={{marginBottom: 10}}
      >
        Próximo: Skills
      </button>
      
      <Input
        placeholder="Buscar jogador..."
        value={playerQuery}
        onChange={(e) => setPlayerQuery(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {playersLoading ? (
        <div style={{ padding: 16 }}>
          <Spin />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "58vh", overflow: "auto" }}>
          {filteredPlayers.map((p) => {
            const checked = selectedPlayerIds.includes(p.id);
            return (
              <label
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  background: "var(--surface-2)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Checkbox checked={checked} onChange={(e: CheckboxChangeEvent) => togglePlayer(p.id, e.target.checked)} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 900, color: "#fff" }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 800 }}>Sexo: {p.sex}</span>
                  </div>
                </div>

                <Tag color={p.sex === "M" ? "blue" : "magenta"} style={{ fontWeight: 900 }}>
                  {p.sex}
                </Tag>
              </label>
            );
          })}

          {filteredPlayers.length === 0 && (
            <div style={{ padding: 12, color: "var(--text-2)", fontWeight: 800 }}>Nenhum jogador encontrado.</div>
          )}
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <Text style={{ color: "var(--text-2)", fontWeight: 800 }}>
          Selecionados: {selectedPlayersCount} / {needed}
        </Text>
      </div>
    </div>
  );

  // =========================
  // STEP: SKILLS (FULL + lateral config)
  // =========================
  const SkillsStep = (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      {/* Skills list */}
      <div className="ui-card" style={{ padding: 15 }}>
        <div className="players-header-compact">
          <h3>2) Selecionar Skills</h3>
          <span className="players-count ui-badge">{selectedSkillsCount}</span>
        </div>

        <Input
          placeholder="Buscar skill..."
          value={skillQuery}
          onChange={(e) => setSkillQuery(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {skillsLoading ? (
          <div style={{ padding: 16 }}>
            <Spin />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "52vh", overflow: "auto" }}>
            {filteredSkills.map((s) => {
              const checked = selectedSkillMap[s.id] != null;
              const weight = selectedSkillMap[s.id] ?? 1;

              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    background: "var(--surface-2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Checkbox checked={checked} onChange={(e) => toggleSkill(s.id, e.target.checked)} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 900, color: "#fff" }}>{s.name}</span>
                      <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 800 }}>{s.code}</span>
                    </div>
                  </div>

                  {checked ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Text style={{ color: "var(--text-2)", fontWeight: 900 }}>Peso</Text>
                      <InputNumber
                        min={0}
                        max={10}
                        step={0.5}
                        value={weight}
                        onChange={(v) => setSkillWeight(s.id, Number(v ?? 1))}
                        style={{ width: 90 }}
                      />
                    </div>
                  ) : (
                    <Text style={{ color: "var(--text-2)", fontWeight: 800 }}>—</Text>
                  )}
                </div>
              );
            })}

            {filteredSkills.length === 0 && (
              <div style={{ padding: 12, color: "var(--text-2)", fontWeight: 800 }}>Nenhuma skill encontrada.</div>
            )}
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <button type="button" className="action-btn-compact copy" onClick={goBackToPlayers} title="Voltar">
            Voltar
          </button>

          <button
            type="button"
            className="action-btn-compact generate"
            onClick={generate}
            disabled={!canGenerate || generating}
            title={!canGenerate ? "Selecione pelo menos 1 skill" : "Gerar times"}
          >
            {generating ? "Gerando..." : "Gerar Times"}
          </button>
        </div>
      </div>

      {/* Sex weights (side) */}
      <div className="ui-card" style={{ padding: 15, height: "fit-content" }}>
        <div className="players-header-compact" style={{ marginBottom: 10 }}>
          <h3>⚖️ Pesos e Regras</h3>
          <span className="players-count ui-badge">M/F</span>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <Text style={{ color: "#fff", fontWeight: 900 }}>Times mistos</Text>
            <Tag color={sexBalanceEnabled ? "green" : "red"} style={{ fontWeight: 900 }}>
              {sexBalanceEnabled ? "Ativo" : "Inativo"}
            </Tag>
          </div>

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            <Checkbox checked={sexBalanceEnabled} onChange={(e) => setSexBalanceEnabled(e.target.checked)}>
              Balancear quantidade de homens por time
            </Checkbox>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Text style={{ color: "#fff", fontWeight: 900 }}>Dif. máxima de homens:</Text>
              <InputNumber min={0} max={10} value={maxMaleDiff} onChange={(v) => setMaxMaleDiff(Number(v ?? 1))} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Text style={{ color: "#fff", fontWeight: 900 }}>Multiplicador M:</Text>
              <InputNumber min={0.5} max={2} step={0.01} value={multM} onChange={(v) => setMultM(Number(v ?? 1))} />

              <Text style={{ color: "#fff", fontWeight: 900 }}>Multiplicador F:</Text>
              <InputNumber min={0.5} max={2} step={0.01} value={multF} onChange={(v) => setMultF(Number(v ?? 0.92))} />
            </div>

            <div className="config-info-compact" style={{ marginTop: 10 }}>
              Dica: ajuste os multiplicadores para compensar diferença de nível entre M/F.
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // =========================
  // STEP: RESULT (FULL)
  // =========================
  const ResultStep = (
    <div className="results-section ui-card" style={{ height: "calc(100dvh - 230px)" }}>
      <div className="results-header">
        <h2>Times Gerados (Banco)</h2>

        <div className="results-stats">
          {result?.teams?.length ? <span className="teams-count-badge">{result.teams.length} times</span> : null}

          <div className="action-buttons-compact">
            <button type="button" className="action-btn-compact copy" onClick={goBackToSkills} title="Voltar para skills">
              <ArrowLeftOutlined /> Voltar
            </button>

            <button type="button" className="action-btn-compact reset" onClick={resetAll} title="Novo sorteio">
              Novo sorteio
            </button>
          </div>
        </div>
      </div>

      {generating ? (
        <div className="empty-state">
          <Spin />
          <div style={{ marginTop: 10, color: "var(--text-2)", fontWeight: 800 }}>Calculando balanceamento...</div>
        </div>
      ) : result?.teams?.length ? (
        <>
          <div className="teams-summary" style={{ justifyContent: "space-between" }}>
            <span style={{ color: "var(--primary)", fontWeight: 900 }}>
              Session: <span style={{ color: "#fff" }}>{result.sessionId}</span>
            </span>

            <button
              type="button"
              className="reshuffle-btn"
              onClick={generate}
              title="Reembaralhar com as mesmas seleções"
              disabled={!canGenerate || generating}
            >
              Reembaralhar
            </button>
          </div>

          <div className="tg-teams-grid ui-scroll">
            {result.teams.map((team) => (
              <div key={team.teamIndex} className="tg-team-card">
                <div className="tg-team-name">
                  Time {team.teamIndex}{" "}
                  <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 900 }}>
                    • {team.sumScore.toFixed(1)}
                  </span>
                </div>

                <div className="tg-team-players">
                  {team.players.map((p) => (
                    <div key={p.playerId} className="tg-team-player">
                      <span className="tg-player-name" title={p.name}>
                        {p.name}
                      </span>
                      <span style={{ fontWeight: 900, color: "var(--text-2)", fontSize: 12 }}>
                        {p.sex} • {p.score.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🧠</div>
          <h3>Nenhum time gerado</h3>
          <p>Volte e gere novamente.</p>
        </div>
      )}
    </div>
  );

  // =========================
  // Layout FULL SCREEN (sem coluna fixa)
  // =========================
  return (
    <div className="main-content" style={{ gridTemplateColumns: "1fr" }}>
      <div className="controls-column ui-scroll" style={{ overflow: "auto" }}>
        {TopBar}

        {step === "players" && PlayersStep}
        {step === "skills" && SkillsStep}
        {step === "result" && ResultStep}
      </div>
    </div>
  );
}
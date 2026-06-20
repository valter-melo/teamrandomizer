import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DragEvent } from "react";
import {
  Checkbox,
  Input,
  InputNumber,
  Spin,
  Typography,
  message,
  Tag,
  Button,
  Modal,
  Select,
  Row,
  Col,
} from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import {
  HistoryOutlined,
  PlayCircleOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "react-responsive";

import { http } from "../api/http";
import { usePlayers } from "../hooks/usePlayers";
import { CourtSetupModal } from "./CourtPosterImage/CourtSetupModal";

const { Text } = Typography;

type UUID = string;

type Skill = {
  id: UUID;
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
  requiredPositions?: UUID[];
  friendlyPointsPerSet?: number;
  friendlySetsToWin?: number;
};

type RawTeamPlayer = {
  id?: UUID;
  playerId?: UUID;
  player_id?: UUID;
  athleteId?: UUID;
  athlete_id?: UUID;
  name?: string;
  sex?: "M" | "F";
  score?: number;
  player?: {
    id?: UUID;
    name?: string;
    sex?: "M" | "F";
  };
};

type TeamPlayer = {
  playerId: UUID;
  name: string;
  sex: "M" | "F";
  score: number;
};

type RawTeam = {
  teamIndex: number;
  sumScore: number;
  players: RawTeamPlayer[];
};

type Team = {
  teamIndex: number;
  sumScore: number;
  players: TeamPlayer[];
};

type GenerateDbApiResponse = {
  sessionId: UUID;
  teams: RawTeam[];
};

type GenerateDbResponse = {
  sessionId: UUID;
  teams: Team[];
};

type StepKey = "players" | "skills" | "result";

type DragPlayerData = {
  playerId: string;
  fromTeamIndex: number;
};

const DEFAULT_TEAM_COUNT = 8;
const DEFAULT_PLAYERS_PER_TEAM = 4;
const DEFAULT_FRIENDLY_POINTS = 12;

export default function DbTeamGenerator() {
  // ---------- responsivo ----------
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // ---------- estados ----------
  const [step, setStep] = useState<StepKey>("players");

  const [skillsLoading, setSkillsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const [skills, setSkills] = useState<Skill[]>([]);

  const [teamCount, setTeamCount] = useState(DEFAULT_TEAM_COUNT);
  const [playersPerTeam, setPlayersPerTeam] = useState(DEFAULT_PLAYERS_PER_TEAM);
  const [friendlyPointsPerSet, setFriendlyPointsPerSet] = useState(DEFAULT_FRIENDLY_POINTS);

  const [playerQuery, setPlayerQuery] = useState("");
  const [skillQuery, setSkillQuery] = useState("");

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<UUID[]>([]);
  const [selectedSkillMap, setSelectedSkillMap] = useState<Record<UUID, number>>({});

  const [sexBalanceEnabled, setSexBalanceEnabled] = useState(true);
  const [maxMaleDiff, setMaxMaleDiff] = useState(1);
  const [multM, setMultM] = useState(1.0);
  const [multF, setMultF] = useState(0.92);

  const [balancePositions, setBalancePositions] = useState(false);
  const [requiredPositions, setRequiredPositions] = useState<UUID[]>([]);
  const [availablePositions, setAvailablePositions] = useState<{ id: UUID; name: string }[]>([]);

  const [result, setResult] = useState<GenerateDbResponse | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const [courtModalOpen, setCourtModalOpen] = useState(false);
  const [dragOverTeamIndex, setDragOverTeamIndex] = useState<number | null>(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  const dragDataRef = useRef<DragPlayerData | null>(null);
  const navigate = useNavigate();

  // ---------- hook de jogadores ----------
  const { players: allPlayers, loading: playersLoading } = usePlayers();
  const players = allPlayers;

  const needed = teamCount * playersPerTeam;

  // ---------- dados derivados ----------
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
    return activeSkills.filter((s) => s.name.toLowerCase().includes(q));
  }, [activeSkills, skillQuery]);

  const selectedSkills = useMemo(
    () => Object.entries(selectedSkillMap).map(([skillId, weight]) => ({ skillId, weight })),
    [selectedSkillMap]
  );

  const canGoNext = selectedPlayerIds.length >= needed;
  const canGenerate = canGoNext && selectedSkills.length > 0;

  // ---------- carregamento de skills ----------
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

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  useEffect(() => {
    http.get('/positions')
      .then(res => setAvailablePositions(res.data))
      .catch(() => message.error("Erro ao carregar posições"));
  }, []);

  useEffect(() => {
    if (result?.teams) setTeams(result.teams);
  }, [result]);

  // ---------- handlers de seleção ----------
  const togglePlayer = useCallback(
    (playerId: UUID, checked: boolean) => {
      setSelectedPlayerIds((prev) => {
        if (checked) {
          if (prev.length >= needed) {
            message.warning(`Você já selecionou ${needed} jogadores.`);
            return prev;
          }
          return prev.includes(playerId) ? prev : [...prev, playerId];
        }
        return prev.filter((id) => id !== playerId);
      });
    },
    [needed]
  );

  const toggleSkill = useCallback((skillId: UUID, checked: boolean) => {
    setSelectedSkillMap((prev) => {
      const copy = { ...prev };
      if (checked) copy[skillId] = copy[skillId] ?? 1;
      else delete copy[skillId];
      return copy;
    });
  }, []);

  const setSkillWeight = useCallback(
    (skillId: UUID, weight: number) => setSelectedSkillMap((prev) => ({ ...prev, [skillId]: weight })),
    []
  );

  // ---------- navegação entre steps ----------
  const goNext = useCallback(() => {
    if (!canGoNext) {
      message.warning(`Selecione pelo menos ${needed} jogadores.`);
      return;
    }
    setStep("skills");
  }, [canGoNext, needed]);

  const goBackToPlayers = useCallback(() => setStep("players"), []);

  // ---------- geração de times ----------
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
      requiredPositions: balancePositions ? requiredPositions : [],
      friendlyPointsPerSet: friendlyPointsPerSet,
      friendlySetsToWin: 1,
    };
    setGenerating(true);
    setResult(null);
    setTeams([]);
    try {
      const { data } = await http.post<GenerateDbApiResponse>("/teams/generate/db", payload);
      const teams: Team[] = data.teams.map((team) => ({
        teamIndex: team.teamIndex,
        players: team.players.map((p) => ({
          playerId: p.playerId ?? p.id ?? "",
          name: p.name ?? "",
          sex: p.sex ?? "M",
          score: p.score ?? 0,
        })),
        sumScore: team.sumScore,
      }));
      setResult({ sessionId: data.sessionId, teams });
      setTeams(teams);
      setStep("result");
      message.success("Times gerados com sucesso!");
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message ?? "Erro ao gerar times");
    } finally {
      setGenerating(false);
    }
  }, [
    canGenerate, teamCount, playersPerTeam, selectedPlayerIds, needed,
    selectedSkills, sexBalanceEnabled, maxMaleDiff, multM, multF,
    balancePositions, requiredPositions, friendlyPointsPerSet,
  ]);

  const handleRecoverLatest = useCallback(async () => {
    setRecovering(true);
    try {
      const { data } = await http.get<GenerateDbApiResponse>("/teams/latest-session");
      const teams: Team[] = data.teams.map((team) => ({
        teamIndex: team.teamIndex,
        players: team.players.map((p) => ({
          playerId: p.playerId ?? p.id ?? "",
          name: p.name ?? "",
          sex: p.sex ?? "M",
          score: p.score ?? 0,
        })),
        sumScore: team.sumScore,
      }));
      setResult({ sessionId: data.sessionId, teams });
      setTeams(teams);
      setStep("result");
      message.success("Última geração recuperada!");
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message ?? "Nenhuma sessão anterior encontrada.");
    } finally {
      setRecovering(false);
    }
  }, []);

  const resetAll = useCallback(() => {
    setStep("players");
    setSelectedPlayerIds([]);
    setSelectedSkillMap({});
    setResult(null);
    setTeams([]);
    setPlayerQuery("");
    setSkillQuery("");
    setTeamCount(DEFAULT_TEAM_COUNT);
    setPlayersPerTeam(DEFAULT_PLAYERS_PER_TEAM);
    setFriendlyPointsPerSet(DEFAULT_FRIENDLY_POINTS);
    setDragOverTeamIndex(null);
    setBalancePositions(false);
    setRequiredPositions([]);
    dragDataRef.current = null;
  }, []);

  // ==================== DRAG & DROP ====================
  const prepareDragPlayer = useCallback((playerId: string, fromTeamIndex: number) => {
    if (!playerId) return;
    dragDataRef.current = { playerId, fromTeamIndex };
  }, []);

  const movePlayerLocally = useCallback(
    (playerId: string, fromTeamIndex: number, toTeamIndex: number) => {
      const previous = teams.map((t) => ({ ...t, players: [...t.players] }));
      const newTeams = teams.map((t) => ({ ...t, players: [...t.players] }));
      const fromTeam = newTeams.find((t) => t.teamIndex === fromTeamIndex);
      const toTeam = newTeams.find((t) => t.teamIndex === toTeamIndex);
      if (!fromTeam || !toTeam) return { didMove: false, previousTeams: previous };
      const idx = fromTeam.players.findIndex((p) => p.playerId === playerId);
      if (idx === -1) return { didMove: false, previousTeams: previous };
      const [moved] = fromTeam.players.splice(idx, 1);
      toTeam.players.push(moved);
      fromTeam.sumScore = fromTeam.players.reduce((sum, p) => sum + p.score, 0);
      toTeam.sumScore = toTeam.players.reduce((sum, p) => sum + p.score, 0);
      setTeams(newTeams);
      return { didMove: true, previousTeams: previous };
    },
    [teams]
  );

  const handleDropPlayer = useCallback(
    async (playerId: string, fromTeamIndex: number, toTeamIndex: number) => {
      if (!playerId || fromTeamIndex === toTeamIndex) return;
      if (!result?.sessionId) return;
      const { previousTeams, didMove } = movePlayerLocally(playerId, fromTeamIndex, toTeamIndex);
      if (!didMove) return;
      try {
        await http.put(`/teams/session/${result.sessionId}/move-player`, {
          playerId, fromTeamIndex, toTeamIndex,
        });
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? "Erro ao mover jogador. Revertendo...");
        setTeams(previousTeams);
      }
    },
    [result?.sessionId, movePlayerLocally]
  );

  const onDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, playerId: string, fromTeamIndex: number) => {
      if (!playerId) { e.preventDefault(); return; }
      dragDataRef.current = { playerId, fromTeamIndex };
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", JSON.stringify({ playerId, fromTeamIndex }));
      } catch (err) {
        console.warn("dataTransfer falhou", err);
      }
    },
    []
  );

  const onDragEnd = useCallback(() => {
    setDragOverTeamIndex(null);
    setTimeout(() => { dragDataRef.current = null; }, 100);
  }, []);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDragEnter = useCallback((e: DragEvent<HTMLDivElement>, teamIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTeamIndex(teamIndex);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragOverTeamIndex(null);
  }, []);

  const onDropOnTeam = useCallback(
    (e: DragEvent<HTMLDivElement>, toTeamIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverTeamIndex(null);
      let data: Partial<DragPlayerData> | null = null;
      try {
        const raw = e.dataTransfer.getData("text/plain");
        if (raw) data = JSON.parse(raw);
      } catch (err) {
        console.warn("Erro ao ler dataTransfer", err);
      }
      if (!data?.playerId || typeof data.fromTeamIndex !== "number") {
        data = dragDataRef.current;
      }
      if (!data?.playerId || typeof data.fromTeamIndex !== "number") return;
      handleDropPlayer(data.playerId, data.fromTeamIndex, toTeamIndex);
    },
    [handleDropPlayer]
  );

  // ---------- sessão com quadras ----------
  const handleStartSession = useCallback(
    async (courts: { name: string; teamIndices: number[] }[]) => {
      if (!result?.sessionId) return;
      try {
        await http.post("/game-sessions/start-with-courts", {
          generationSessionId: result.sessionId,
          courts,
          pointsPerSet: friendlyPointsPerSet,
          setsToWin: 1,
        });
        message.success("Sessão iniciada com sucesso!");
        setCourtModalOpen(false);
        navigate(`/friendly-sessions/${result.sessionId}`);
      } catch (err: any) {
        console.error(err);
        message.error(err?.response?.data?.message ?? "Erro ao iniciar sessão");
      }
    },
    [result?.sessionId, navigate, friendlyPointsPerSet]
  );

  // ---------- renderização dos times ----------
  const renderTeamsGrid = (compact: boolean) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: compact
          ? "repeat(auto-fill, minmax(220px, 1fr))"
          : "repeat(auto-fill, minmax(260px, 1fr))",
        gap: compact ? 12 : 16,
      }}
    >
      {teams.map((team) => {
        const isDragOver = dragOverTeamIndex === team.teamIndex;
        return (
          <div
            key={team.teamIndex}
            onDragOver={onDragOver}
            onDragEnter={(e) => onDragEnter(e, team.teamIndex)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDropOnTeam(e, team.teamIndex)}
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 8,
              padding: 12,
              border: isDragOver ? '2px dashed #01ff69' : '1px solid #333',
              transition: 'border 0.2s',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#01ff69', marginBottom: 8 }}>
              Time {team.teamIndex}{" "}
              <span style={{ fontSize: 12, color: '#aaa', fontWeight: 400 }}>
                • {team.sumScore.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {team.players.map((p, idx) => {
                const canDrag = Boolean(p.playerId);
                return (
                  <div
                    key={p.playerId || `${team.teamIndex}-${p.name}-${idx}`}
                    draggable={canDrag}
                    onPointerDown={() => canDrag && prepareDragPlayer(p.playerId, team.teamIndex)}
                    onDragStart={(e) => onDragStart(e, p.playerId, team.teamIndex)}
                    onDragEnd={onDragEnd}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 8px',
                      backgroundColor: '#262626',
                      borderRadius: 6,
                      cursor: canDrag ? 'grab' : 'not-allowed',
                      opacity: canDrag ? 1 : 0.55,
                      fontSize: 14,
                    }}
                    title={canDrag ? "Arraste para outro time" : "Jogador sem ID"}
                  >
                    <span style={{ color: '#fff', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ color: '#aaa', fontSize: 12, fontWeight: 700 }}>
                      {p.sex} • {p.score.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ==================== UI ====================
  const selectedPlayersCount = selectedPlayerIds.length;
  const selectedSkillsCount = selectedSkills.length;

  const TopBar = (
    <div style={{
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: 8,
      padding: isMobile ? 12 : 16,
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ marginRight: 4, color: '#ccc', fontWeight: 600 }}>Times:</label>
            <InputNumber min={1} value={teamCount} onChange={(v) => setTeamCount(Number(v || 1))} style={{ width: 80 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ marginRight: 4, color: '#ccc', fontWeight: 600 }}>Jogadores/time:</label>
            <InputNumber min={2} value={playersPerTeam} onChange={(v) => setPlayersPerTeam(Number(v || 2))} style={{ width: 100 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ marginRight: 4, color: '#ccc', fontWeight: 600 }}>Pontos p/ vitória:</label>
            <InputNumber min={1} max={50} value={friendlyPointsPerSet} onChange={(v) => setFriendlyPointsPerSet(Number(v || DEFAULT_FRIENDLY_POINTS))} style={{ width: 80 }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {step !== "result" && (
            <Button onClick={handleRecoverLatest} disabled={recovering} icon={<HistoryOutlined />} size={isMobile ? 'small' : 'middle'}>
              {recovering ? "Carregando..." : "Recuperar última geração"}
            </Button>
          )}
          <Button onClick={resetAll} size={isMobile ? 'small' : 'middle'}>Limpar</Button>
        </div>
      </div>
      <div style={{ marginTop: 8, color: '#aaa', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>
        Precisa de <b>{needed}</b> jogadores • Selecionados: <b>{selectedPlayersCount}</b>
        {step !== "players" && <> • Skills selecionadas: <b>{selectedSkillsCount}</b></>}
      </div>
    </div>
  );

  const PlayersStep = (
    <div style={{
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: 8,
      padding: isMobile ? 12 : 16,
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
        <h3 style={{ color: '#01ff69', margin: 0, fontSize: 'clamp(16px, 2.5vw, 20px)' }}>Selecionar Jogadores</h3>
        <Tag color="#000000" style={{ fontWeight: 900 }}>{selectedPlayersCount} / {needed}</Tag>
      </div>

      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 12,
        flexShrink: 0,
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <Input
          placeholder="Buscar jogador..."
          value={playerQuery}
          onChange={(e) => setPlayerQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          onClick={goNext}
          disabled={!canGoNext}
          style={{ fontWeight: 'bold', height: 40, whiteSpace: 'nowrap' }}
        >
          Próximo: Skills
        </Button>
      </div>

      {playersLoading ? (
        <div style={{ padding: 16, flexShrink: 0, textAlign: 'center' }}><Spin /></div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          <Row gutter={[12, 12]}>
            {filteredPlayers.map((p) => {
              const checked = selectedPlayerIds.includes(p.id);
              const isDisabled = !checked && selectedPlayerIds.length >= needed;
              return (
                <Col xs={12} sm={8} md={6} lg={4} key={p.id}>
                  <Checkbox
                    checked={checked}
                    disabled={isDisabled}
                    onChange={(e: CheckboxChangeEvent) => togglePlayer(p.id, e.target.checked)}
                    style={{ color: isDisabled ? '#666' : '#ccc' }}
                  >
                    {p.name}
                  </Checkbox>
                </Col>
              );
            })}
            {filteredPlayers.length === 0 && (
              <Col span={24}>
                <Text style={{ color: '#aaa' }}>Nenhum jogador encontrado.</Text>
              </Col>
            )}
          </Row>
        </div>
      )}
    </div>
  );

  const SkillsStep = (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 16 }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 8,
        padding: isMobile ? 12 : 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ color: '#01ff69', margin: 0, fontSize: 'clamp(16px, 2.5vw, 20px)' }}>Selecionar Skills</h3>
          <Tag color="green" style={{ fontWeight: 900 }}>{selectedSkillsCount}</Tag>
        </div>
        <Input placeholder="Buscar skill..." value={skillQuery} onChange={(e) => setSkillQuery(e.target.value)} style={{ marginBottom: 12 }} />
        {skillsLoading ? (
          <div style={{ padding: 16, textAlign: 'center' }}><Spin /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "40vh", overflow: "auto" }}>
            {filteredSkills.map((s) => {
              const checked = selectedSkillMap[s.id] != null;
              const weight = selectedSkillMap[s.id] ?? 1;
              return (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 10, padding: "8px 12px", border: "1px solid #333",
                  borderRadius: 6, background: "#262626", flexWrap: 'wrap',
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Checkbox checked={checked} onChange={(e) => toggleSkill(s.id, e.target.checked)} />
                    <span style={{ fontWeight: 700, color: "#fff" }}>{s.name}</span>
                  </div>
                  {checked ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Text style={{ color: '#aaa', fontWeight: 600 }}>Peso</Text>
                      <InputNumber min={0} max={10} step={0.5} value={weight} onChange={(v) => setSkillWeight(s.id, Number(v ?? 1))} style={{ width: 70 }} />
                    </div>
                  ) : (
                    <Text style={{ color: '#aaa', fontWeight: 600 }}>—</Text>
                  )}
                </div>
              );
            })}
            {filteredSkills.length === 0 && <div style={{ padding: 12, color: '#aaa', fontWeight: 600 }}>Nenhuma skill encontrada.</div>}
          </div>
        )}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <Button onClick={goBackToPlayers} size={isMobile ? 'small' : 'middle'}>Voltar</Button>
          <Button type="primary" onClick={generate} disabled={!canGenerate || generating} loading={generating}
            size={isMobile ? 'small' : 'middle'} style={{ fontWeight: 'bold' }}>
            {generating ? "Gerando..." : "Gerar Times"}
          </Button>
        </div>
      </div>
      <div style={{
        backgroundColor: '#1a1a1a', border: '1px solid #333',
        borderRadius: 8, padding: isMobile ? 12 : 16, height: "fit-content",
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ color: '#01ff69', margin: 0, fontSize: 'clamp(16px, 2.5vw, 20px)' }}>⚖️ Pesos e Regras</h3>
          <Tag color="blue">M/F</Tag>
        </div>
        <div style={{ borderTop: "1px solid #333", paddingTop: 12 }}>
          <Checkbox checked={sexBalanceEnabled} onChange={(e) => setSexBalanceEnabled(e.target.checked)} style={{ marginBottom: 8 }}>
            Balancear quantidade de homens por time
          </Checkbox>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <Text style={{ color: "#fff", fontWeight: 700 }}>Dif. máxima de homens:</Text>
            <InputNumber min={0} max={10} value={maxMaleDiff} onChange={(v) => setMaxMaleDiff(Number(v ?? 1))} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <Text style={{ color: "#fff", fontWeight: 700 }}>Multiplicador M:</Text>
            <InputNumber min={0.5} max={2} step={0.01} value={multM} onChange={(v) => setMultM(Number(v ?? 1))} />
            <Text style={{ color: "#fff", fontWeight: 700 }}>Multiplicador F:</Text>
            <InputNumber min={0.5} max={2} step={0.01} value={multF} onChange={(v) => setMultF(Number(v ?? 0.92))} />
          </div>
          <div style={{ borderTop: "1px solid #333", paddingTop: 12 }}>
            <Checkbox checked={balancePositions} onChange={(e) => setBalancePositions(e.target.checked)}>
              Garantir posições obrigatórias
            </Checkbox>
            {balancePositions && (
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: "#fff", fontWeight: 700 }}>Posições obrigatórias:</Text>
                <Select
                  mode="multiple"
                  placeholder="Selecione"
                  value={requiredPositions}
                  onChange={setRequiredPositions}
                  style={{ width: "100%" }}
                  options={availablePositions.map(p => ({ value: p.id, label: p.name }))}
                  styles={{ placeholder: { color: '#ffffff80' } }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const ResultStep = (
    <div style={{
      backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
      padding: isMobile ? 12 : 16, height: "calc(100dvh - 200px)",
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12, flexShrink: 0 }}>
        <h2 style={{ color: '#01ff69', margin: 0, fontSize: 'clamp(18px, 3vw, 24px)' }}>Times Gerados</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {teams.length ? <Tag color="green" style={{ fontWeight: 700 }}>{teams.length} times</Tag> : null}
          <Button onClick={resetAll} size={isMobile ? 'small' : 'middle'}>Novo sorteio</Button>
        </div>
      </div>
      {generating ? (
        <div style={{ textAlign: 'center', padding: 40, flex: 1 }}>
          <Spin /><div style={{ marginTop: 10, color: '#aaa', fontWeight: 600 }}>Calculando balanceamento...</div>
        </div>
      ) : teams.length ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12, flexShrink: 0 }}>
            <span style={{ color: '#01ff69', fontWeight: 700, fontSize: 'clamp(12px, 1.5vw, 14px)' }}>
              Session: <span style={{ color: '#fff' }}>{result?.sessionId}</span>
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={generate} disabled={!canGenerate || generating} icon={<SwapOutlined />} size={isMobile ? 'small' : 'middle'}>Reembaralhar</Button>
              <Button type="default" onClick={() => setAdjustModalOpen(true)} size={isMobile ? 'small' : 'middle'}>Ajustar Times</Button>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setCourtModalOpen(true)} size={isMobile ? 'small' : 'middle'}>Iniciar Sessão</Button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {renderTeamsGrid(true)}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#aaa', flex: 1 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <h3 style={{ color: '#fff', marginBottom: 8 }}>Nenhum time gerado</h3><p>Volte e gere novamente.</p>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      padding: isMobile ? 8 : 'clamp(12px, 2vw, 24px)',
      maxWidth: 1400, margin: '0 auto', width: '100%',
      boxSizing: 'border-box', height: 'calc(100vh - 90px)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {TopBar}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {step === "players" && PlayersStep}
          {step === "skills" && SkillsStep}
          {step === "result" && ResultStep}
        </div>
      </div>
      {result?.sessionId && (
        <CourtSetupModal
          open={courtModalOpen}
          sessionId={result.sessionId}
          teams={teams.map((team) => ({
            teamIndex: team.teamIndex,
            name: `Time ${team.teamIndex}`,
            players: team.players.map((player, playerIndex) => ({
              id: player.playerId || `${team.teamIndex}-${player.name}-${playerIndex}`,
              name: player.name,
            })),
          }))}
          onCancel={() => setCourtModalOpen(false)}
          onConfirm={handleStartSession}
        />
      )}
      <Modal
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#01ff69", fontSize: 'clamp(20px, 3vw, 28px)' }}>Ajustar Times</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="primary" onClick={() => setAdjustModalOpen(false)}>Concluído</Button>
              <Button onClick={() => setAdjustModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        }
        open={adjustModalOpen}
        onCancel={() => setAdjustModalOpen(false)}
        footer={null}
        closable={false}
        width="100vw"
        style={{ top: 0, maxWidth: "100vw", height: "100vh", padding: 0, overflow: "hidden" }}
        styles={{ body: { height: "calc(100vh - 86px)", padding: isMobile ? 12 : 24, overflow: "auto", backgroundColor: "#0d0d0d" } }}
      >
        {teams.length > 0 ? renderTeamsGrid(false) : (
          <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Nenhum time disponível para ajuste.</div>
        )}
      </Modal>
    </div>
  );
};
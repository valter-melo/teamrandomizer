import { useCallback, useMemo, useState } from "react";
import { Tabs, message, Spin } from "antd";
import type { TabsProps } from "antd";

import FileUpload from "../components/FileUpload";
import PlayerColumn from "../components/PlayerColumn";
import DbTeamGenerator from "../features/db/DbTeamGenerator";

import AppButton from "../components/AppButton";
import { http } from "../api/http";

import "../styles/team-generator.css";

// ===== Types do modo TXT =====
export type PlayerColumns = {
  coluna1: string[];
  coluna2: string[];
  coluna3: string[];
  coluna4: string[];
};

interface TeamTxt {
  nome: string;
  jogadores: string[];
}

type TabKey = "upload" | "database" | "history";
type PotPlayersMap = { [pot: number]: string[] };

const DEFAULT_MAX_TEAMS = 8;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TeamGenerator() {
  const [activeTab, setActiveTab] = useState<TabKey>("upload");
  const [loading, setLoading] = useState(false);

  // ===== TXT state =====
  const [playersTxt, setPlayersTxt] = useState<PlayerColumns>({
    coluna1: [],
    coluna2: [],
    coluna3: [],
    coluna4: [],
  });
  const [teamsTxt, setTeamsTxt] = useState<TeamTxt[]>([]);
  const [fileName, setFileName] = useState("");
  const [key, setKey] = useState(0);
  const [maxTeamsTxt, setMaxTeamsTxt] = useState<number>(DEFAULT_MAX_TEAMS);

  const [, setDatabasePlayersMap] = useState<PotPlayersMap>({ 1: [], 2: [], 3: [], 4: [] });

  // ===== HISTORY =====
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // =========================================================================================
  // TXT: Parse/Upload
  // =========================================================================================
  const parsePlayers = useCallback((text: string): PlayerColumns => {
    const lines = text.split("\n");
    let currentColumn: keyof PlayerColumns | null = null;

    const parsedPlayers: PlayerColumns = { coluna1: [], coluna2: [], coluna3: [], coluna4: [] };

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const lowerLine = trimmedLine.toLowerCase();

      if (lowerLine.includes("pote 1") || lowerLine.includes("avançado") || lowerLine.includes("avancado")) {
        currentColumn = "coluna1";
        return;
      }
      if (lowerLine.includes("pote 2") || lowerLine.includes("intermediário superior") || lowerLine.includes("intermediario superior")) {
        currentColumn = "coluna2";
        return;
      }
      if (lowerLine.includes("pote 3") || lowerLine.includes("intermediário") || lowerLine.includes("intermediario")) {
        currentColumn = "coluna3";
        return;
      }
      if (lowerLine.includes("pote 4") || lowerLine.includes("iniciante")) {
        currentColumn = "coluna4";
        return;
      }

      if (lowerLine.includes("pote")) {
        const match = lowerLine.match(/pote\s*(\d)/);
        if (match) {
          const colNum = parseInt(match[1], 10);
          if (colNum >= 1 && colNum <= 4) currentColumn = `coluna${colNum}` as keyof PlayerColumns;
        }
        return;
      }

      if (!currentColumn) return;

      const cleanName = trimmedLine
        .replace(/^\d+[\.\-\)]\s*/, "")
        .replace(/^-\s*/, "")
        .replace(/^\*\s*/, "")
        .trim();

      if (cleanName.length > 1 && /[a-zA-ZÀ-ÿ]/.test(cleanName)) {
        parsedPlayers[currentColumn].push(cleanName);
      }
    });

    return parsedPlayers;
  }, []);

  const handleFileUpload = useCallback(
    (file: File, content: string) => {
      setFileName(file.name);
      const parsed = parsePlayers(content);

      const columns = Object.keys(parsed) as Array<keyof PlayerColumns>;

      const issues: string[] = [];
      columns.forEach((col) => {
        const count = parsed[col].length;
        if (count < 4) issues.push(`${col}: ${count} jogadores (mínimo 4)`);
      });

      if (issues.length > 0) {
        alert(`Atenção: no arquivo ${file.name}\n\n${issues.join("\n")}\n\nÉ necessário pelo menos 4 jogadores por coluna.`);
        return;
      }

      const counts = columns.map((col) => parsed[col].length);
      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);

      if (minCount !== maxCount) {
        const warning =
          `As colunas têm quantidades diferentes de jogadores:\n\n` +
          `• Pote 1: ${parsed.coluna1.length}\n` +
          `• Pote 2: ${parsed.coluna2.length}\n` +
          `• Pote 3: ${parsed.coluna3.length}\n` +
          `• Pote 4: ${parsed.coluna4.length}\n\n` +
          `Serão gerados até ${Math.min(DEFAULT_MAX_TEAMS, minCount)} times (limitado pela menor coluna).`;

        if (!window.confirm(warning + "\n\nDeseja continuar?")) return;
      }

      setPlayersTxt(parsed);
      setTeamsTxt([]);
      setActiveTab("upload");

      const newMaxPossible = Math.min(DEFAULT_MAX_TEAMS, minCount);
      setMaxTeamsTxt((prev) => clamp(prev, 1, newMaxPossible));
    },
    [parsePlayers]
  );

  const shuffleArray = useCallback((array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const generateTeamsTxt = useCallback(() => {
    const { coluna1, coluna2, coluna3, coluna4 } = playersTxt;
    const minPlayers = Math.min(coluna1.length, coluna2.length, coluna3.length, coluna4.length);

    if (minPlayers < 4) {
      alert("Não há jogadores suficientes em todas as colunas. Mínimo necessário: 4 jogadores por coluna.");
      return;
    }

    const maxPossible = Math.min(DEFAULT_MAX_TEAMS, minPlayers);
    const effectiveTeams = clamp(maxTeamsTxt, 1, maxPossible);

    const shuffledCol1 = shuffleArray(coluna1);
    const shuffledCol2 = shuffleArray(coluna2);
    const shuffledCol3 = shuffleArray(coluna3);
    const shuffledCol4 = shuffleArray(coluna4);

    const newTeams: TeamTxt[] = [];
    for (let i = 0; i < effectiveTeams; i++) {
      newTeams.push({
        nome: `Time ${i + 1}`,
        jogadores: [shuffledCol1[i], shuffledCol2[i], shuffledCol3[i], shuffledCol4[i]],
      });
    }

    setMaxTeamsTxt(effectiveTeams);
    setTeamsTxt(newTeams);
  }, [playersTxt, maxTeamsTxt, shuffleArray]);

  const copyTeamsTxtToClipboard = useCallback(() => {
    const text = teamsTxt
      .map((team) => `${team.nome}:\n${team.jogadores.map((j, i) => `  ${i + 1}. ${j}`).join("\n")}`)
      .join("\n\n");

    navigator.clipboard
      .writeText(text)
      .then(() => alert("Times copiados para a área de transferência!"))
      .catch(() => alert("Erro ao copiar. Tente novamente."));
  }, [teamsTxt]);

  const resetAllTxt = useCallback(() => {
    setPlayersTxt({ coluna1: [], coluna2: [], coluna3: [], coluna4: [] });
    setTeamsTxt([]);
    setFileName("");
    setMaxTeamsTxt(DEFAULT_MAX_TEAMS);
    setKey((prev) => prev + 1);
    setDatabasePlayersMap({ 1: [], 2: [], 3: [], 4: [] });
    setActiveTab("upload");
  }, []);

  // =========================================================================================
  // HISTORY
  // =========================================================================================
  const apiLoadHistoryOnce = useCallback(async () => {
    if (historyLoaded) return;
    setLoading(true);
    try {
      const { data } = await http.get<any[]>("/history");
      setHistory(data);
      setHistoryLoaded(true);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }, [historyLoaded]);

  // =========================================================================================
  // Derived
  // =========================================================================================
  const hasPlayersTxt = useMemo(() => Object.values(playersTxt).some((col) => col.length > 0), [playersTxt]);
  const hasTeamsTxt = teamsTxt.length > 0;
  const canGenerateTxt = useMemo(() => Object.values(playersTxt).every((col) => col.length >= 4), [playersTxt]);
  const totalPlayersTxt = useMemo(() => Object.values(playersTxt).reduce((sum, col) => sum + col.length, 0), [playersTxt]);

  const minPlayersTxt = hasPlayersTxt ? Math.min(...Object.values(playersTxt).map((col) => col.length)) : 0;
  const maxPossibleTeamsTxt = hasPlayersTxt ? Math.min(DEFAULT_MAX_TEAMS, minPlayersTxt) : 0;

  const renderTeamsConfigTxt = () => {
    if (!hasPlayersTxt) return null;

    return (
      <div className="teams-config-compact ui-card">
        <div className="config-header-compact">
          <span className="config-title">⚙️ Configuração</span>
          <span className="possible-teams-compact ui-badge">Máx: {maxPossibleTeamsTxt} times</span>
        </div>

        <div className="config-controls-compact">
          <div className="input-group-compact">
            <label>Times a gerar:</label>

            <div className="teams-input-compact">
              <input
                type="number"
                min={1}
                max={Math.max(1, maxPossibleTeamsTxt)}
                value={clamp(maxTeamsTxt, 1, Math.max(1, maxPossibleTeamsTxt))}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  const safe = Number.isFinite(parsed) ? parsed : 1;
                  setMaxTeamsTxt(clamp(safe, 1, Math.max(1, maxPossibleTeamsTxt || 1)));
                }}
                className="teams-number-input ui-input"
              />

              <div className="quick-buttons-compact">
                {[4, 6, 8].map((n) => {
                  const disabled = maxPossibleTeamsTxt > 0 ? n > maxPossibleTeamsTxt : true;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={disabled}
                      onClick={() => setMaxTeamsTxt(clamp(n, 1, Math.max(1, maxPossibleTeamsTxt)))}
                      className={maxTeamsTxt === n ? "active" : ""}
                      title={disabled ? `Disponível até ${maxPossibleTeamsTxt}` : `Gerar ${n} times`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="config-info-compact">
            <span>{totalPlayersTxt} jogadores selecionados</span>
          </div>
        </div>
      </div>
    );
  };

  const tabsItems: TabsProps["items"] = [
    { key: "upload", label: "Upload TXT" },
    { key: "database", label: "Banco de Dados" },
    { key: "history", label: "Histórico" },
  ];

  const onTabChange = useCallback(
    async (k: string) => {
      const next = k as TabKey;
      setActiveTab(next);
      if (next === "history") await apiLoadHistoryOnce();
    },
    [apiLoadHistoryOnce]
  );

  // =========================================================================================
  // Render
  // =========================================================================================
  return (
    <div className="team-generator-compact">
      {/* Header */}
      <div className="compact-header">
        <div className="logo-title">
          <img src="/BoraVer.svg" alt="Logo" className="compact-logo" />
          <div className="title-section">
            <h1>Gerador de Times</h1>
            <p className="subtitle">Sorteio balanceado</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="main-tabs">
        <div style={{ padding: "0 20px" }}>
          <Tabs items={tabsItems} activeKey={activeTab} onChange={onTabChange} />
        </div>
      </div>

      {/* UPLOAD TXT: continua 2 colunas COM resultado próprio */}
      {activeTab === "upload" && (
        <div className="main-content">
          {/* LEFT */}
          <div className="controls-column ui-scroll">
            <div className="upload-section-compact ui-card">
              <FileUpload key={key} onFileUpload={handleFileUpload} />

              {fileName && (
                <div className="file-info">
                  <span className="file-icon">📁</span>
                  <span className="file-name-text" title={fileName}>
                    {fileName}
                  </span>
                </div>
              )}
            </div>

            {hasPlayersTxt && (
              <>
                {renderTeamsConfigTxt()}

                <div className="players-section-compact ui-card">
                  <div className="players-header-compact">
                    <h3>Jogadores Carregados</h3>
                    <span className="players-count ui-badge">{totalPlayersTxt}</span>
                  </div>

                  <div className="columns-grid">
                    <PlayerColumn players={playersTxt.coluna1} pot={1} compact maxTeams={maxTeamsTxt} />
                    <PlayerColumn players={playersTxt.coluna2} pot={2} compact maxTeams={maxTeamsTxt} />
                    <PlayerColumn players={playersTxt.coluna3} pot={3} compact maxTeams={maxTeamsTxt} />
                    <PlayerColumn players={playersTxt.coluna4} pot={4} compact maxTeams={maxTeamsTxt} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT (somente TXT) */}
          <div className="results-column ui-scroll">
            <div className="results-section ui-card">
              <div className="results-header">
                <h2>Times Gerados (TXT)</h2>

                <div className="results-stats">
                  {hasTeamsTxt && <span className="teams-count-badge">{teamsTxt.length} times</span>}

                  <div className="action-buttons-compact">
                    <AppButton tone="generate" onClick={generateTeamsTxt} disabled={!canGenerateTxt} title="Gerar times (TXT)">
                      Gerar
                    </AppButton>

                    {hasTeamsTxt && (
                      <AppButton tone="copy" onClick={copyTeamsTxtToClipboard} title="Copiar">
                        Copiar
                      </AppButton>
                    )}

                    {hasPlayersTxt && (
                      <AppButton tone="save" onClick={resetAllTxt} title="Reiniciar">
                        Reiniciar
                      </AppButton>
                    )}
                  </div>
                </div>
              </div>

              {hasTeamsTxt ? (
                <>
                  <div className="teams-summary">
                    <button type="button" onClick={generateTeamsTxt} className="reshuffle-btn" title="Reembaralhar">
                      Reembaralhar
                    </button>
                  </div>

                  <div className="tg-teams-grid ui-scroll">
                    {teamsTxt.map((team, index) => (
                      <div key={index} className="tg-team-card">
                        <div className="tg-team-name">{team.nome}</div>

                        <div className="tg-team-players">
                          {team.jogadores.map((jogador, idx) => (
                            <div key={idx} className="tg-team-player">
                              <span className="tg-player-name" title={jogador}>
                                {jogador}
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
                  <div className="empty-icon">🏐</div>
                  <h3>Nenhum time gerado</h3>
                  <p>
                    {canGenerateTxt
                      ? `Clique em "Gerar" para criar ${clamp(maxTeamsTxt, 1, Math.max(1, maxPossibleTeamsTxt || 1))} times balanceados`
                      : "Faça upload de um arquivo com jogadores"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DATABASE: tela cheia / wizard, COM resultado próprio dentro do DbTeamGenerator */}
      {activeTab === "database" && <DbTeamGenerator />}

      {/* HISTORY: tela própria */}
      {activeTab === "history" && (
        <div className="main-content">
          <div className="ui-card" style={{ padding: 16 }}>
            {loading ? (
              <div style={{ padding: 28, display: "flex", justifyContent: "center" }}>
                <Spin />
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>Histórico</h3>
                <p>Carregue e liste sorteios anteriores aqui (via endpoint).</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
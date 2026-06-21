import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Select, Spin, Tag, Typography, message } from 'antd';
import {
  CalendarOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  TrophyOutlined,
} from '@ant-design/icons';

import { http } from '../api/http';
import { ScoreboardModal } from '../components/championship/ScoreboardModal';

const { Title, Text } = Typography;

interface CourtSelection {
  homeTeam: number | null;
  awayTeam: number | null;
}

interface FriendlyTeam {
  teamIndex: number;
  teamName?: string;
  playerNames?: string[];
}

interface FriendlyMatch {
  homeTeamIndex: number;
  awayTeamIndex: number;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore: number;
  awayScore: number;
  winnerTeamIndex: number;
  walkover?: boolean;
}

interface FriendlyCourt {
  name: string;
  teams: FriendlyTeam[];
  matches?: FriendlyMatch[];
}

interface FriendlySessionDetails {
  dateFormatted?: string;
  courts: FriendlyCourt[];
  setsToWin?: number;
  pointsPerSet?: number;
}

interface CourtTeamStats {
  team: FriendlyTeam;
  wins: number;
  matches: number;
  playersCount: number;
}

export default function FriendlySessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [messageApi, contextHolder] = message.useMessage();

  const [details, setDetails] = useState<FriendlySessionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [showScoreboard, setShowScoreboard] = useState(false);

  const [scoreboardData, setScoreboardData] = useState<{
    courtName: string;
    homeTeam: number;
    awayTeam: number;
  } | null>(null);

  const [courtSelections, setCourtSelections] = useState<Record<string, CourtSelection>>({});

  const getTeamName = (team?: FriendlyTeam, fallbackIndex?: number) => {
    if (team?.teamName) return team.teamName;
    if (fallbackIndex !== undefined) return `Time ${fallbackIndex}`;
    return 'Time';
  };

  const buildCourtStats = (court: FriendlyCourt): CourtTeamStats[] => {
    const winsMap: Record<number, number> = {};
    const matchesMap: Record<number, number> = {};

    court.teams.forEach((team) => {
      winsMap[team.teamIndex] = 0;
      matchesMap[team.teamIndex] = 0;
    });

    court.matches?.forEach((match) => {
      matchesMap[match.homeTeamIndex] = (matchesMap[match.homeTeamIndex] || 0) + 1;
      matchesMap[match.awayTeamIndex] = (matchesMap[match.awayTeamIndex] || 0) + 1;

      if (match.winnerTeamIndex !== null && match.winnerTeamIndex !== undefined) {
        winsMap[match.winnerTeamIndex] = (winsMap[match.winnerTeamIndex] || 0) + 1;
      }
    });

    return court.teams
      .map((team) => ({
        team,
        wins: winsMap[team.teamIndex] || 0,
        matches: matchesMap[team.teamIndex] || 0,
        playersCount: team.playerNames?.length || 0,
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.team.teamIndex - b.team.teamIndex;
      });
  };

  const loadDetails = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);

      const res = await http.get<FriendlySessionDetails>(
        `/game-sessions/${sessionId}/details`,
      );

      setDetails(res.data);

      setCourtSelections((prev) => {
        const next: Record<string, CourtSelection> = {};

        res.data.courts.forEach((court) => {
          next[court.name] = prev[court.name] || {
            homeTeam: null,
            awayTeam: null,
          };
        });

        return next;
      });
    } catch {
      messageApi.error('Não foi possível carregar os dados da sessão.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, messageApi]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const pageStats = useMemo(() => {
    if (!details) {
      return {
        totalCourts: 0,
        totalTeams: 0,
        totalMatches: 0,
      };
    }

    return {
      totalCourts: details.courts.length,
      totalTeams: details.courts.reduce(
        (acc, court) => acc + court.teams.length,
        0,
      ),
      totalMatches: details.courts.reduce(
        (acc, court) => acc + (court.matches?.length || 0),
        0,
      ),
    };
  }, [details]);

  const handleTeamSelect = (
    courtName: string,
    type: 'home' | 'away',
    teamIndex: number | null,
  ) => {
    setCourtSelections((prev) => {
      const current = prev[courtName] || {
        homeTeam: null,
        awayTeam: null,
      };

      if (type === 'home') {
        return {
          ...prev,
          [courtName]: {
            homeTeam: teamIndex,
            awayTeam: current.awayTeam === teamIndex ? null : current.awayTeam,
          },
        };
      }

      return {
        ...prev,
        [courtName]: {
          ...current,
          awayTeam: teamIndex,
        },
      };
    });
  };

  const openScoreboard = (
    courtName: string,
    homeTeam: number,
    awayTeam: number,
  ) => {
    setScoreboardData({
      courtName,
      homeTeam,
      awayTeam,
    });

    setShowScoreboard(true);
  };

  const handleSaveFriendly = async (matchData: any) => {
    if (!scoreboardData || !sessionId) return;

    try {
      await http.post(`/game-sessions/${sessionId}/matches`, {
        courtName: scoreboardData.courtName,
        homeTeamIndex: scoreboardData.homeTeam,
        awayTeamIndex: scoreboardData.awayTeam,
        homeScore: matchData.homeScore,
        awayScore: matchData.awayScore,
        walkover: matchData.walkover || false,
        winnerTeamIndex: matchData.winnerTeamIndex,
      });

      setCourtSelections((prev) => ({
        ...prev,
        [scoreboardData.courtName]: {
          homeTeam: null,
          awayTeam: null,
        },
      }));

      setShowScoreboard(false);
      setScoreboardData(null);

      await loadDetails();

      messageApi.success('Partida registrada com sucesso.');
    } catch {
      messageApi.error('Não foi possível salvar a partida.');
      throw new Error('Erro ao salvar partida amistosa.');
    }
  };

  if (loading || !details) {
    return (
      <div className="friendly-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <main className="friendly-page">
      {contextHolder}

      <header className="friendly-header">
        <div>
          <Title level={2} className="friendly-title">
            <CalendarOutlined />
            {details.dateFormatted || 'Sessão de Times'}
          </Title>
        </div>
      </header>

      <section className="courts-list">
        {details.courts.map((court) => {
          const selection = courtSelections[court.name] || {
            homeTeam: null,
            awayTeam: null,
          };

          const canStart =
            selection.homeTeam !== null &&
            selection.awayTeam !== null &&
            selection.homeTeam !== selection.awayTeam;

          const courtStats = buildCourtStats(court);
          const hasWins = courtStats.some((item) => item.wins > 0);

          const statsByTeam = courtStats.reduce<Record<number, CourtTeamStats>>(
            (acc, item) => {
              acc[item.team.teamIndex] = item;
              return acc;
            },
            {},
          );

          const selectedHomeTeam = court.teams.find(
            (team) => team.teamIndex === selection.homeTeam,
          );

          const selectedAwayTeam = court.teams.find(
            (team) => team.teamIndex === selection.awayTeam,
          );

          return (
            <Card
              key={court.name}
              className="court-card"
              title={
                <div className="court-header">
                  <div>                    
                    <h2 className="court-title">{court.name}</h2>
                  </div>
                </div>
              }
            >
              <section className="ranking-panel">
                <div className="ranking-title">
                  <TrophyOutlined />
                  <span>Ranking da quadra</span>
                </div>

                {hasWins ? (
                  <div className="ranking-list">
                    {courtStats.map((item, index) => (
                      <div
                        key={item.team.teamIndex}
                        className={`ranking-item ${
                          index === 0 && item.wins > 0 ? 'first' : ''
                        }`}
                      >
                        <div className="ranking-position">{index + 1}º</div>

                        <div className="ranking-info">
                          <strong>{getTeamName(item.team)}</strong>
                          <span>
                            {item.wins} vitória{item.wins === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text className="ranking-empty">
                    Nenhuma partida registrada ainda nesta quadra.
                  </Text>
                )}
              </section>

              <section className="teams-grid">
                {court.teams.map((team) => {
                  const stats = statsByTeam[team.teamIndex];

                  const selectedAsHome = selection.homeTeam === team.teamIndex;
                  const selectedAsAway = selection.awayTeam === team.teamIndex;

                  return (
                    <article
                      key={team.teamIndex}
                      className={[
                        'friendly-team-card',
                        selectedAsHome ? 'home' : '',
                        selectedAsAway ? 'away' : '',
                      ].join(' ')}
                    >
                      <div className="friendly-team-header">
                        <div>
                          <h3 className="friendly-team-name">
                            {getTeamName(team)}
                          </h3>
                        </div>

                        <div className="friendly-team-badges">
                          {selectedAsHome && (
                            <span className="friendly-role-badge home">
                              Casa
                            </span>
                          )}

                          {selectedAsAway && (
                            <span className="friendly-role-badge away">
                              Visitante
                            </span>
                          )}

                          <span className="friendly-wins-badge">
                            {stats?.wins || 0}V
                          </span>
                        </div>
                      </div>

                      <div className="friendly-players-list">
                        {team.playerNames?.length ? (
                          team.playerNames.map((player) => (
                            <span key={player} className="friendly-player-chip">
                              {player}
                            </span>
                          ))
                        ) : (
                          <Text className="friendly-players-empty">
                            Nenhum jogador
                          </Text>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="match-builder">
                <div className="match-field">
                  <label>Time da casa</label>

                  <Select<number>
                    allowClear
                    showSearch
                    placeholder="Selecione o time"
                    className="friendly-select"
                    optionFilterProp="label"
                    value={selection.homeTeam ?? undefined}
                    onChange={(value) =>
                      handleTeamSelect(court.name, 'home', value ?? null)
                    }
                    options={court.teams.map((team) => {
                      const stats = statsByTeam[team.teamIndex];

                      return {
                        value: team.teamIndex,
                        label: `${getTeamName(team)}${
                          stats?.wins ? ` • ${stats.wins}V` : ''
                        }`,
                      };
                    })}
                  />
                </div>

                <div className="versus-box">
                  <span>VS</span>
                </div>

                <div className="match-field">
                  <label>Time visitante</label>

                  <Select<number>
                    allowClear
                    showSearch
                    placeholder="Selecione o time"
                    className="friendly-select"
                    optionFilterProp="label"
                    value={selection.awayTeam ?? undefined}
                    onChange={(value) =>
                      handleTeamSelect(court.name, 'away', value ?? null)
                    }
                    options={court.teams
                      .filter((team) => team.teamIndex !== selection.homeTeam)
                      .map((team) => {
                        const stats = statsByTeam[team.teamIndex];

                        return {
                          value: team.teamIndex,
                          label: `${getTeamName(team)}${
                            stats?.wins ? ` • ${stats.wins}V` : ''
                          }`,
                        };
                      })}
                  />
                </div>

                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  disabled={!canStart}
                  className="friendly-start-btn"
                  style={{ color: '#000' }}
                  onClick={() => {
                    if (!canStart) return;

                    openScoreboard(
                      court.name,
                      selection.homeTeam!,
                      selection.awayTeam!,
                    );
                  }}
                >
                  Iniciar Jogo
                </Button>
              </section>
            </Card>
          );
        })}
      </section>

      {showScoreboard && scoreboardData && (
        <ScoreboardModal
          visible={showScoreboard}
          onClose={() => setShowScoreboard(false)}
          championshipId=""
          matchId=""
          homeTeamIndex={scoreboardData.homeTeam}
          awayTeamIndex={scoreboardData.awayTeam}
          generationSessionId={sessionId}
          onSave={handleSaveFriendly}
          onSuccess={() => setShowScoreboard(false)}
          setsToWin={details.setsToWin || 1}
          pointsPerSet={details.pointsPerSet || 12}
          homeTeamName={
            details.courts
              .find((court) => court.name === scoreboardData.courtName)
              ?.teams.find((team) => team.teamIndex === scoreboardData.homeTeam)
              ?.teamName || `Time ${scoreboardData.homeTeam}`
          }
          awayTeamName={
            details.courts
              .find((court) => court.name === scoreboardData.courtName)
              ?.teams.find((team) => team.teamIndex === scoreboardData.awayTeam)
              ?.teamName || `Time ${scoreboardData.awayTeam}`
          }
        />
      )}
    </main>
  );
}
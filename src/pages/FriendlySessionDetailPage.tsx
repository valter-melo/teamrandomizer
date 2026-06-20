import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Select, Row, Col, Typography, Spin, Tag } from 'antd';
import { PlayCircleOutlined, TeamOutlined, TrophyOutlined } from '@ant-design/icons';
import { http } from '../api/http';
import { ScoreboardModal } from '../components/championship/ScoreboardModal';
import { useMediaQuery } from 'react-responsive';

const { Title, Text } = Typography;

interface CourtSelection {
  homeTeam: number | null;
  awayTeam: number | null;
}

export default function FriendlySessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [details, setDetails] = useState<any>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [scoreboardData, setScoreboardData] = useState<{
    courtName: string;
    homeTeam: number;
    awayTeam: number;
  } | null>(null);

  const [courtSelections, setCourtSelections] = useState<Record<string, CourtSelection>>({});

  useEffect(() => {
    http.get(`/game-sessions/${sessionId}/details`).then(res => {
      setDetails(res.data);
      const initial: Record<string, CourtSelection> = {};
      res.data.courts.forEach((court: any) => {
        initial[court.name] = { homeTeam: null, awayTeam: null };
      });
      setCourtSelections(initial);
    });
  }, [sessionId]);

  const handleTeamSelect = (courtName: string, type: 'home' | 'away', teamIndex: number) => {
    setCourtSelections(prev => ({
      ...prev,
      [courtName]: {
        ...prev[courtName],
        [type === 'home' ? 'homeTeam' : 'awayTeam']: teamIndex,
      },
    }));
  };

  const openScoreboard = (courtName: string, homeTeam: number, awayTeam: number) => {
    setScoreboardData({ courtName, homeTeam, awayTeam });
    setShowScoreboard(true);
  };

  const handleSaveFriendly = async (matchData: any) => {
    if (!scoreboardData) return;
    await http.post(`/game-sessions/${sessionId}/matches`, {
      courtName: scoreboardData.courtName,
      homeTeamIndex: scoreboardData.homeTeam,
      awayTeamIndex: scoreboardData.awayTeam,
      homeScore: matchData.homeScore,
      awayScore: matchData.awayScore,
      walkover: matchData.walkover || false,
      winnerTeamIndex: matchData.winnerTeamIndex,
    });
    const res = await http.get(`/game-sessions/${sessionId}/details`);
    setDetails(res.data);
  };

  if (!details) return <Spin size="large" style={{ display: 'block', marginTop: 50 }} />;

  return (
    <div style={{
      padding: isMobile ? 8 : 'clamp(12px, 2vw, 24px)',
      maxWidth: 1400,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <Title level={2} style={{ color: '#01ff69', marginBottom: 24, fontSize: 'clamp(20px, 4vw, 28px)' }}>
        <TeamOutlined style={{ marginRight: 12 }} />
        {details.dateFormatted || 'Sessão de Times'}
      </Title>

      {details.courts.map((court: any) => {
        const selection = courtSelections[court.name] || { homeTeam: null, awayTeam: null };
        const canStart = selection.homeTeam && selection.awayTeam && selection.homeTeam !== selection.awayTeam;

        // Ranking de vitórias por quadra
        const winsMap: Record<string, number> = {};
        court.teams.forEach((t: any) => {
          winsMap[t.teamName || `Time ${t.teamIndex}`] = 0;
        });
        court.matches?.forEach((m: any) => {
          if (m.winnerTeamIndex === m.homeTeamIndex) {
            const name = m.homeTeamName || `Time ${m.homeTeamIndex}`;
            winsMap[name] = (winsMap[name] || 0) + 1;
          } else if (m.winnerTeamIndex === m.awayTeamIndex) {
            const name = m.awayTeamName || `Time ${m.awayTeamIndex}`;
            winsMap[name] = (winsMap[name] || 0) + 1;
          }
        });
        const sorted = Object.entries(winsMap).sort((a, b) => b[1] - a[1]);
        const hasWins = sorted.some(([, v]) => v > 0);

        return (
          <Card
            key={court.name}
            title={<span style={{ color: '#01ff69', fontSize: 'clamp(18px, 2.5vw, 24px)' }}>{court.name}</span>}
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              marginBottom: 24,
            }}
            styles={{ body: { padding: isMobile ? 12 : 16 } }}
          >
            {/* Ranking de vitórias da quadra */}
            {hasWins && (
              <div style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 16,
                padding: '8px 12px',
                backgroundColor: '#262626',
                borderRadius: 6,
                alignItems: 'center',
              }}>
                <TrophyOutlined style={{ color: '#ff9f1a', fontSize: 14 }} />
                {sorted.map(([name, wins], i) => (
                  <Tag key={name} color={i === 0 && wins > 0 ? 'gold' : 'default'} style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>
                    {name}: {wins}V
                  </Tag>
                ))}
              </div>
            )}

            {/* Times */}
            <Row gutter={[12, 12]}>
              {court.teams.map((team: any) => (
                <Col xs={24} sm={12} md={8} lg={6} key={team.teamIndex}>
                  <Card
                    size="small"
                    title={<span style={{ color: '#fff', fontSize: 14 }}>{team.teamName || `Time ${team.teamIndex}`}</span>}
                    style={{
                      backgroundColor: '#262626',
                      border: '1px solid #444',
                      borderRadius: 6,
                    }}
                    styles={{ body: { padding: 10 } }}
                  >
                    <Text style={{ color: '#ccc', fontSize: 13 }}>
                      {team.playerNames?.join(', ') || 'Nenhum jogador'}
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Seletores + Botão */}
            <div style={{
              marginTop: 16,
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <Select
                placeholder="Time da casa"
                style={{ width: isMobile ? '100%' : 200 }}
                onChange={(val) => handleTeamSelect(court.name, 'home', Number(val))}
                value={selection.homeTeam}
                options={court.teams.map((t: any) => ({
                  value: t.teamIndex,
                  label: t.teamName || `Time ${t.teamIndex}`,
                }))}
                styles={{ placeholder: { color: '#ffffff80' } }}
              />
              <Select
                placeholder="Time visitante"
                style={{ width: isMobile ? '100%' : 200 }}
                onChange={(val) => handleTeamSelect(court.name, 'away', Number(val))}
                value={selection.awayTeam}
                options={court.teams
                  .filter((t: any) => t.teamIndex !== selection.homeTeam)
                  .map((t: any) => ({
                    value: t.teamIndex,
                    label: t.teamName || `Time ${t.teamIndex}`,
                  }))
                }
                styles={{ placeholder: { color: '#ffffff80' } }}
              />
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                disabled={!canStart}
                onClick={() => openScoreboard(court.name, selection.homeTeam!, selection.awayTeam!)}
                style={{ fontWeight: 'bold', height: 40 }}
              >
                Iniciar Jogo
              </Button>
            </div>

            {/* Partidas realizadas nesta quadra */}
            {/* {court.matches?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#01ff69', fontWeight: 'bold', fontSize: 14 }}>Partidas realizadas:</Text>
                {court.matches.map((match: any, idx: number) => (
                  <div key={idx} style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    backgroundColor: '#262626',
                    borderRadius: 6,
                    border: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#ccc',
                    fontSize: 13,
                  }}>
                    <span>{match.homeTeamName} vs {match.awayTeamName}</span>
                    <span style={{ color: '#01ff69', fontWeight: 'bold' }}>
                      {match.homeScore} x {match.awayScore}
                    </span>
                  </div>
                ))}
              </div>
            )} */}
          </Card>
        );
      })}

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
              .find((c: any) => c.name === scoreboardData.courtName)
              ?.teams.find((t: any) => t.teamIndex === scoreboardData.homeTeam)
              ?.teamName || `Time ${scoreboardData.homeTeam}`
          }
          awayTeamName={
            details.courts
              .find((c: any) => c.name === scoreboardData.courtName)
              ?.teams.find((t: any) => t.teamIndex === scoreboardData.awayTeam)
              ?.teamName || `Time ${scoreboardData.awayTeam}`
          }
        />
      )}
    </div>
  );
};
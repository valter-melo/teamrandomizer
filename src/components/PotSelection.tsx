import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, InputNumber, Space, Typography, Row, Col, Alert, Checkbox, message, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { http } from '../api/http';
import { usePlayers } from '../hooks/usePlayers';

const { Title, Text } = Typography;

type TeamGenerated = {
  teamIndex: number;
  players: { id: string; name: string; sex: string; score: number }[];
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const PotSelection: React.FC = () => {
  const navigate = useNavigate();
  const { players, loading, error } = usePlayers();
  const activePlayers = players.filter(p => p.active);
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const [teamCount, setTeamCount] = useState(8);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [potes, setPotes] = useState<string[][]>([]);
  const [currentPoteIndex, setCurrentPoteIndex] = useState(0);
  const [generatedTeams, setGeneratedTeams] = useState<TeamGenerated[]>([]);
  const [saving, setSaving] = useState(false);
  const [playerQuery, setPlayerQuery] = useState("");

  useEffect(() => {
    setPotes(Array(playersPerTeam).fill(null).map(() => []));
  }, [playersPerTeam]);

  const selectedPlayerIds = useMemo(() => {
    const selected = new Set<string>();
    potes.forEach((pote, index) => {
      if (index !== currentPoteIndex) {
        pote.forEach(id => selected.add(id));
      }
    });
    return selected;
  }, [potes, currentPoteIndex]);

  const availablePlayers = useMemo(() => {
    return activePlayers.filter(p => !selectedPlayerIds.has(p.id));
  }, [activePlayers, selectedPlayerIds]);

  const filteredPlayers = useMemo(() => {
    const q = playerQuery.trim().toLowerCase();
    if (!q) return availablePlayers;
    return availablePlayers.filter(p => p.name.toLowerCase().includes(q));
  }, [availablePlayers, playerQuery]);

  const isCurrentPoteComplete = potes[currentPoteIndex]?.length >= teamCount;
  const areAllPotesComplete = potes.every(pote => pote.length === teamCount);

  const togglePlayer = useCallback((playerId: string) => {
    if (isCurrentPoteComplete && !potes[currentPoteIndex].includes(playerId)) {
      message.warning(`Este pote já tem ${teamCount} jogadores.`);
      return;
    }
    setPotes(prev => {
      const newPotes = [...prev];
      const current = newPotes[currentPoteIndex];
      if (current.includes(playerId)) {
        newPotes[currentPoteIndex] = current.filter(id => id !== playerId);
      } else {
        newPotes[currentPoteIndex] = [...current, playerId];
      }
      return newPotes;
    });
  }, [currentPoteIndex, isCurrentPoteComplete, teamCount]);

  const goToNextPote = useCallback(() => {
    if (currentPoteIndex < potes.length - 1) {
      setCurrentPoteIndex(prev => prev + 1);
    }
  }, [currentPoteIndex, potes.length]);

  const goToPrevPote = useCallback(() => {
    if (currentPoteIndex > 0) {
      setCurrentPoteIndex(prev => prev - 1);
    }
  }, [currentPoteIndex]);

  const handleGenerate = useCallback(() => {
    const playerMap = new Map(activePlayers.map(p => [p.id, p]));
    const shuffledPotes = potes.map(pote => shuffleArray([...pote]));
    const potesInfo = shuffledPotes.map(pote =>
      pote.map(id => ({ id, sex: playerMap.get(id)!.sex }))
    );
    const numTimes = teamCount;
    const numPotes = playersPerTeam;
    const times: { players: (string | null)[]; menCount: number }[] = [];
    for (let i = 0; i < numTimes; i++) {
      times.push({ players: new Array(numPotes).fill(null), menCount: 0 });
    }
    for (let p = 0; p < numPotes; p++) {
      const jogadores = potesInfo[p];
      const homens = jogadores.filter(j => j.sex === 'M').map(j => j.id);
      const mulheres = jogadores.filter(j => j.sex === 'F').map(j => j.id);
      let timesDisponiveis = times.map((t, idx) => ({ idx, ocupado: t.players[p] !== null })).filter(t => !t.ocupado).map(t => t.idx);
      const timesOrdenados = times.map((t, idx) => ({ idx, menCount: t.menCount })).sort((a, b) => a.menCount - b.menCount).map(t => t.idx);
      let timesElegiveis = timesOrdenados.filter(idx => timesDisponiveis.includes(idx) && times[idx].menCount < 3);
      if (homens.length > timesElegiveis.length) {
        message.error('Não há times suficientes com menos de 3 homens para alocar todos os homens. Tente novamente ou ajuste as seleções.');
        return;
      }
      for (const homem of homens) {
        const timeIdx = timesElegiveis.shift()!;
        times[timeIdx].players[p] = homem;
        times[timeIdx].menCount += 1;
        timesDisponiveis = timesDisponiveis.filter(idx => idx !== timeIdx);
      }
      for (const mulher of mulheres) {
        const timeIdx = timesDisponiveis.shift()!;
        times[timeIdx].players[p] = mulher;
      }
    }
    const timesCom4 = times.filter(t => t.menCount > 3);
    if (timesCom4.length > 0) {
      message.error('Erro inesperado: algum time ficou com 4 homens. Tente novamente.');
      return;
    }
    const newTeams: TeamGenerated[] = times.map((t, idx) => ({
      teamIndex: idx + 1,
      players: t.players.map(id => {
        const player = playerMap.get(id!);
        return { id: player!.id, name: player!.name, sex: player!.sex, score: 0 };
      }),
    }));
    setGeneratedTeams(newTeams);
    message.success('Times gerados com sucesso!');
  }, [potes, teamCount, playersPerTeam, activePlayers]);

  const handleSave = async () => {
    if (generatedTeams.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        teams: generatedTeams.map(team => ({
          teamIndex: team.teamIndex,
          players: team.players.map(p => ({ id: p.id, name: p.name, sex: p.sex, score: 0 })),
        })),
      };
      const response = await http.post('/teams/generate-from-pots', payload);
      const result = response.data;
      navigate(`/teams/result?sessionId=${result.sessionId}&teams=${encodeURIComponent(JSON.stringify(result.teams))}`);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Falha ao salvar times');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setPotes(Array(playersPerTeam).fill(null).map(() => []));
    setCurrentPoteIndex(0);
    setGeneratedTeams([]);
    setPlayerQuery("");
  };

  if (loading) return <div style={{ padding: 24, color: '#fff' }}>Carregando jogadores...</div>;
  if (error) return <Alert message="Erro" description={error} type="error" style={{ margin: 24 }} />;

  return (
    <div style={{
      padding: isMobile ? 8 : 'clamp(12px, 2vw, 24px)',
      maxWidth: 1400,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
      height: 'calc(100vh - 90px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Barra Superior */}
      <div style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 8,
        padding: isMobile ? 12 : 16,
        marginBottom: 16,
        flexShrink: 0,
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
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={handleGenerate} disabled={!areAllPotesComplete} type="primary" size={isMobile ? 'small' : 'middle'}>
              Embaralhar Times
            </Button>
            {generatedTeams.length > 0 && (
              <Button onClick={handleSave} loading={saving} type="primary" size={isMobile ? 'small' : 'middle'}
                style={{ backgroundColor: '#2f9bff', borderColor: '#2f9bff', fontWeight: 'bold' }}>
                Salvar
              </Button>
            )}
            <Button onClick={resetAll} size={isMobile ? 'small' : 'middle'}>Limpar</Button>
          </div>
        </div>
      </div>

      {/* Área de seleção com scroll */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 8,
        padding: isMobile ? 12 : 16,
      }}>
        {/* Cabeçalho do pote atual */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
          <Space size={[4, 4]} wrap>
            <Button onClick={goToPrevPote} disabled={currentPoteIndex === 0} size={isMobile ? 'small' : 'middle'}>Anterior</Button>
            <Button onClick={goToNextPote} disabled={!isCurrentPoteComplete || currentPoteIndex === potes.length - 1} type="primary" size={isMobile ? 'small' : 'middle'}>Próximo</Button>
          </Space>
        </div>

        {/* Navegação entre potes */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', flexShrink: 0 }}>
          {potes.map((_, index) => {
            const disabled = !areAllPotesComplete && index !== currentPoteIndex && potes[index].length < teamCount;
            return (
              <Button
                key={index}
                type={currentPoteIndex === index ? 'primary' : 'default'}
                onClick={() => setCurrentPoteIndex(index)}
                disabled={disabled}
                size="small"
              >
                Pote {index + 1} ({potes[index].length}/{teamCount})
              </Button>
            );
          })}
        </div>

        {/* Busca */}
        <Input
          placeholder="Buscar jogador..."
          value={playerQuery}
          onChange={(e) => setPlayerQuery(e.target.value)}
          style={{ marginBottom: 12, flexShrink: 0 }}
        />

        {/* Lista de jogadores com scroll */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          <Row gutter={[12, 12]}>
            {filteredPlayers.map(player => {
              const isSelected = potes[currentPoteIndex]?.includes(player.id);
              const disabled = isCurrentPoteComplete && !isSelected;
              return (
                <Col xs={12} sm={8} md={6} lg={4} key={player.id}>
                  <Checkbox
                    checked={isSelected}
                    onChange={() => togglePlayer(player.id)}
                    disabled={disabled}
                    style={{ color: disabled ? '#666' : '#ccc' }}
                  >
                    {player.name}
                  </Checkbox>
                </Col>
              );
            })}
            {filteredPlayers.length === 0 && (
              <Col span={24}>
                <Text style={{ color: '#aaa' }}>Nenhum jogador disponível.</Text>
              </Col>
            )}
          </Row>
        </div>
      </div>

      {/* Times gerados */}
      {generatedTeams.length > 0 && (
        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 8,
          padding: isMobile ? 12 : 16,
          marginTop: 16,
          flexShrink: 0,
          maxHeight: '30vh',
          overflowY: 'auto',
        }}>
          <h3 style={{ color: '#01ff69', margin: '0 0 12px 0', fontSize: 'clamp(16px, 2.5vw, 20px)' }}>Times Gerados</h3>
          <Row gutter={[12, 12]}>
            {generatedTeams.map(team => (
              <Col xs={24} sm={12} md={8} key={team.teamIndex}>
                <Card
                  type="inner"
                  title={<span style={{ color: '#fff' }}>Time {team.teamIndex}</span>}
                  style={{ backgroundColor: '#262626', border: '1px solid #444' }}
                  styles={{ body: { padding: 12 } }}
                >
                  {team.players.map(player => (
                    <div key={player.id} style={{ color: '#ccc', fontSize: 14, marginBottom: 4 }}>
                      {player.name} <span style={{ color: '#888', fontSize: 12 }}>({player.sex})</span>
                    </div>
                  ))}
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </div>
  );
};
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  InputNumber,
  Input,
  Row,
  Col,
  message,
  List,
  Modal,
  Form,
  Radio,
  Select,
  Typography,
  Grid,
  Tabs,
  Space,
  Empty,
  Badge,
} from 'antd';
import {
  CloseOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  TrophyOutlined,
  TeamOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { usePlayers } from '../../hooks/usePlayers';
import { useManualTeams } from '../../hooks/useManualTeams';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

type ChampionshipFormat = 'GROUPS' | 'KNOCKOUT';
type MatchesType = 'SINGLE' | 'HOME_AND_AWAY';

type TeamsState = {
  [key: number]: string[];
};

export const ManualTeamGenerator: React.FC = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = useMediaQuery({ maxHeight: 700 });

  const { players, loading: playersLoading } = usePlayers();
  const { saveManualTeams, isSaving } = useManualTeams();
  const navigate = useNavigate();

  const [teamCount, setTeamCount] = useState(2);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [teams, setTeams] = useState<TeamsState>({});
  const [teamNames, setTeamNames] = useState<{ [key: number]: string }>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [championshipName, setChampionshipName] = useState('');
  const [championshipFormat, setChampionshipFormat] = useState<ChampionshipFormat>('GROUPS');
  const [groupsCount, setGroupsCount] = useState(2);
  const [teamGroups, setTeamGroups] = useState<{ [teamIndex: number]: number }>({});
  const [matchesType, setMatchesType] = useState<MatchesType>('SINGLE');
  const [qualifiedPerGroup, setQualifiedPerGroup] = useState(2);

  const [setsToWin, setSetsToWin] = useState(2);
  const [pointsPerSet, setPointsPerSet] = useState(25);
  const [tieBreakPoints, setTieBreakPoints] = useState(15);

  useEffect(() => {
    setTeams(prev => {
      const next: TeamsState = {};
      for (let i = 1; i <= teamCount; i++) {
        next[i] = prev[i] ?? [];
      }
      return next;
    });
    setTeamGroups(prev => {
      const next: { [key: number]: number } = {};
      for (let i = 1; i <= teamCount; i++) {
        next[i] = prev[i] ?? 1;
      }
      return next;
    });
    setTeamNames(prev => {
      const next: { [key: number]: string } = {};
      for (let i = 1; i <= teamCount; i++) {
        next[i] = prev[i] ?? '';
      }
      return next;
    });
  }, [teamCount]);

  useEffect(() => {
    setTeams(prev => {
      const next: TeamsState = {};
      Object.entries(prev).forEach(([idx, ids]) => {
        next[Number(idx)] = ids.slice(0, playersPerTeam);
      });
      return next;
    });
  }, [playersPerTeam]);

  const selectedPlayerIds = useMemo(() => {
    return new Set(Object.values(teams).flat());
  }, [teams]);

  const availablePlayers = useMemo(() => {
    return players.filter(player => !selectedPlayerIds.has(player.id));
  }, [players, selectedPlayerIds]);

  const totalSelected = Object.values(teams).flat().length;
  const needed = teamCount * playersPerTeam;
  const isComplete = totalSelected === needed;

  const isKnockout = championshipFormat === 'KNOCKOUT';
  const isPowerOfTwo = teamCount > 1 && (teamCount & (teamCount - 1)) === 0;

  const addPlayerToTeam = (teamIndex: number, playerId: string) => {
    if (selectedPlayerIds.has(playerId)) {
      message.warning('Este jogador já foi selecionado');
      return;
    }
    if ((teams[teamIndex] ?? []).length >= playersPerTeam) {
      message.warning(`Time ${teamIndex} já está cheio`);
      return;
    }
    setTeams(prev => ({
      ...prev,
      [teamIndex]: [...(prev[teamIndex] ?? []), playerId],
    }));
  };

  const removePlayerFromTeam = (teamIndex: number, playerId: string) => {
    setTeams(prev => ({
      ...prev,
      [teamIndex]: (prev[teamIndex] ?? []).filter(id => id !== playerId),
    }));
  };

  const addPlayerToFirstFreeTeam = (playerId: string) => {
    const firstFreeTeam = Object.entries(teams).find(
      ([, ids]) => ids.length < playersPerTeam
    );
    if (!firstFreeTeam) {
      message.warning('Todos os times estão cheios');
      return;
    }
    addPlayerToTeam(Number(firstFreeTeam[0]), playerId);
  };

  const handleOpenModal = () => {
    if (!isComplete) {
      message.error(`Selecione exatamente ${needed} jogadores (${totalSelected} selecionados)`);
      return;
    }
    setModalVisible(true);
  };

  const handleSaveChampionship = async () => {
    if (!championshipName.trim()) {
      message.error('Informe o nome do campeonato');
      return;
    }
    if (championshipFormat === 'KNOCKOUT' && !isPowerOfTwo) {
      message.error('Para eliminatórias diretas, o número de times deve ser potência de 2 (2, 4, 8, 16...)');
      return;
    }
    if (championshipFormat === 'GROUPS' && teamCount % 2 !== 0) {
      message.error('Para fase de grupos, o número de times deve ser par');
      return;
    }
    const payload = {
      name: championshipName.trim(),
      format: championshipFormat,
      groupsCount: championshipFormat === 'KNOCKOUT' ? 0 : groupsCount,
      qualifiedPerGroup: championshipFormat === 'KNOCKOUT' ? 0 : qualifiedPerGroup,
      matchesType,
      teams: Object.entries(teams).map(([idx, playerIds]) => ({
        teamIndex: Number(idx),
        playerIds,
        groupId: championshipFormat === 'KNOCKOUT' ? 1 : teamGroups[Number(idx)] || 1,
      })),
      teamNames: Object.entries(teamNames).reduce((acc, [idx, name]) => {
        if (name.trim()) acc[Number(idx)] = name.trim();
        return acc;
      }, {} as Record<number, string>),
      setsToWin,
      pointsPerSet,
      tieBreakPoints,
    };
    try {
      const result = await saveManualTeams(payload);
      message.success('Campeonato criado com sucesso!');
      navigate(`/championships/${result.championshipId}`);
    } catch (err) {
      message.error('Erro ao criar campeonato');
    } finally {
      setModalVisible(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 8,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  };

  const cardBodyStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: isMobile ? 12 : 16,
  };

  const renderConfigCard = () => (
    <Card
      title={<span style={{ color: '#01ff69', fontSize: 'clamp(14px, 2vw, 16px)', fontWeight: 'bold' }}><SettingOutlined /> Configuração</span>}
      style={cardStyle}
      styles={{ body: cardBodyStyle }}
    >
      <Space orientation="vertical" size={isCompact ? 12 : 16} style={{ width: '100%' }}>
        <div>
          <Text style={{ color: '#ccc', display: 'block', marginBottom: 4 }}>Número de times</Text>
          <InputNumber min={2} value={teamCount} onChange={v => setTeamCount(Math.max(2, Number(v) || 2))} style={{ width: '100%' }} />
        </div>
        <div>
          <Text style={{ color: '#ccc', display: 'block', marginBottom: 4 }}>Jogadores por time</Text>
          <InputNumber min={1} value={playersPerTeam} onChange={v => setPlayersPerTeam(Math.max(1, Number(v) || 1))} style={{ width: '100%' }} />
        </div>
        <div style={{ background: 'rgba(1,255,105,0.1)', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
          <Text style={{ color: '#01ff69', fontWeight: 'bold' }}>{totalSelected} / {needed} selecionados</Text>
        </div>
        {!isMobile && (
          <Button 
            type="primary" 
            onClick={handleOpenModal} 
            disabled={!isComplete} 
            block 
            style={{ fontWeight: 'bold', height: 40, color: "#000" }}
          >
            <TrophyOutlined /> Criar Campeonato
          </Button>
        )}
      </Space>
    </Card>
  );

  const renderPlayersCard = () => (
    <Card
      title={<span style={{ color: '#01ff69', fontSize: 'clamp(14px, 2vw, 16px)', fontWeight: 'bold' }}><TeamOutlined /> Jogadores Disponíveis</span>}
      style={cardStyle}
      styles={{ body: { ...cardBodyStyle, padding: 0 } }}
    >
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: isMobile ? 12 : 16, minHeight: 0 }}>
        {availablePlayers.length === 0 ? (
          <Empty description="Nenhum jogador disponível" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={availablePlayers}
            renderItem={player => (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                borderBottom: '1px solid #333',
              }}>
                <span style={{ color: '#ccc', fontSize: 14 }}>
                  {player.name}
                </span>
                <Button
                  size="small"
                  icon={<UserAddOutlined />}
                  onClick={() => addPlayerToFirstFreeTeam(player.id)}
                  style={{ borderColor: '#01ff69', color: '#01ff69', fontWeight: 'bold' }}
                >
                  Adicionar
                </Button>
              </div>
            )}
          />
        )}
      </div>
    </Card>
  );

  const renderTeamsCard = () => (
    <Card
      title={<span style={{ color: '#01ff69', fontSize: 'clamp(14px, 2vw, 16px)', fontWeight: 'bold' }}><TeamOutlined /> Times</span>}
      style={cardStyle}
      styles={{ body: { ...cardBodyStyle, padding: 0 } }}
    >
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: isMobile ? 12 : 16, minHeight: 0 }}>
        {Object.entries(teams).map(([idx, playerIds]) => {
          const teamIndex = Number(idx);
          const vacancies = playersPerTeam - playerIds.length;
          return (
            <Card
              key={idx}
              type="inner"
              size="small"
              title={
                <span style={{ color: '#fff', fontSize: 14 }}>
                  {teamNames[teamIndex]?.trim() || `Time ${idx}`}
                  <Badge count={playerIds.length} style={{ marginLeft: 8, backgroundColor: '#01ff69', color: '#000' }} />
                </span>
              }
              style={{ backgroundColor: '#262626', border: '1px solid #444', marginBottom: 8 }}
              styles={{ body: { padding: 10 } }}
            >
              <Input
                placeholder="Nome do time"
                value={teamNames[teamIndex]}
                onChange={e => setTeamNames(prev => ({ ...prev, [teamIndex]: e.target.value }))}
                size="small"
                style={{ marginBottom: 8 }}
              />
              {playerIds.length === 0 ? (
                <Text style={{ color: '#888', fontSize: 12 }}>Nenhum jogador</Text>
              ) : (
                playerIds.map(playerId => {
                  const player = players.find(p => p.id === playerId);
                  return (
                    <div key={playerId} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      borderBottom: '1px solid #333',
                    }}>
                      <span style={{ color: '#ccc', fontSize: 13 }}>
                        {player?.name}
                      </span>
                      <Button
                        size="small"
                        danger
                        icon={<UserDeleteOutlined />}
                        onClick={() => removePlayerFromTeam(teamIndex, playerId)}
                      />
                    </div>
                  );
                })
              )}
              <Text style={{ color: '#888', fontSize: 11, display: 'block', marginTop: 4 }}>
                {vacancies} vaga{vacancies !== 1 ? 's' : ''} restante{vacancies !== 1 ? 's' : ''}
              </Text>
            </Card>
          );
        })}
      </div>
    </Card>
  );

  if (playersLoading) {
    return <div style={{ padding: 24, color: '#fff', textAlign: 'center' }}>Carregando jogadores...</div>;
  }

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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexShrink: 0,
      }}>
        <Title level={2} style={{ color: '#01ff69', margin: 0, fontSize: 'clamp(18px, 3vw, 24px)' }}>
          <TrophyOutlined style={{ marginRight: 8 }} />
          Criação de Campeonato
        </Title>
        <Badge count={`${totalSelected}/${needed}`} style={{ backgroundColor: '#01ff69', color: '#000', fontWeight: 'bold' }} />
      </div>

      {isMobile ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <Tabs
            defaultActiveKey="config"
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            tabBarStyle={{ marginBottom: 0 }}
            items={[
              {
                key: 'config',
                label: 'Config.',
                children: (
                  <div style={{ height: 'calc(100vh - 250px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {renderConfigCard()}
                  </div>
                ),
              },
              {
                key: 'players',
                label: 'Jogadores',
                children: (
                  <div style={{ height: 'calc(100vh - 250px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {renderPlayersCard()}
                  </div>
                ),
              },
              {
                key: 'teams',
                label: 'Times',
                children: (
                  <div style={{ height: 'calc(100vh - 250px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {renderTeamsCard()}
                  </div>
                ),
              },
            ]}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            flexShrink: 0,
            gap: 12,
            borderTop: '1px solid #333',
          }}>
            <Text style={{ color: '#ccc' }}><strong>{totalSelected}</strong> de <strong>{needed}</strong></Text>
            <Button type="primary" onClick={handleOpenModal} disabled={!isComplete} icon={<TrophyOutlined />} style={{ fontWeight: 'bold' }}>
              Criar
            </Button>
          </div>
        </div>
      ) : (
        <Row gutter={[16, 16]} style={{ flex: 1, overflow: 'hidden' }}>
          <Col xs={24} md={8} style={{ height: '100%' }}>{renderConfigCard()}</Col>
          <Col xs={24} md={8} style={{ height: '100%' }}>{renderPlayersCard()}</Col>
          <Col xs={24} md={8} style={{ height: '100%' }}>{renderTeamsCard()}</Col>
        </Row>
      )}

      <Modal
        title={<span style={{ color: '#01ff69', fontSize: 'clamp(16px, 2.5vw, 20px)' }}><TrophyOutlined /> Configurar Campeonato</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={isMobile ? 'calc(100vw - 16px)' : 600}
        style={{ top: isMobile ? 8 : 20 }}
        closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
        styles={{ body: { maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', padding: isMobile ? 12 : 24 } }}
      >
        <Form layout="vertical">
          <Form.Item label="Nome do Campeonato" required>
            <Input value={championshipName} onChange={e => setChampionshipName(e.target.value)} placeholder="Ex.: Copa BoraVer 2025" />
          </Form.Item>
          <Form.Item label="Formato" required>
            <Select
              value={championshipFormat}
              onChange={setChampionshipFormat}
              options={[
                { value: 'GROUPS', label: 'Fase de Grupos + Eliminatórias' },
                { value: 'KNOCKOUT', label: 'Eliminatórias Diretas' },
              ]}
              styles={{ placeholder: { color: '#ffffff80' } }}
            />
          </Form.Item>
          {!isKnockout && (
            <>
              <Form.Item label="Número de Grupos" required>
                <InputNumber min={1} value={groupsCount} onChange={v => setGroupsCount(Number(v) || 1)} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Alocar Times aos Grupos">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array.from({ length: teamCount }, (_, i) => i + 1).map(teamIdx => (
                    <div key={teamIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#ccc' }}>{teamNames[teamIdx]?.trim() || `Time ${teamIdx}`}</span>
                      <Select
                        value={teamGroups[teamIdx]}
                        onChange={v => setTeamGroups(prev => ({ ...prev, [teamIdx]: v }))}
                        style={{ width: 140 }}
                        styles={{ placeholder: { color: '#ffffff80' } }}
                        options={Array.from({ length: groupsCount }, (_, g) => ({ value: g + 1, label: `Grupo ${g + 1}` }))}
                      />
                    </div>
                  ))}
                </div>
              </Form.Item>
              <Form.Item label="Classificados por grupo" required>
                <InputNumber min={1} value={qualifiedPerGroup} onChange={v => setQualifiedPerGroup(Number(v) || 1)} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
          <Form.Item label="Tipo de Partidas" required>
            <Radio.Group value={matchesType} onChange={e => setMatchesType(e.target.value)}>
              <Radio value="SINGLE">Somente Ida</Radio>
              <Radio value="HOME_AND_AWAY">Ida e Volta</Radio>
            </Radio.Group>
          </Form.Item>
          <Card title="Configuração de Sets" size="small" style={{ backgroundColor: '#262626', border: '1px solid #444', marginBottom: 16 }}>
            <Form.Item label="Sets para vencer">
              <Select 
                value={setsToWin} 
                onChange={setSetsToWin} 
                styles={{ placeholder: { color: '#ffffff80' } }}
                options={[
                { value: 1, label: 'Melhor de 1 set' },
                { value: 2, label: 'Melhor de 3 sets' },
                { value: 3, label: 'Melhor de 5 sets' },
              ]} />
            </Form.Item>
            <Form.Item label="Pontos por set">
              <InputNumber min={10} max={30} value={pointsPerSet} onChange={v => setPointsPerSet(Number(v) || 25)} style={{ width: '100%' }} />
            </Form.Item>
            {setsToWin > 1 && (
              <Form.Item label="Pontos no tie-break">
                <InputNumber min={10} max={25} value={tieBreakPoints} onChange={v => setTieBreakPoints(Number(v) || 15)} style={{ width: '100%' }} />
              </Form.Item>
            )}
          </Card>
          <Form.Item>
            <Button 
              type="primary" 
              onClick={handleSaveChampionship} 
              loading={isSaving} block icon={<TrophyOutlined />} 
              style={{ 
                fontWeight: 'bold', 
                height: 44, 
                color: "#000"
              }}>
              Criar Campeonato
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
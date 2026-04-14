// src/components/manual/ManualTeamGenerator.tsx
import React, { useState, useEffect } from 'react';
import { Button, Card, InputNumber, Input, Row, Col, message, List, Modal, Form, Radio, Select, Typography } from 'antd';
import { usePlayers } from '../../hooks/usePlayers';
import { useManualTeams } from '../../hooks/useManualTeams';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

export const ManualTeamGenerator: React.FC = () => {
  const { players, loading: playersLoading } = usePlayers();
  const { saveManualTeams, isSaving } = useManualTeams();
  const navigate = useNavigate();

  // Configuração dos times
  const [teamCount, setTeamCount] = useState(2);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [teams, setTeams] = useState<{ [key: number]: string[] }>({});
  const [sessionName, setSessionName] = useState('');

  // Configuração do campeonato (modal)
  const [modalVisible, setModalVisible] = useState(false);
  const [championshipName, setChampionshipName] = useState('');
  const [groupsCount, setGroupsCount] = useState(2);
  const [teamGroups, setTeamGroups] = useState<{ [teamIndex: number]: number }>({});
  const [matchesType, setMatchesType] = useState<'SINGLE' | 'HOME_AND_AWAY'>('SINGLE');
  const [qualifiedPerGroup, setQualifiedPerGroup] = useState(2);

  // Inicializa times e grupos padrão
  useEffect(() => {
    const initialTeams: { [key: number]: string[] } = {};
    const initialGroups: { [key: number]: number } = {};
    for (let i = 1; i <= teamCount; i++) {
      initialTeams[i] = [];
      initialGroups[i] = 1;
    }
    setTeams(initialTeams);
    setTeamGroups(initialGroups);
  }, [teamCount]);

  const addPlayerToTeam = (teamIndex: number, playerId: string) => {
    if (teams[teamIndex].length >= playersPerTeam) {
      message.warning(`Time ${teamIndex} já está cheio`);
      return;
    }
    setTeams(prev => ({ ...prev, [teamIndex]: [...prev[teamIndex], playerId] }));
  };

  const removePlayerFromTeam = (teamIndex: number, playerId: string) => {
    setTeams(prev => ({ ...prev, [teamIndex]: prev[teamIndex].filter(id => id !== playerId) }));
  };

  const totalSelected = Object.values(teams).flat().length;
  const needed = teamCount * playersPerTeam;
  const isComplete = totalSelected === needed;

  const handleOpenModal = () => {
    console.log('handleOpenModal called', { isComplete, sessionName, totalSelected, needed });
    if (!isComplete) {
      message.error(`Selecione exatamente ${needed} jogadores (${totalSelected} selecionados)`);
      return;
    }
    if (!sessionName.trim()) {
      message.error('Informe um nome para a sessão de times');
      return;
    }
    setModalVisible(true);
  };

  const handleSaveChampionship = async () => {
    if (!championshipName.trim()) {
      message.error('Informe o nome do campeonato');
      return;
    }
    const payload = {
      name: championshipName,
      groupsCount,
      matchesType,
      qualifiedPerGroup,
      teams: Object.entries(teams).map(([idx, playerIds]) => ({
        teamIndex: parseInt(idx),
        playerIds,
        groupId: teamGroups[parseInt(idx)] || 1,
      })),
      sessionName,
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

  if (playersLoading) return <div>Carregando jogadores...</div>;

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Montagem Manual de Times</Title>
      <Row gutter={24}>
        <Col span={8}>
          <Card title="Configuração">
            <div style={{ marginBottom: 16 }}>
              <label>Número de times: </label>
              <InputNumber min={1} value={teamCount} onChange={val => setTeamCount(val || 1)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Jogadores por time: </label>
              <InputNumber min={1} value={playersPerTeam} onChange={val => setPlayersPerTeam(val || 1)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Nome da sessão (opcional): </label>
              <Input value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Ex: Montagem 23/03" />
            </div>
            <div>Total selecionado: {totalSelected} / {needed}</div>
            <Button type="primary" onClick={handleOpenModal} disabled={!isComplete} style={{ marginTop: 16 }}>
              Criar Campeonato
            </Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Jogadores Disponíveis">
            <List
              dataSource={players.filter(p => !Object.values(teams).flat().includes(p.id))}
              renderItem={player => (
                <List.Item
                  actions={[
                    <Button size="small" onClick={() => {
                      const firstFreeTeam = Object.entries(teams).find(([_, ids]) => ids.length < playersPerTeam);
                      if (firstFreeTeam) addPlayerToTeam(parseInt(firstFreeTeam[0]), player.id);
                      else message.warning('Todos os times estão cheios');
                    }}>
                      Adicionar
                    </Button>
                  ]}
                >
                  {player.name} ({player.sex})
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Times">
            {Object.entries(teams).map(([idx, playerIds]) => (
              <Card key={idx} type="inner" title={`Time ${idx}`} style={{ marginBottom: 16 }}>
                <List
                  dataSource={playerIds}
                  renderItem={playerId => {
                    const player = players.find(p => p.id === playerId);
                    return (
                      <List.Item
                        actions={[
                          <Button size="small" danger onClick={() => removePlayerFromTeam(parseInt(idx), playerId)}>Remover</Button>
                        ]}
                      >
                        {player?.name} ({player?.sex})
                      </List.Item>
                    );
                  }}
                />
                <div>{playersPerTeam - playerIds.length} vagas restantes</div>
              </Card>
            ))}
          </Card>
        </Col>
      </Row>

      <Modal
        title="Configurar Campeonato"
        open={modalVisible}  // <-- substituído 'visible' por 'open' para Ant Design 5+
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="Nome do Campeonato" required>
            <Input value={championshipName} onChange={e => setChampionshipName(e.target.value)} />
          </Form.Item>
          <Form.Item label="Número de Grupos" required>
            <InputNumber min={1} value={groupsCount} onChange={val => setGroupsCount(val || 1)} />
          </Form.Item>
          <Form.Item label="Alocar Times aos Grupos">
            {Array.from({ length: teamCount }, (_, i) => i + 1).map(teamIdx => (
              <div key={teamIdx} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                <span style={{ width: 80 }}>Time {teamIdx}</span>
                <Select
                  value={teamGroups[teamIdx]}
                  onChange={val => setTeamGroups(prev => ({ ...prev, [teamIdx]: val }))}
                  style={{ width: 120 }}
                >
                  {Array.from({ length: groupsCount }, (_, g) => g + 1).map(g => (
                    <Select.Option key={g} value={g}>Grupo {g}</Select.Option>
                  ))}
                </Select>
              </div>
            ))}
          </Form.Item>
          <Form.Item label="Tipo de Partidas" required>
            <Radio.Group value={matchesType} onChange={e => setMatchesType(e.target.value)}>
              <Radio value="SINGLE">Somente Ida</Radio>
              <Radio value="HOME_AND_AWAY">Ida e Volta</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="Classificados por grupo" required>
            <InputNumber min={1} value={qualifiedPerGroup} onChange={val => setQualifiedPerGroup(val || 1)} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleSaveChampionship} loading={isSaving} block>
              Criar Campeonato
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
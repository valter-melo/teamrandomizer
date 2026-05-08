import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Radio, InputNumber, Button, message, Card, Spin, List } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { http } from '../../api/http';
import { useChampionships } from '../../hooks/useChampionships';

interface TeamInfo {
  teamIndex: number;
  sumScore: number;
  players: Array<{ playerId: string; name: string; sex: string; score: number }>;
}

export const ChampionshipCreate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionIdFromUrl = searchParams.get('sessionId');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState(sessionIdFromUrl || '');
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamNames, setTeamNames] = useState<Record<number, string>>({});
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { createChampionship, isCreating } = useChampionships();

  // Buscar sessões
  useEffect(() => {
    http.get('/team-generation/sessions').then(res => setSessions(res.data));
  }, []);

  // Quando a sessão selecionada mudar, buscar seus times
  useEffect(() => {
    if (!selectedSession) {
      setTeams([]);
      setTeamNames({});
      return;
    }
    setLoadingTeams(true);
    http.get<TeamInfo[]>(`/teams/session/${selectedSession}`)
      .then(res => {
        setTeams(res.data);
        // Inicializa nomes padrão (Time 1, Time 2...)
        const defaultNames: Record<number, string> = {};
        res.data.forEach(t => {
          defaultNames[t.teamIndex] = ''; // deixa vazio, mas placeholder mostrará "Time X"
        });
        setTeamNames(defaultNames);
      })
      .catch(() => message.error('Erro ao carregar times da sessão'))
      .finally(() => setLoadingTeams(false));
  }, [selectedSession]);

  const updateTeamName = (teamIndex: number, name: string) => {
    setTeamNames(prev => ({ ...prev, [teamIndex]: name }));
  };

  const onFinish = async (values: any) => {
    if (!selectedSession) {
      message.error('Selecione uma sessão de times');
      return;
    }
    // Remove nomes vazios, pois nesse caso o backend usará o padrão
    const nonEmptyNames = Object.entries(teamNames)
      .filter(([_, name]) => name.trim() !== '')
      .reduce((acc, [idx, name]) => ({ ...acc, [idx]: name }), {});

    const payload = {
      name: values.name,
      generationSessionId: selectedSession,
      format: values.format,
      groupsCount: values.groupsCount,
      qualifiedPerGroup: values.qualifiedPerGroup,
      matchesType: values.matchesType,
      teamNames: nonEmptyNames,           // enviar apenas os preenchidos
    };
    try {
      const result = await createChampionship(payload);
      navigate(`/championships/${result.id}`);
    } catch (err) {
      message.error('Erro ao criar campeonato');
    }
  };

  return (
    <Card title="Criar Campeonato" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Form.Item name="name" label="Nome do Campeonato" rules={[{ required: true }]}>
          <Input placeholder="Ex.: Copa BoraVer 2025" />
        </Form.Item>

        <Form.Item label="Sessão de Times" required>
          <Select value={selectedSession} onChange={setSelectedSession} placeholder="Selecione a sessão">
            {sessions.map(s => (
              <Select.Option key={s.sessionId} value={s.sessionId}>
                {new Date(s.createdAt).toLocaleDateString()} - {s.sessionId}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Exibição dos times com campos de nome */}
        {selectedSession && (
          <Card title="Times da Sessão" size="small" style={{ marginBottom: 16 }}>
            {loadingTeams ? <Spin /> : (
              <List
                size="small"
                dataSource={teams}
                renderItem={team => (
                  <List.Item>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <span style={{ marginRight: 8, fontWeight: 600 }}>Time {team.teamIndex}:</span>
                      <Input
                        placeholder={`Time ${team.teamIndex}`}
                        value={teamNames[team.teamIndex]}
                        onChange={e => updateTeamName(team.teamIndex, e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        )}

        <Form.Item name="format" label="Formato" initialValue="GROUPS" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="GROUPS">Fase de Grupos + Eliminatórias</Radio>
            <Radio value="KNOCKOUT">Eliminatórias Diretas</Radio>
            <Radio value="LEAGUE">Pontos Corridos</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="groupsCount" label="Número de Grupos" initialValue={2} rules={[{ required: true }]}>
          <InputNumber min={1} />
        </Form.Item>

        <Form.Item name="qualifiedPerGroup" label="Classificados por Grupo" initialValue={2} rules={[{ required: true }]}>
          <InputNumber min={1} />
        </Form.Item>

        <Form.Item name="matchesType" label="Tipo de Partidas" initialValue="SINGLE" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="SINGLE">Somente Ida</Radio>
            <Radio value="HOME_AND_AWAY">Ida e Volta</Radio>
          </Radio.Group>
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={isCreating} block>
          Criar Campeonato
        </Button>
      </Form>
    </Card>
  );
};
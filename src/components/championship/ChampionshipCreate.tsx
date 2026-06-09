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

  // Observa o formato selecionado para esconder/mostrar campos de grupos
  const selectedFormat = Form.useWatch('format', form);

  useEffect(() => {
    http.get('/team-generation/sessions').then(res => setSessions(res.data));
  }, []);

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
        const defaultNames: Record<number, string> = {};
        res.data.forEach(t => { defaultNames[t.teamIndex] = ''; });
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
    const nonEmptyNames = Object.entries(teamNames)
      .filter(([_, name]) => name.trim() !== '')
      .reduce((acc, [idx, name]) => ({ ...acc, [idx]: name }), {});

    const payload = {
      name: values.name,
      generationSessionId: selectedSession,
      format: values.format,
      // Campos de grupos (só enviar se não for KNOCKOUT)
      groupsCount: values.format !== 'KNOCKOUT' ? values.groupsCount : 0,
      qualifiedPerGroup: values.format !== 'KNOCKOUT' ? values.qualifiedPerGroup : 0,
      matchesType: values.matchesType,
      teamNames: nonEmptyNames,
      // Configurações de sets (comuns a todos os formatos)
      setsToWin: values.setsToWin,
      pointsPerSet: values.pointsPerSet,
      tieBreakPoints: values.tieBreakPoints,
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

        {/* Campos de grupos: só aparecem se NÃO for KNOCKOUT */}
        {selectedFormat !== 'KNOCKOUT' && (
          <>
            <Form.Item name="groupsCount" label="Número de Grupos" initialValue={2} rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="qualifiedPerGroup" label="Classificados por Grupo" initialValue={2} rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
          </>
        )}

        <Form.Item name="matchesType" label="Tipo de Partidas" initialValue="SINGLE" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="SINGLE">Somente Ida</Radio>
            <Radio value="HOME_AND_AWAY">Ida e Volta</Radio>
          </Radio.Group>
        </Form.Item>

        {/* Configurações de sets (comuns a todos os formatos) */}
        <Card title="Configuração de Sets" size="small" style={{ marginBottom: 16, backgroundColor: '#1a1a1a', borderColor: '#333' }}>
          <Form.Item name="setsToWin" label="Sets para vencer" initialValue={2} rules={[{ required: true }]}>
            <Select>
              <Select.Option value={1}>Melhor de 1 set</Select.Option>
              <Select.Option value={2}>Melhor de 3 sets</Select.Option>
              <Select.Option value={3}>Melhor de 5 sets</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="pointsPerSet" label="Pontos por set" initialValue={25} rules={[{ required: true }]}>
            <InputNumber min={10} max={30} />
          </Form.Item>
          <Form.Item name="tieBreakPoints" label="Pontos no tie‑break" initialValue={15} rules={[{ required: true }]}>
            <InputNumber min={10} max={25} />
          </Form.Item>
        </Card>

        <Button type="primary" htmlType="submit" loading={isCreating} block>
          Criar Campeonato
        </Button>
      </Form>
    </Card>
  );
};
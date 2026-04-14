import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Radio, InputNumber, Button, message, Card } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { http } from '../../api/http';
import { useChampionships } from '../../hooks/useChampionships';

export const ChampionshipCreate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionIdFromUrl = searchParams.get('sessionId');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState(sessionIdFromUrl || '');
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { createChampionship, isCreating } = useChampionships();

  useEffect(() => {
    http.get('/team-generation/sessions').then(res => setSessions(res.data));
  }, []);

  const onFinish = async (values: any) => {
    if (!selectedSession) {
      message.error('Selecione uma sessão de times');
      return;
    }
    const payload = {
      name: values.name,
      generationSessionId: selectedSession,
      format: values.format,
      groupsCount: values.groupsCount,
      qualifiedPerGroup: values.qualifiedPerGroup,
      matchesType: values.matchesType,
    };
    try {
      const result = await createChampionship(payload);
      navigate(`/championships/${result.id}`);
    } catch (err) {
      message.error('Erro ao criar campeonato');
    }
  };

  return (
    <Card title="Criar Campeonato">
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Form.Item name="name" label="Nome do Campeonato" rules={[{ required: true }]}>
          <Input />
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
        <Button type="primary" htmlType="submit" loading={isCreating}>Criar</Button>
      </Form>
    </Card>
  );
};
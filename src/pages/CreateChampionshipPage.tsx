import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Radio, InputNumber, message } from 'antd';
import { http } from '../api/http';
import { useNavigate, useSearchParams } from 'react-router-dom';

const CreateChampionshipPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionIdFromUrl = searchParams.get('sessionId');
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(sessionIdFromUrl || '');
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    // Carregar sessões de geração
    http.get('/team-generation/sessions').then(res => setSessions(res.data));
  }, []);

  const onFinish = async (values: any) => {
    const payload = {
      name: values.name,
      generationSessionId: selectedSession,
      format: values.format,
      groupsCount: values.groupsCount,
      qualifiedPerGroup: values.qualifiedPerGroup,
      matchesType: values.matchesType,
    };
    try {
      const response = await http.post('/championships', payload);
      navigate(`/championships/${response.data.id}`);
    } catch (err) {
      message.error('Erro ao criar campeonato');
    }
  };

  return (
    <Form form={form} onFinish={onFinish} layout="vertical">
      <Form.Item name="name" label="Nome do Campeonato" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Sessão de Times" required>
        <Select value={selectedSession} onChange={setSelectedSession}>
          {sessions.map((s: any) => (
            <Select.Option key={s.sessionId} value={s.sessionId}>
              {new Date(s.createdAt).toLocaleDateString()}
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
      <Form.Item name="groupsCount" label="Número de Grupos" initialValue={2}>
        <InputNumber min={1} />
      </Form.Item>
      <Form.Item name="qualifiedPerGroup" label="Classificados por Grupo" initialValue={2}>
        <InputNumber min={1} />
      </Form.Item>
      <Form.Item name="matchesType" label="Tipo de Partidas" initialValue="SINGLE">
        <Radio.Group>
          <Radio value="SINGLE">Somente Ida</Radio>
          <Radio value="HOME_AND_AWAY">Ida e Volta</Radio>
        </Radio.Group>
      </Form.Item>
      <Button type="primary" htmlType="submit">Criar Campeonato</Button>
    </Form>
  );
};

export default CreateChampionshipPage;
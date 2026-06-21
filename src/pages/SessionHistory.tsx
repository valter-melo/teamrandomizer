import { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Spin, Tag, Button, Empty } from 'antd';
import { HistoryOutlined, PlayCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { http } from '../api/http';

const { Title, Text } = Typography;

interface SessionSummary {
  sessionId: string;
  createdAt: string;
  mode: string;
  teamCount: number;
  playersPerTeam: number;
  playersCount: number;
  sourceFileName: string | null;
}

export default function SessionHistory() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    http.get('/api/session-history')
      .then(res => setSessions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const modeLabel = (mode: string) => mode === 'DB' ? 'Sorteio' : 'Potes';

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 50 }} />;

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)', maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2} style={{ color: '#01ff69', marginBottom: 24, fontSize: 'clamp(20px, 4vw, 28px)' }}>
        <HistoryOutlined style={{ marginRight: 12 }} />
        Histórico de Sessões
      </Title>

      {sessions.length === 0 ? (
        <Card style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', textAlign: 'center', padding: 40 }}>
          <Empty description="Nenhuma sessão encontrada" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {sessions.map(session => (
            <Col xs={24} sm={12} md={8} key={session.sessionId}>
              <Card
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 8,
                }}
                styles={{ body: { padding: 16 } }}
                hoverable
              >
                <div style={{ marginBottom: 12 }}>
                  <Tag color={session.mode === 'DB' ? 'blue' : 'orange'}>{modeLabel(session.mode)}</Tag>
                  <Text style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>
                    {new Date(session.createdAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(session.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#ccc', display: 'block' }}>
                    <TeamOutlined /> {session.teamCount} times • {session.playersPerTeam} jogadores/time
                  </Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>
                    {session.playersCount} jogadores utilizados
                  </Text>
                </div>

                {session.sourceFileName && (
                  <div style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#888', fontSize: 12 }}>📁 {session.sourceFileName}</Text>
                  </div>
                )}

                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  block
                  style={{ fontWeight: 'bold', color: "#000" }}
                  onClick={() => navigate(`/friendly-sessions/${session.sessionId}`)}
                >
                  Ver Detalhes
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
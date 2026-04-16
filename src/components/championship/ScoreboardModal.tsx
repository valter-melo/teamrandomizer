import React, { useState, useEffect } from 'react';
import { Modal, Button, InputNumber, Space, Typography, message, Row, Col, Card, Tooltip } from 'antd';
import { SettingOutlined, PlusOutlined, MinusOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { http } from '../../api/http';
import type { Team } from '../types';

const { Title, Text } = Typography;

interface ScoreboardModalProps {
  visible: boolean;
  onClose: () => void;
  championshipId: string;
  matchId: string;
  homeTeamIndex: number;
  awayTeamIndex: number;
  generationSessionId?: string;
  onSuccess: () => void;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  visible,
  onClose,
  championshipId,
  matchId,
  homeTeamIndex,
  awayTeamIndex,
  generationSessionId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [winner, setWinner] = useState<'home' | 'away' | null>(null);
  const [saving, setSaving] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [pointsToWin, setPointsToWin] = useState(12);
  const [minAdvantage, setMinAdvantage] = useState(2);

  useEffect(() => {
    if (visible && generationSessionId) {
      const fetchTeams = async () => {
        setLoading(true);
        try {
          const res = await http.get(`/teams/session/${generationSessionId}`);
          const teams: Team[] = res.data;
          const home = teams.find(t => t.teamIndex === homeTeamIndex);
          const away = teams.find(t => t.teamIndex === awayTeamIndex);
          setHomeTeam(home || null);
          setAwayTeam(away || null);
        } catch (err) {
          message.error('Erro ao carregar dados dos times');
        } finally {
          setLoading(false);
        }
      };
      fetchTeams();
    }
  }, [visible, generationSessionId, homeTeamIndex, awayTeamIndex]);

  useEffect(() => {
    if (homeScore >= pointsToWin || awayScore >= pointsToWin) {
      const diff = Math.abs(homeScore - awayScore);
      if (diff >= minAdvantage) {
        setWinner(homeScore > awayScore ? 'home' : 'away');
      } else {
        setWinner(null);
      }
    } else {
      setWinner(null);
    }
  }, [homeScore, awayScore, pointsToWin, minAdvantage]);

  // Abrir modal de resultado quando houver vencedor
  useEffect(() => {
    if (winner) {
      setResultModalVisible(true);
    } else {
      setResultModalVisible(false);
    }
  }, [winner]);

  const increment = (team: 'home' | 'away') => {
    if (winner) return;
    if (team === 'home') setHomeScore(prev => prev + 1);
    else setAwayScore(prev => prev + 1);
  };

  const decrement = (team: 'home' | 'away') => {
    if (team === 'home' && homeScore > 0) setHomeScore(prev => prev - 1);
    else if (team === 'away' && awayScore > 0) setAwayScore(prev => prev - 1);
  };

  const resetMatch = () => {
    setHomeScore(0);
    setAwayScore(0);
    setWinner(null);
    setResultModalVisible(false);
  };

  const handleSave = async () => {
    if (!winner) return;
    setSaving(true);
    try {
      await http.post(`/championships/${championshipId}/matches/result`, {
        matchId,
        homeScore,
        awayScore,
      });
      message.success('Resultado registrado com sucesso!');
      onSuccess();
      onClose();
    } catch (err) {
      message.error('Erro ao registrar resultado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title=""
      open={visible}
      onCancel={onClose}
      footer={null}
      width="100vw"
      style={{ top: 0, maxWidth: '100vw', height: '100vh', padding: 0, overflow: 'hidden' }}
      styles={{
        body: {
          height: 'calc(100vh - 55px)', 
          padding: 16, 
          overflow: 'auto', 
          position: 'relative'
        },
      }}      
      closeIcon={<CloseCircleOutlined style={{ fontSize: 20, color: 'white' }} />}
    >
      <div style={{ position: 'relative', minHeight: '100%' }}>
        {/* Logo centralizada */}
        <img
          src="/BoraVer.svg"
          alt="BoraVer"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '220px',
            height: 'auto',
            opacity: 0.1,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, fontSize: 40 }}>Carregando times...</div>
        ) : (
          <>
            <div style={{ textAlign: 'left', marginBottom: 16, position: 'relative', zIndex: 1 }}>
              <Tooltip title="Configurar regras">
                <Button icon={<SettingOutlined />} onClick={() => setSettingsVisible(true)} />
              </Tooltip>
            </div>
            <Row gutter={[16, 32]} justify="center" align="middle" style={{ minHeight: '70vh', position: 'relative', zIndex: 1 }}>
              <Col xs={24} md={10} style={{ textAlign: 'center' }}>
                <Card variant='borderless' style={{ backgroundColor: '#f0f2f5', padding: '8px 0' }}>
                  <Title level={3} style={styles.title}>Time {homeTeamIndex}</Title>
                  {homeTeam && (
                    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px' }}>
                      {homeTeam.players.map((p, idx) => (
                        <span key={p.id} style={styles.players}>
                          {p.name}
                          {idx < homeTeam.players.length - 1 && ' | '}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ ...styles.score, margin: '8px 0' }}>{homeScore}</div>
                  <Space size="middle">
                    <Button 
                      size="large" 
                      icon={<MinusOutlined />} 
                      onClick={() => 
                      decrement('home')} 
                      style={styles.decrementButton}
                    />
                    <Button
                      size="large"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => increment('home')}
                      disabled={!!winner}
                      style={styles.incrementButton}
                    />
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={4} style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 68 }}>VS</Text>
              </Col>
              <Col xs={24} md={10} style={{ textAlign: 'center' }}>
                <Card variant='borderless' style={{ backgroundColor: '#f0f2f5', padding: '8px 0' }}>
                  <Title level={3} style={styles.title}>Time {awayTeamIndex}</Title>
                  {awayTeam && (
                    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px' }}>
                      {awayTeam.players.map((p, idx) => (
                        <span key={p.id} style={styles.players}>
                          {p.name}
                          {idx < awayTeam.players.length - 1 && ' | '}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ ...styles.score, margin: '8px 0' }}>{awayScore}</div>
                  <Space size="middle">
                    <Button 
                      size="large" 
                      icon={<MinusOutlined />} 
                      onClick={() => decrement('away')} 
                      style={styles.decrementButton}
                    />
                    <Button
                      size="large"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => increment('away')}
                      disabled={!!winner}
                      style={styles.incrementButton}
                    />
                  </Space>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* Modal de resultado (Salvar / Reiniciar) */}
        <Modal
          title="Partida finalizada"
          open={resultModalVisible}
          onCancel={() => setResultModalVisible(false)}
          footer={null}
          centered
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ color: '#2bd96b' }}>
              Vencedor: {winner === 'home' ? `Time ${homeTeamIndex}` : `Time ${awayTeamIndex}`}
            </Title>
            <Space size="large" style={{ marginTop: 24 }}>
              <Button size="large" onClick={resetMatch}>Reiniciar</Button>
              <Button size="large" type="primary" onClick={handleSave} loading={saving}>
                Salvar
              </Button>
            </Space>
          </div>
        </Modal>

        {/* Modal de configuração de regras */}
        <Modal
          title="Configurar Regras"
          open={settingsVisible}
          onCancel={() => setSettingsVisible(false)}
          footer={[<Button key="ok" type="primary" onClick={() => setSettingsVisible(false)}>OK</Button>]}
        >
          <div style={{ marginBottom: 16 }}>
            <label>Pontos para vencer: </label>
            <InputNumber min={1} value={pointsToWin} onChange={val => setPointsToWin(val || 1)} />
          </div>
          <div>
            <label>Vantagem mínima: </label>
            <InputNumber min={1} value={minAdvantage} onChange={val => setMinAdvantage(val || 1)} />
          </div>
        </Modal>
      </div>
    </Modal>
  );
};

const styles = {
  title: { fontSize: 50, fontWeight: 'bold', marginBottom: 8 },
  players: { fontSize: 25, fontWeight: 'bold', lineHeight: 1.2 },
  score: { fontSize: 400, color: '#2bd96b', fontWeight: 'bold', lineHeight: 1 },
  incrementButton: { backgroundColor: '#2bd96b', borderColor: '#00aa09' },
  decrementButton: { backgroundColor: '#ff4d4f', borderColor: '#aa0000' },
};
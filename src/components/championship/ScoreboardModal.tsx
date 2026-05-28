import React, { useState, useEffect } from 'react';
import { Modal, Button, InputNumber, Space, Typography, message, Row, Col, Card, Tooltip, Radio } from 'antd';
import {
  SettingOutlined,
  PlusOutlined,
  MinusOutlined,
  WarningOutlined,
  CloseOutlined,
  SwapOutlined,
} from '@ant-design/icons';
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
  homeTeamName?: string;
  awayTeamName?: string;
  onSuccess: () => void;
  onSave?: (data: any) => Promise<void>;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  visible,
  onClose,
  championshipId,
  matchId,
  homeTeamIndex,
  awayTeamIndex,
  generationSessionId,
  homeTeamName,
  awayTeamName,
  onSuccess,
  onSave,
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

  // Estados para WO
  const [woModalVisible, setWoModalVisible] = useState(false);
  const [selectedWoWinner, setSelectedWoWinner] = useState<'home' | 'away' | null>(null);

  // NOVO: controle de inversão dos lados
  const [swapped, setSwapped] = useState(false);

  // Drag state
  const [dragOverLeft, setDragOverLeft] = useState(false);
  const [dragOverRight, setDragOverRight] = useState(false);

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
    // Reset ao abrir
    setHomeScore(0);
    setAwayScore(0);
    setWinner(null);
    setSwapped(false);
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
      if (onSave) {
        await onSave({
          homeScore,
          awayScore,
          walkover: false,
          winnerTeamIndex: winner === 'home' ? homeTeamIndex : awayTeamIndex,
        });
        message.success('Result saved');
        onSuccess();
        onClose();
      } else {
        await http.post(`/championships/${championshipId}/matches/result`, {
          matchId,
          homeScore,
          awayScore,
          walkover: false,
        });
        message.success('Resultado registrado com sucesso!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Erro ao registrar resultado');
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterWO = async () => {
    if (!selectedWoWinner) {
      message.error('Selecione o time vencedor');
      return;
    }
    setSaving(true);
    try {
      const winnerTeamIndex = selectedWoWinner === 'home' ? homeTeamIndex : awayTeamIndex;
      if (onSave) {
        await onSave({
          homeScore: 0,
          awayScore: 0,
          walkover: true,
          winnerTeamIndex,
          woWinnerPoints: pointsToWin,
        });
        message.success(`WO registered! ${pointsToWin} x 0`);
        onSuccess();
        onClose();
      } else {
        await http.post(`/championships/${championshipId}/matches/result`, {
          matchId,
          homeScore: 0,
          awayScore: 0,
          walkover: true,
          winnerTeamIndex,
          woWinnerPoints: pointsToWin,
        });
        message.success(`WO registrado! Vitória por ${pointsToWin} x 0.`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Erro ao registrar WO');
    } finally {
      setSaving(false);
      setWoModalVisible(false);
    }
  };

  const getHomeName = () => homeTeamName || `Time ${homeTeamIndex}`;
  const getAwayName = () => awayTeamName || `Time ${awayTeamIndex}`;

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, side: 'left' | 'right') => {
    e.dataTransfer.setData('text/plain', side);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, side: 'left' | 'right') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (side === 'left') setDragOverLeft(true);
    else setDragOverRight(true);
  };

  const handleDragLeave = (side: 'left' | 'right') => {
    if (side === 'left') setDragOverLeft(false);
    else setDragOverRight(false);
  };

  const handleDrop = (e: React.DragEvent, targetSide: 'left' | 'right') => {
    e.preventDefault();
    setDragOverLeft(false);
    setDragOverRight(false);
    const sourceSide = e.dataTransfer.getData('text/plain') as 'left' | 'right';
    if (sourceSide !== targetSide) {
      setSwapped(prev => !prev);
    }
  };

  // Determina qual time está em cada lado
  const leftTeam = swapped ? 'away' : 'home';
  const rightTeam = swapped ? 'home' : 'away';

  const renderTeamCard = (side: 'left' | 'right') => {
    const teamKey = side === 'left' ? leftTeam : rightTeam;
    const isHome = teamKey === 'home';
    const team = isHome ? homeTeam : awayTeam;
    const score = isHome ? homeScore : awayScore;
    const teamName = isHome ? getHomeName() : getAwayName();
    const dragOver = side === 'left' ? dragOverLeft : dragOverRight;

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, side)}
        onDragOver={(e) => handleDragOver(e, side)}
        onDragLeave={() => handleDragLeave(side)}
        onDrop={(e) => handleDrop(e, side)}
        style={{
          cursor: 'grab',
          opacity: dragOver ? 0.7 : 1,
          border: dragOver ? '2px dashed #2bd96b' : '2px solid transparent',
          borderRadius: 12,
          transition: 'opacity 0.2s, border 0.2s',
        }}
      >
        <Card
          variant="borderless"
          style={{
            backgroundColor: '#f0f2f5',
            padding: '8px 0',
            border: dragOver ? '2px dashed #2bd96b' : undefined,
          }}
        >
          <Title level={3} style={styles.title}>
            {teamName}
          </Title>
          {team && (
            <div
              style={{
                marginTop: 4,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {team.players.map((p, idx) => (
                <span key={p.id} style={styles.players}>
                  {p.name}
                  {idx < team.players.length - 1 && ' | '}
                </span>
              ))}
            </div>
          )}
          <div style={{ ...styles.score, margin: '8px 0' }}>{score}</div>
          <Space size="middle">
            <Button
              size="large"
              icon={<MinusOutlined />}
              onClick={() => decrement(isHome ? 'home' : 'away')}
              style={styles.decrementButton}
            />
            <Button
              size="large"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => increment(isHome ? 'home' : 'away')}
              disabled={!!winner}
              style={styles.incrementButton}
            />
          </Space>
        </Card>
      </div>
    );
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
          position: 'relative',
        },
      }}
      closeIcon={<CloseOutlined style={{ color: '#2bd96b' }} />}
    >
      <div style={{ position: 'relative', minHeight: '100%' }}>
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
            <div
              style={{
                textAlign: 'left',
                marginBottom: 16,
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <Tooltip title="Configurar regras">
                <Button icon={<SettingOutlined />} onClick={() => setSettingsVisible(true)} />
              </Tooltip>
              <Tooltip title="Registrar WO (Walkover)">
                <Button
                  icon={<WarningOutlined />}
                  onClick={() => setWoModalVisible(true)}
                  danger
                >
                  Registrar WO
                </Button>
              </Tooltip>
              <Tooltip title="Inverter lados">
                <Button
                  icon={<SwapOutlined />}
                  onClick={() => setSwapped(prev => !prev)}
                  style={{ marginLeft: 'auto' }}
                />
              </Tooltip>
            </div>
            <Row
              gutter={[16, 32]}
              justify="center"
              align="middle"
              style={{ minHeight: '70vh', position: 'relative', zIndex: 1 }}
            >
              <Col xs={24} md={10} style={{ textAlign: 'center' }}>
                {renderTeamCard('left')}
              </Col>
              <Col xs={24} md={4} style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 68 }}>VS</Text>
              </Col>
              <Col xs={24} md={10} style={{ textAlign: 'center' }}>
                {renderTeamCard('right')}
              </Col>
            </Row>
          </>
        )}

        {/* Modal de resultado */}
        <Modal
          title="Partida finalizada"
          open={resultModalVisible}
          onCancel={() => setResultModalVisible(false)}
          footer={null}
          centered
          closeIcon={<CloseOutlined style={{ color: '#2bd96b' }} />}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ color: '#2bd96b' }}>
              Vencedor: {winner === 'home' ? getHomeName() : getAwayName()}
            </Title>
            <Space size="large" style={{ marginTop: 24 }}>
              <Button size="large" onClick={resetMatch}>
                Reiniciar
              </Button>
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
          footer={[
            <Button key="ok" type="primary" onClick={() => setSettingsVisible(false)}>
              OK
            </Button>,
          ]}
          closeIcon={<CloseOutlined style={{ color: '#2bd96b' }} />}
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

        {/* Modal de WO */}
        <Modal
          title="Registrar Walkover (WO)"
          open={woModalVisible}
          onCancel={() => setWoModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setWoModalVisible(false)}>
              Cancelar
            </Button>,
            <Button key="submit" type="primary" danger onClick={handleRegisterWO} loading={saving}>
              Confirmar WO
            </Button>,
          ]}
          closeIcon={<CloseOutlined style={{ color: '#2bd96b' }} />}
          centered
        >
          <div style={{ marginBottom: 16 }}>
            <Text>
              Selecione o time que <strong>compareceu</strong> e vencerá por WO:
            </Text>
          </div>
          <Radio.Group
            onChange={e => setSelectedWoWinner(e.target.value)}
            value={selectedWoWinner}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="home">{getHomeName()} (mandante)</Radio>
              <Radio value="away">{getAwayName()} (visitante)</Radio>
            </Space>
          </Radio.Group>
          <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
            O placar será registrado como {pointsToWin} x 0 (visualmente). O time vencedor receberá 3
            pontos; o perdedor, 0 pontos.
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
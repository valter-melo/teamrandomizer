import React, { useState } from 'react';
import { Card, Button, Tag, message, Typography } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { useMediaQuery } from 'react-responsive';
import type { MatchDetails } from '../types';
import { ScoreboardModal } from './ScoreboardModal';

const { Text } = Typography;

interface Props {
  matches: MatchDetails[];
  championshipId: string;
  onMatchPlayed?: () => void;
}

const stageOrder = ['QUARTER', 'SEMI', 'FINAL', 'THIRD_PLACE'];
const stageNames: Record<string, string> = {
  QUARTER: 'Quartas de Final',
  SEMI: 'Semifinal',
  FINAL: 'Final',
  THIRD_PLACE: 'Disputa de 3º Lugar',
};

export const KnockoutBracket: React.FC<Props> = ({ matches, championshipId, onMatchPlayed }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchDetails | null>(null);
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const handlePlay = (match: MatchDetails) => {
    if (!match.generationSessionId) {
      message.error('Dados da partida incompletos. Não é possível iniciar o jogo.');
      return;
    }
    setSelectedMatch(match);
    setModalVisible(true);
  };

  const grouped = matches.reduce((acc, match) => {
    const stage = match.stage || 'UNKNOWN';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(match);
    return acc;
  }, {} as Record<string, MatchDetails[]>);

  const teamName = (match: MatchDetails, isHome: boolean) => {
    return isHome
      ? (match.homeTeamName || `Time ${match.homeTeamIndex}`)
      : (match.awayTeamName || `Time ${match.awayTeamIndex}`);
  };

  return (
    <div style={{ width: '100%' }}>
      {stageOrder.map((stage) => {
        const stageMatches = grouped[stage];
        if (!stageMatches || stageMatches.length === 0) return null;

        return (
          <Card
            key={stage}
            title={
              <span style={{
                fontSize: 'clamp(18px, 3vw, 28px)',
                fontWeight: 'bold',
                color: '#01ff69',
              }}>
                {stageNames[stage]}
              </span>
            }
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              marginBottom: 16,
            }}
            styles={{
              header: {
                backgroundColor: '#0d0d0d',
                borderBottom: '1px solid #01ff69',
              },
              body: {
                padding: 'clamp(8px, 2vw, 16px)',
              },
            }}
          >
            {stageMatches.map((match) => (
              <div
                key={match.matchId}
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#262626',
                  padding: 'clamp(12px, 2vw, 20px) clamp(12px, 2vw, 24px)',
                  marginBottom: 12,
                  borderRadius: 8,
                  borderLeft: '6px solid #01ff69',
                  gap: isMobile ? 12 : 16,
                  flexWrap: 'wrap',
                }}
              >
                {/* Times */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'clamp(8px, 2vw, 12px)',
                    flexWrap: 'wrap',
                    textAlign: 'center',
                  }}
                >
                  <Text
                    strong
                    style={{
                      fontSize: 'clamp(16px, 2.5vw, 28px)',
                      color: '#fff',
                      flex: isMobile ? '1 1 40%' : 'none',
                    }}
                  >
                    {teamName(match, true)}
                  </Text>

                  <Text
                    style={{
                      fontSize: 'clamp(18px, 3vw, 24px)',
                      color: '#01ff69',
                      fontWeight: 'bold',
                    }}
                  >
                    vs
                  </Text>

                  <Text
                    strong
                    style={{
                      fontSize: 'clamp(16px, 2.5vw, 28px)',
                      color: '#fff',
                      flex: isMobile ? '1 1 40%' : 'none',
                    }}
                  >
                    {teamName(match, false)}
                  </Text>
                </div>

                {/* Placar ou Botão */}
                <div style={{ textAlign: 'center' }}>
                  {match.played ? (
                    <Tag
                      style={{
                        fontSize: 'clamp(20px, 3vw, 28px)',
                        padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 2.5vw, 24px)',
                        borderRadius: 8,
                        backgroundColor: '#01ff69',
                        color: '#1a1a1a',
                        border: 'none',
                        fontWeight: 'bold',
                      }}
                    >
                      {match.homeScore} x {match.awayScore}
                    </Tag>
                  ) : (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handlePlay(match)}
                      size={isMobile ? 'middle' : 'large'}
                      block={isMobile}
                      style={{
                        backgroundColor: '#01ff69',
                        borderColor: '#01ff69',
                        color: '#1a1a1a',
                        fontWeight: 'bold',
                        fontSize: 'clamp(16px, 2.5vw, 22px)',
                        height: isMobile ? 40 : 'auto',
                        padding: isMobile ? '8px 16px' : 'clamp(10px, 2vw, 12px) clamp(20px, 3vw, 30px)',
                      }}
                    >
                      Jogar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        );
      })}

      {selectedMatch && (
        <ScoreboardModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedMatch(null);
          }}
          championshipId={championshipId}
          matchId={selectedMatch.matchId}
          homeTeamIndex={selectedMatch.homeTeamIndex}
          awayTeamIndex={selectedMatch.awayTeamIndex}
          generationSessionId={selectedMatch.generationSessionId}
          onSuccess={() => {
            if (onMatchPlayed) onMatchPlayed();
          }}
          homeTeamName={selectedMatch.homeTeamName}
          awayTeamName={selectedMatch.awayTeamName}
        />
      )}
    </div>
  );
};
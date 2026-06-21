import React, { useState } from 'react';
import { Card, Button, message, Typography } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { useMediaQuery } from 'react-responsive';
import type { MatchDetails } from '../types';
import { ScoreboardModal } from './ScoreboardModal';

const { Text } = Typography;

interface Props {
  matches: MatchDetails[];
  championshipId: string;
  groupName: string;
  onMatchPlayed?: () => void;
}

export const GroupMatches: React.FC<Props> = ({ matches, championshipId, groupName, onMatchPlayed }) => {
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

  const teamName = (match: MatchDetails, isHome: boolean) => {
    return isHome 
      ? (match.homeTeamName || `Time ${match.homeTeamIndex}`)
      : (match.awayTeamName || `Time ${match.awayTeamIndex}`);
  };

  const isWinner = (match: MatchDetails, isHome: boolean) => {
    if (!match.played) return false;
    return isHome 
      ? match.winnerTeamIndex === match.homeTeamIndex
      : match.winnerTeamIndex === match.awayTeamIndex;
  };

  return (
    <Card
      title={
        <span style={{ fontSize: 'clamp(14px, 2.5vw, 18px)', color: '#01ff69', fontWeight: 'bold' }}>
          {groupName}
        </span>
      }
      style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8, marginBottom: 16 }}
      styles={{
        header: { borderBottom: '1px solid #333' },
        body: { padding: isMobile ? 8 : 'clamp(8px, 2vw, 16px)' },
      }}
    >
      {matches.map((match) => (
        <div
          key={match.matchId}
          style={{
            padding: isMobile ? '8px 0' : 'clamp(8px, 1.5vw, 14px) 0',
            borderBottom: '1px solid #333',
          }}
        >
          {/* Rodada */}
          <Text style={{
            fontSize: 'clamp(11px, 1.8vw, 14px)',
            color: '#888',
            display: 'block',
            marginBottom: isMobile ? 4 : 6,
          }}>
            Rodada {match.round}
          </Text>

          {/* Times + Placar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 6 : 12,
            flexWrap: 'wrap',
          }}>
            {/* Time Casa */}
            <Text
              style={{
                fontSize: 'clamp(13px, 2vw, 16px)',
                color: isWinner(match, true) ? '#01ff69' : '#ccc',
                fontWeight: isWinner(match, true) ? 'bold' : 'normal',
                flex: 1,
                minWidth: 80,
                textAlign: 'right',
                wordBreak: 'break-word',
              }}
            >
              {teamName(match, true)}
            </Text>

            {/* Placar ou vs */}
            <Text style={{
              fontSize: 'clamp(16px, 2.5vw, 24px)',
              fontWeight: 'bold',
              color: match.played ? '#01ff69' : '#fff',
              minWidth: 50,
              textAlign: 'center',
              flexShrink: 0,
            }}>
              {match.played ? `${match.homeScore} x ${match.awayScore}` : 'vs'}
            </Text>

            {/* Time Fora */}
            <Text
              style={{
                fontSize: 'clamp(13px, 2vw, 16px)',
                color: isWinner(match, false) ? '#01ff69' : '#ccc',
                fontWeight: isWinner(match, false) ? 'bold' : 'normal',
                flex: 1,
                minWidth: 80,
                textAlign: 'left',
                wordBreak: 'break-word',
              }}
            >
              {teamName(match, false)}
            </Text>

            {/* Botão Jogar */}
            {!match.played && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handlePlay(match)}
                size="small"
                style={{
                  backgroundColor: '#01ff69',
                  borderColor: '#01ff69',
                  color: '#1a1a1a',
                  fontWeight: 'bold',
                  fontSize: 'clamp(12px, 1.8vw, 14px)',
                  height: 32,
                  padding: '0 12px',
                  flexShrink: 0,
                }}
              >
                Jogar
              </Button>
            )}
          </div>
        </div>
      ))}

      {selectedMatch && (
        <ScoreboardModal
          visible={modalVisible}
          onClose={() => { setModalVisible(false); setSelectedMatch(null); }}
          championshipId={championshipId}
          matchId={selectedMatch.matchId}
          homeTeamIndex={selectedMatch.homeTeamIndex}
          awayTeamIndex={selectedMatch.awayTeamIndex}
          generationSessionId={selectedMatch.generationSessionId}
          homeTeamName={selectedMatch.homeTeamName}
          awayTeamName={selectedMatch.awayTeamName}
          onSuccess={() => onMatchPlayed && onMatchPlayed()}
        />
      )}
    </Card>
  );
};
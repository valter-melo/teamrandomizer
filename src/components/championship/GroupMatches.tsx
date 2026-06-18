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
        <span style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#01ff69', fontWeight: 'bold' }}>
          {groupName}
        </span>
      }
      style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8, marginBottom: 16 }}
      styles={{
        header: { borderBottom: '1px solid #333' },
        body: { padding: 'clamp(8px, 2vw, 16px)' },
      }}
    >
      {matches.map((match) => (
        <div
          key={match.matchId}
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            padding: 'clamp(12px, 2vw, 16px) 0',
            borderBottom: '1px solid #333',
            gap: isMobile ? 12 : 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Rodada */}
          <Text
            style={{
              fontSize: 'clamp(13px, 2vw, 16px)',
              color: '#aaa',
              minWidth: isMobile ? 'auto' : 80,
              textAlign: isMobile ? 'center' : 'left',
            }}
          >
            Rodada {match.round}
          </Text>

          {/* Times + Placar */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(8px, 2vw, 20px)',
              flexWrap: 'wrap',
              textAlign: 'center',
            }}
          >
            <Text
              strong
              style={{
                fontSize: 'clamp(16px, 2.5vw, 24px)',
                color: isWinner(match, true) ? '#01ff69' : '#fff',
                fontWeight: isWinner(match, true) ? 'bold' : 'normal',
                flex: isMobile ? '1 1 40%' : 'none',
              }}
            >
              {teamName(match, true)}
            </Text>

            <Text
              style={{
                fontSize: 'clamp(20px, 3vw, 28px)',
                fontWeight: 'bold',
                color: '#fff',
                minWidth: 60,
                textAlign: 'center',
              }}
            >
              {match.played ? `${match.homeScore} x ${match.awayScore}` : 'vs'}
            </Text>

            <Text
              strong
              style={{
                fontSize: 'clamp(16px, 2.5vw, 24px)',
                color: isWinner(match, false) ? '#01ff69' : '#fff',
                fontWeight: isWinner(match, false) ? 'bold' : 'normal',
                flex: isMobile ? '1 1 40%' : 'none',
              }}
            >
              {teamName(match, false)}
            </Text>
          </div>

          {/* Botão Jogar */}
          {!match.played && (
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
                fontSize: 'clamp(14px, 2vw, 18px)',
                height: isMobile ? 40 : 'auto',
                padding: isMobile ? '8px 16px' : '10px 24px',
                minWidth: isMobile ? 'auto' : 160,
                alignSelf: isMobile ? 'stretch' : 'center',
              }}
            >
              Jogar
            </Button>
          )}
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
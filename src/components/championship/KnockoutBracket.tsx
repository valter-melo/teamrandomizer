import React, { useState } from 'react';
import { Card, Button, Tag, message } from 'antd';
import type { MatchDetails } from '../types';
import { ScoreboardModal } from './ScoreboardModal';

interface Props {
  matches: MatchDetails[];
  championshipId: string;
  onMatchPlayed?: () => void;
}

export const KnockoutBracket: React.FC<Props> = ({ matches, championshipId, onMatchPlayed }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchDetails | null>(null);

  const handlePlay = (match: MatchDetails) => {
    if (!match.generationSessionId) {
      message.error('Dados da partida incompletos. Não é possível iniciar o jogo.');
      return;
    }
    setSelectedMatch(match);
    setModalVisible(true);
  };

  const stageOrder = ['QUARTER', 'SEMI', 'FINAL', 'THIRD_PLACE'];
  const stageNames: Record<string, string> = {
    QUARTER: 'Quartas de Final',
    SEMI: 'Semifinal',
    FINAL: 'Final',
    THIRD_PLACE: 'Disputa de 3º Lugar',
  };

  const grouped = matches.reduce((acc, match) => {
    const stage = match.stage || 'UNKNOWN';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(match);
    return acc;
  }, {} as Record<string, MatchDetails[]>);

  return (
    <div>      
      {stageOrder.map(stage => {
        console.log('stageOrder', stageOrder)
        const stageMatches = grouped[stage];
        if (!stageMatches || stageMatches.length === 0) return null;
        return (
          <Card key={stage} title={stageNames[stage]} style={{ marginBottom: 16 }}>
            {stageMatches.map(match => (
              <div key={match.matchId} style={{ marginBottom: 12, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                <div>Time {match.homeTeamIndex} vs Time {match.awayTeamIndex}</div>
                <div>
                  {match.played ? (
                    <Tag color="green">{match.homeScore} x {match.awayScore}</Tag>
                  ) : (
                    <Button size="small" type="primary" onClick={() => handlePlay(match)}>Jogar</Button>
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
        />
      )}
    </div>
  );
};
import React from 'react';
import { Card } from 'antd';
import { useMediaQuery } from 'react-responsive';
import type { StandingEntry } from '../types';

interface Props {
  standings: StandingEntry[];
  groupName: string;
  qualifiedCount: number;
  isGroupComplete: boolean;
}

export const GroupStandings: React.FC<Props> = ({ standings, groupName, qualifiedCount, isGroupComplete }) => {
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const columns = [
    { key: 'team', label: 'Time', align: 'left' as const },
    { key: 'points', label: 'P', align: 'center' as const },
    { key: 'played', label: 'J', align: 'center' as const },
    { key: 'wins', label: 'V', align: 'center' as const },
    { key: 'losses', label: 'D', align: 'center' as const },
    { key: 'setsWon', label: 'SP', align: 'center' as const },
    { key: 'setsLost', label: 'SC', align: 'center' as const },
    { key: 'setsDifference', label: 'SS', align: 'center' as const },
    { key: 'goalsFor', label: 'PP', align: 'center' as const },
    { key: 'goalsAgainst', label: 'PC', align: 'center' as const },
    { key: 'goalsDifference', label: 'SP', align: 'center' as const },
  ];

  const getValue = (entry: StandingEntry, key: string) => {
    const map: Record<string, any> = {
      team: entry.teamName || `Time ${entry.teamIndex}`,
      points: entry.points,
      played: entry.played,
      wins: entry.wins,
      losses: entry.losses,
      setsWon: entry.setsWon,
      setsLost: entry.setsLost,
      setsDifference: entry.setsDifference,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      goalsDifference: entry.goalsDifference,
    };
    return map[key] ?? '-';
  };

  const fontSize = isMobile ? 'clamp(10px, 2vw, 13px)' : 'clamp(14px, 1.5vw, 20px)';
  const headerFontSize = isMobile ? 'clamp(10px, 2vw, 14px)' : 'clamp(14px, 1.5vw, 22px)';
  const padding = isMobile ? '6px 4px' : 'clamp(8px, 1vw, 16px)';

  return (
    <Card
      title={<span style={{ color: '#01ff69', fontSize: headerFontSize, fontWeight: 'bold' }}>{groupName}</span>}
      style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 8,
        marginBottom: 16,
      }}
      styles={{
        header: { borderBottom: '1px solid #333' },
        body: { padding: 0, overflowX: 'auto' },
      }}
    >
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize,
        backgroundColor: '#1a1a1a',
        color: '#fff',
      }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{
                backgroundColor: '#0d0d0d',
                color: '#01ff69',
                fontSize: headerFontSize,
                padding,
                fontWeight: 'bold',
                textAlign: col.align,
                border: '1px solid #444',
                whiteSpace: 'nowrap',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((entry, idx) => {
            const isQualified = isGroupComplete && idx < qualifiedCount;
            return (
              <tr
                key={entry.teamIndex}
                style={{
                  backgroundColor: isQualified ? 'rgba(1, 255, 105, 0.12)' : 'transparent',
                  fontWeight: isQualified ? 'bold' : 'normal',
                  borderLeft: isQualified ? '4px solid #01ff69' : '4px solid transparent',
                }}
              >
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding,
                    textAlign: col.align,
                    border: '1px solid #444',
                    color: isQualified ? '#01ff69' : '#ccc',
                    fontWeight: isQualified ? 'bold' : 'normal',
                    whiteSpace: 'nowrap',
                  }}>
                    {getValue(entry, col.key)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};
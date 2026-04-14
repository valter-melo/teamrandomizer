import React from 'react';
import { Card } from 'antd';
import styled from 'styled-components';
import type { StandingEntry } from '../types';

interface Props {
  standings: StandingEntry[];
  groupName: string;
  qualifiedCount: number;     // número de times que se classificam
  isGroupComplete: boolean;   // se todas as partidas do grupo foram jogadas
}

// Tabela estilizada
const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 28px;
  background-color: #1a1a1a;
  color: #fff;

  thead tr th {
    background-color: #0d0d0d;
    color: #2bd96b;
    font-size: 30px;
    padding: 20px 16px;
    font-weight: bold;
    text-align: center;
    border: 1px solid #444;
  }

  tbody tr td {
    font-size: 28px;
    padding: 20px 16px;
    text-align: center;
    border: 1px solid #444;
  }

  tbody tr td:first-child {
    text-align: left;
  }
`;

// Linha com destaque para classificados
const HighlightedRow = styled.tr`
  background-color: rgba(43, 217, 107, 0.2);
  font-weight: bold;
  border-left: 4px solid #2bd96b;
  
  td {
    font-weight: bold;
    color: #2bd96b !important;
  }
`;

export const GroupStandings: React.FC<Props> = ({ standings, groupName, qualifiedCount, isGroupComplete }) => {
  const columns = [
    { key: 'team', label: 'Time', render: (val: StandingEntry) => `Time ${val.teamIndex}` },
    { key: 'points', label: 'P', render: (val: StandingEntry) => val.points },
    { key: 'played', label: 'J', render: (val: StandingEntry) => val.played },
    { key: 'wins', label: 'V', render: (val: StandingEntry) => val.wins },
    { key: 'losses', label: 'D', render: (val: StandingEntry) => val.losses },
    { key: 'goalsDifference', label: 'SG', render: (val: StandingEntry) => val.goalsDifference },
    { key: 'goalsFor', label: 'GP', render: (val: StandingEntry) => val.goalsFor },
    { key: 'goalsAgainst', label: 'GC', render: (val: StandingEntry) => val.goalsAgainst },
  ];

  return (
    <Card
      title={groupName}
      style={{ marginBottom: 16, backgroundColor: '#1a1a1a', border: '1px solid #333' }}
      headStyle={{ fontSize: 28, color: '#2bd96b' }}
    >
      <StyledTable>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((entry, idx) => {
            const isQualified = isGroupComplete && idx < qualifiedCount;
            const RowComponent = isQualified ? HighlightedRow : 'tr';
            return (
              <RowComponent key={entry.teamIndex}>
                {columns.map(col => (
                  <td key={col.key}>{col.render(entry)}</td>
                ))}
              </RowComponent>
            );
          })}
        </tbody>
      </StyledTable>
    </Card>
  );
};
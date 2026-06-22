import React from "react";
import { Card } from "antd";

import type { StandingEntry } from "../types";

interface Props {
  standings: StandingEntry[];
  groupName: string;
  qualifiedCount: number;
  isGroupComplete: boolean;
  isSingleSet?: boolean;
}

type ColumnConfig = {
  key: string;
  label: string;
  align: "left" | "center";
};

const getColumns = (isSingleSet?: boolean): ColumnConfig[] => [
  { key: 'team', label: 'Time', align: 'left' as const },
  { key: 'points', label: 'P', align: 'center' as const },
  { key: 'played', label: 'J', align: 'center' as const },
  { key: 'wins', label: 'V', align: 'center' as const },
  { key: 'losses', label: 'D', align: 'center' as const },
  ...(isSingleSet ? [] : [
    { key: 'setsWon', label: 'SP', align: 'center' as const },
    { key: 'setsLost', label: 'SC', align: 'center' as const },
    { key: 'setsDifference', label: 'SS', align: 'center' as const },
  ]),
  { key: 'goalsFor', label: 'PP', align: 'center' as const },
  { key: 'goalsAgainst', label: 'PC', align: 'center' as const },
  { key: 'goalsDifference', label: 'SP', align: 'center' as const },
];

export const GroupStandings: React.FC<Props> = ({
  standings,
  groupName,
  qualifiedCount,
  isGroupComplete,
  isSingleSet,
}) => {
  const columns = getColumns(isSingleSet);

  const getValue = (entry: StandingEntry, key: string) => {
    const map: Record<string, React.ReactNode> = {
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

    return map[key] ?? "-";
  };

  return (
    <Card
      className="group-standings-card"
      title={<span className="group-standings-title">{groupName}</span>}
    >
      <div className="group-standings-scroll">
        <table className="group-standings-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={
                    column.align === "left" ? "align-left" : "align-center"
                  }
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {standings.map((entry, index) => {
              const isQualified = isGroupComplete && index < qualifiedCount;

              return (
                <tr
                  key={entry.teamIndex}
                  className={`group-standings-row ${
                    isQualified ? "qualified" : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={
                        column.align === "left" ? "align-left" : "align-center"
                      }
                    >
                      {column.key === "team" ? (
                        <span className="group-standings-team">
                          {getValue(entry, column.key)}
                        </span>
                      ) : (
                        getValue(entry, column.key)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
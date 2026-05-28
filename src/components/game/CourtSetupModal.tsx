import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Button,
  InputNumber,
  Input,
  Form,
  Select,
  Spin,
  message,
} from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import * as htmlToImage from 'html-to-image';

import { http } from '../../api/http';
import { 
  CourtDistributionPoster,  
  type PosterCourtAllocation,
  type PosterTeamInfo, 
} from '../CourtDistributionPoster/CourtDistributionPoster';

  interface TeamInfo {
  teamIndex: number;
  teamName: string;
  avgRating: number;
  womenCount: number;
}

interface CourtAllocation {
  name: string;
  teams: TeamInfo[];
}

interface DistributionSuggestion {
  courts: CourtAllocation[];
}

interface TeamPlayer {
  id: string | number;
  name: string;
}

interface GeneratedTeam {
  teamIndex: number;
  name?: string;
  players: TeamPlayer[];
}

interface CourtSetupModalProps {
  open: boolean;
  sessionId: string;
  teams: GeneratedTeam[];
  onCancel: () => void;
  onConfirm: (courts: { name: string; teamIndices: number[] }[]) => void;
}

export const CourtSetupModal: React.FC<CourtSetupModalProps> = ({
  open,
  sessionId,
  teams,
  onCancel,
  onConfirm,
}) => {
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [courtCount, setCourtCount] = useState(1);
  const [courtNames, setCourtNames] = useState<string[]>(['Quadra 1']);
  const [suggestion, setSuggestion] = useState<DistributionSuggestion | null>(null);
  const [assignments, setAssignments] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!open) return;
    fetchSuggestion();
  }, [open, sessionId, courtCount]);

  const fetchSuggestion = async () => {
    if (!sessionId) return;

    setLoadingSuggestion(true);

    try {
      const res = await http.post('/teams/suggest-distribution', {
        sessionId,
        courtCount,
        courtNames: courtNames.slice(0, courtCount),
      });

      const data: DistributionSuggestion = res.data;

      setSuggestion(data);

      const initialAssignments: Record<number, number> = {};

      data.courts.forEach((court, courtIndex) => {
        court.teams.forEach((team) => {
          initialAssignments[team.teamIndex] = courtIndex;
        });
      });

      setAssignments(initialAssignments);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          'Falha ao carregar sugestão de distribuição'
      );
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const allTeams = useMemo<PosterTeamInfo[]>(() => {
    const map = new Map<number, PosterTeamInfo>();

    suggestion?.courts.forEach((court) => {
      court.teams.forEach((team) => {
        map.set(team.teamIndex, {
          teamIndex: team.teamIndex,
          teamName: team.teamName,
          avgRating: team.avgRating,
          womenCount: team.womenCount,
        });
      });
    });

    teams.forEach((team) => {
      if (!map.has(team.teamIndex)) {
        map.set(team.teamIndex, {
          teamIndex: team.teamIndex,
          teamName: team.name || `Time ${team.teamIndex + 1}`,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.teamIndex - b.teamIndex);
  }, [suggestion, teams]);

  const allocatedCourts = useMemo<PosterCourtAllocation[]>(() => {
    return Array.from({ length: courtCount }, (_, courtIndex) => {
      const name = courtNames[courtIndex] || `Quadra ${courtIndex + 1}`;

      const courtTeams = allTeams.filter((team) => {
        return assignments[team.teamIndex] === courtIndex;
      });

      return {
        name,
        teams: courtTeams,
      };
    });
  }, [courtCount, courtNames, allTeams, assignments]);

  const handleCourtCountChange = (value: number | null) => {
    const count = value || 1;

    setCourtCount(count);

    setCourtNames((prev) => {
      const updated = [...prev];

      while (updated.length < count) {
        updated.push(`Quadra ${updated.length + 1}`);
      }

      return updated.slice(0, count);
    });
  };

  const handleCourtNameChange = (index: number, name: string) => {
    setCourtNames((prev) => {
      const updated = [...prev];
      updated[index] = name;
      return updated;
    });
  };

  const handleAssignTeam = (teamIndex: number, courtIndex: number) => {
    setAssignments((prev) => ({
      ...prev,
      [teamIndex]: courtIndex,
    }));
  };

  const handleExportImage = async () => {
    if (!exportRef.current) return;

    try {
      const dataUrl = await htmlToImage.toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#020402',
      });

      const link = document.createElement('a');
      link.download = `distribuicao-quadras-${sessionId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error(error);
      message.error('Não foi possível exportar a imagem');
    }
  };

  const handleConfirm = () => {
    const courts: { name: string; teamIndices: number[] }[] = [];

    for (let i = 0; i < courtCount; i++) {
      const name = courtNames[i] || `Quadra ${i + 1}`;

      const teamIndices: number[] = [];

      Object.entries(assignments).forEach(([teamIndexStr, courtIdx]) => {
        if (courtIdx === i) {
          teamIndices.push(Number(teamIndexStr));
        }
      });

      courts.push({
        name,
        teamIndices,
      });
    }

    onConfirm(courts);
  };

  return (
    <>
      <Modal
        title={<span style={{ color: '#2bd96b' }}>Configurar Quadras</span>}
        open={open}
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancelar
          </Button>,
          <Button
            key="export"
            onClick={handleExportImage}
            disabled={loadingSuggestion || !suggestion}
          >
            Exportar Imagem
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleConfirm}
            loading={loadingSuggestion}
          >
            Iniciar Sessão
          </Button>,
        ]}
        width={700}
        style={{ top: 20 }}
        closeIcon={<CloseOutlined style={{ color: '#2bd96b' }} />}
      >
        <Form layout="vertical">
          <Form.Item label="Número de quadras">
            <InputNumber
              min={1}
              max={teams.length}
              value={courtCount}
              onChange={handleCourtCountChange}
            />
          </Form.Item>

          {Array.from({ length: courtCount }).map((_, idx) => (
            <Form.Item key={idx} label={`Nome da ${idx + 1}ª Quadra`}>
              <Input
                value={courtNames[idx]}
                onChange={(e) => handleCourtNameChange(idx, e.target.value)}
                placeholder={`Quadra ${idx + 1}`}
              />
            </Form.Item>
          ))}

          {loadingSuggestion ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin />
            </div>
          ) : (
            <Form.Item label="Alocar Times para Quadras">
              {allTeams.map((team) => (
                <div
                  key={team.teamIndex}
                  style={{
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ width: 260, color: '#fff' }}>
                    {team.teamName}{' '}
                    <span style={{ fontSize: 12, color: '#aaa' }}>
                      ({team.avgRating?.toFixed(1) ?? '-'} | Mulheres:{' '}
                      {team.womenCount ?? '-'})
                    </span>
                  </span>

                  <Select
                    value={assignments[team.teamIndex] ?? 0}
                    onChange={(val) => handleAssignTeam(team.teamIndex, val)}
                    style={{ width: 220, color: '#fff' }}
                    options={Array.from({ length: courtCount }, (_, i) => ({
                      value: i,
                      label: courtNames[i] || `Quadra ${i + 1}`,
                    }))}
                  />
                </div>
              ))}
            </Form.Item>
          )}
        </Form>
      </Modal>

      <div className="export-hidden-area">
        <CourtDistributionPoster
          ref={exportRef}
          courts={allocatedCourts}
          title="DISTRIBUIÇÃO DAS QUADRAS"
          subtitle="BORAVER"
        />
      </div>
    </>
  );
};
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, Button, Spin, Alert, message, Card } from 'antd';
import { useChampionships } from '../hooks/useChampionships';
import { useGameSession } from '../hooks/useGameSession';
import { GroupStandings } from '../components/championship/GroupStandings';
import { GroupMatches } from '../components/championship/GroupMatches';
import { KnockoutBracket } from '../components/championship/KnockoutBracket';
import { useMatchUpdates } from '../hooks/useMatchUpdates';

const ChampionshipDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { useDetails, generateNextStage, isGeneratingNext, generateThirdPlace, isGeneratingThirdPlace } = useChampionships(id);
  const { data, isLoading, error, refetch } = useDetails();
  const { isActive, startSession, isStarting, refetch: refetchSession } = useGameSession();

  const [activeTab, setActiveTab] = useState('groups');

  // SSE para atualizações em tempo real
  const handleMatchUpdate = (data: any) => {
    console.log('Partida atualizada via SSE:', data);
    refetch(); // recarrega dados do campeonato
    refetchSession(); // atualiza status da sessão (opcional)
  };
  useMatchUpdates(id!, handleMatchUpdate);

  if (isLoading) return <Spin />;
  if (error) return <Alert message="Erro ao carregar detalhes" type="error" />;
  if (!data) return null;

  const { championship, standingsByGroup, matchesByGroup, knockoutMatches } = data;
  const generationSessionId = championship.generationSessionId;

  const isGroupStageComplete = () => {
    const groups = Object.keys(matchesByGroup);
    return groups.length > 0 && groups.every(g => matchesByGroup[parseInt(g)].every(m => m.played));
  };

  const handleStartSession = async () => {
    if (!generationSessionId) {
      message.error('ID da sessão de geração não encontrado');
      return;
    }
    try {
      await startSession(generationSessionId);
      message.success('Sessão de jogos iniciada!');
      refetch(); // recarrega os detalhes do campeonato (opcional)
      refetchSession(); // atualiza o estado isActive
    } catch (err) {
      message.error('Erro ao iniciar sessão. Talvez já exista uma sessão ativa.');
    }
  };

  const handleNextStage = async () => {
    try {
      await generateNextStage();
      await refetch();
      message.success('Próxima fase gerada');
    } catch (err) {
      message.error('Erro ao gerar próxima fase');
    }
  };

  const handleThirdPlace = async () => {
    try {
      await generateThirdPlace();
      await refetch();
      message.success('Disputa de 3º lugar gerada');
    } catch (err) {
      message.error('Erro ao gerar 3º lugar');
    }
  };

  // Lógica para controle da fase eliminatória
  const getCurrentKnockoutStage = () => {
    if (knockoutMatches.length === 0) return null;
    if (knockoutMatches.some(m => m.stage === 'QUARTER')) return 'QUARTER';
    if (knockoutMatches.some(m => m.stage === 'SEMI')) return 'SEMI';
    if (knockoutMatches.some(m => m.stage === 'FINAL')) return 'FINAL';
    return null;
  };

  const isCurrentStageComplete = () => {
    const stage = getCurrentKnockoutStage();
    if (!stage) return false;
    const stageMatches = knockoutMatches.filter(m => m.stage === stage);
    return stageMatches.length > 0 && stageMatches.every(m => m.played);
  };

  const canGenerateNextStage = () => {
    if (knockoutMatches.length === 0) return false;
    const currentStage = getCurrentKnockoutStage();
    if (currentStage === 'FINAL') return false;
    return isCurrentStageComplete();
  };

  const getNextStageButtonText = () => {
    const currentStage = getCurrentKnockoutStage();
    if (currentStage === 'QUARTER') return 'Gerar Semifinais';
    if (currentStage === 'SEMI') return 'Gerar Final';
    return 'Gerar Próxima Fase';
  };

  const renderGroups = () => {
    const groups = Object.entries(standingsByGroup);
    if (groups.length === 0) {
      return (
        <Card>
          <p>Nenhuma partida foi jogada ainda. A classificação será atualizada após os primeiros resultados.</p>
        </Card>
      );
    }

    const qualifiedCount = championship.qualifiedPerGroup ?? 0;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {groups.map(([groupIdx, standings]) => {
          const groupIndex = parseInt(groupIdx);
          const groupMatches = matchesByGroup[groupIndex] || [];
          const isGroupComplete = groupMatches.length > 0 && groupMatches.every(m => m.played);
          return (
            <GroupStandings
              key={groupIdx}
              standings={standings}
              groupName={`Grupo ${groupIdx}`}
              qualifiedCount={qualifiedCount}
              isGroupComplete={isGroupComplete}
            />
          );
        })}
      </div>
    );
  };

  const renderMatches = () => {
    const groups = Object.entries(matchesByGroup);
    if (groups.length === 0) {
      return (
        <Card>
          <p>Nenhuma partida disponível.</p>
        </Card>
      );
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {groups.map(([groupIdx, matches]) => (
          <GroupMatches
            key={groupIdx}
            matches={matches}
            championshipId={id!}
            groupName={`Grupo ${groupIdx}`}
            onMatchPlayed={refetch}
          />
        ))}
      </div>
    );
  };

  const tabItems = [
    {
      key: 'groups',
      label: 'Grupos',
      children: renderGroups(),
    },
    {
      key: 'matches',
      label: 'Partidas',
      children: renderMatches(),
    },
    {
      key: 'knockout',
      label: 'Mata-Mata',
      children: (
        <>
          {/* Botão para gerar a primeira fase eliminatória (quartas) */}
          {knockoutMatches.length === 0 && isGroupStageComplete() && isActive && (
            <Button onClick={handleNextStage} loading={isGeneratingNext} style={{ marginBottom: 16 }}>
              Gerar Fase Eliminatória
            </Button>
          )}

          {/* Botão para gerar a próxima fase (semifinais ou final) */}
          {knockoutMatches.length > 0 && canGenerateNextStage() && isActive && (
            <Button onClick={handleNextStage} loading={isGeneratingNext} style={{ marginBottom: 16 }}>
              {getNextStageButtonText()}
            </Button>
          )}

          {/* Exibição do bracket */}
          {knockoutMatches.length > 0 && (
            <>
              <KnockoutBracket matches={knockoutMatches} championshipId={id!} onMatchPlayed={refetch} />
              {/* Botão para gerar disputa de 3º lugar (opcional) */}
              {knockoutMatches.some(m => m.stage === 'SEMI' && m.played) && !knockoutMatches.some(m => m.stage === 'THIRD_PLACE') && isActive && (
                <Button onClick={handleThirdPlace} loading={isGeneratingThirdPlace} style={{ marginTop: 16 }}>
                  Gerar Disputa de 3º Lugar
                </Button>
              )}
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 48, color: '#2bd96b' }}>{championship.name}</h1>
      <p style={{ fontSize: 20 }}>Sessão ativa: {isActive ? '✅ Sim' : '❌ Não'}</p>
        {/* Botão para iniciar a sessão (aparece apenas se não houver sessão ativa) */}
        {!isActive && championship.status === 'CREATED' && (
          <Button onClick={handleStartSession} loading={isStarting} style={{ marginBottom: 16 }}>
            Iniciar Jogos
          </Button>
        )}      
      <Tabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} />
    </div>
  );
};

export default ChampionshipDetailsPage;
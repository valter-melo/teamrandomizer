import React from 'react';
import { Card, Table, Tag, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useChampionships } from '../../hooks/useChampionships';

export const ChampionshipList: React.FC = () => {
  const navigate = useNavigate();
  const { useList } = useChampionships();
  const { data, isLoading, error } = useList();

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar campeonatos</div>;

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'CREATED' ? 'blue' : status === 'IN_PROGRESS' ? 'green' : 'default'}>{status}</Tag> },
    { title: 'Times', dataIndex: 'teamCount', key: 'teamCount' },
    { title: 'Grupos', dataIndex: 'groupsCount', key: 'groupsCount' },
    {
      title: 'Ações',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button type="link" onClick={() => navigate(`/championships/${record.id}`)}>Detalhes</Button>
      ),
    },
  ];

  return (
    <Card title="Campeonatos">
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Table dataSource={data} columns={columns} rowKey="id" />
      </Space>
    </Card>
  );
};
import { Card, Form, Input, Radio, Table, message, Tag, Modal, Popconfirm, Space, DatePicker } from "antd";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createPlayer, listPlayers, updatePlayer, deletePlayer } from "../api/players";
import type { Player } from "../api/players";
import AppButton from "../components/AppButton";
import PlayerRatingsModal from "../features/players/PlayerRatingsModal";
import { getCurrentRatings } from "../api/ratings";
import { CloseOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

type AvgMap = Record<string, { avg: number; count: number }>;

function computeAvg(ratings: Record<string, number>) {
  const values = Object.values(ratings);
  const used = values.filter((v) => v > 0);
  const count = used.length;
  if (count === 0) return { avg: 0, count: 0 };
  const sum = used.reduce((a, b) => a + b, 0);
  return { avg: sum / count, count };
}

export default function Players() {
  const [items, setItems] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const [avgByPlayerId, setAvgByPlayerId] = useState<AvgMap>({});
  const [avgLoading, setAvgLoading] = useState(false);

  const [ratingsOpen, setRatingsOpen] = useState(false);
  const [ratingsPlayerId, setRatingsPlayerId] = useState<string | null>(null);
  const [ratingsPlayerName, setRatingsPlayerName] = useState<string | undefined>(undefined);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editForm] = Form.useForm();

  const refreshPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPlayers();
      setItems(list);
      return list;
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao listar jogadores");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAverages = useCallback(async (players: Player[]) => {
    if (players.length === 0) return;
    setAvgLoading(true);
    try {
      const results = await Promise.all(
        players.map(async (p) => {
          try {
            const cur = await getCurrentRatings(p.id);
            const { avg, count } = computeAvg(cur);
            return [p.id, { avg, count }] as const;
          } catch {
            return [p.id, { avg: 0, count: 0 }] as const;
          }
        })
      );
      setAvgByPlayerId((prev) => ({ ...prev, ...Object.fromEntries(results) }));
    } finally {
      setAvgLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const list = await refreshPlayers();
    await loadAverages(list);
  }, [refreshPlayers, loadAverages]);

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      // Converte dayjs para string ISO
      const birthDate = values.birthDate
        ? (values.birthDate as Dayjs).format("YYYY-MM-DD")
        : undefined;
      await createPlayer({
        name: values.name,
        sex: values.sex,
        email: values.email || undefined,
        phone: values.phone || undefined,
        birthDate,
      });
      message.success("Jogador criado");
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao criar jogador");
    }
  };

  const openRatings = (p: Player) => {
    setRatingsPlayerId(p.id);
    setRatingsPlayerName(p.name);
    setRatingsOpen(true);
  };

  const closeRatings = () => {
    setRatingsOpen(false);
    setRatingsPlayerId(null);
    setRatingsPlayerName(undefined);
  };

  const reloadOneAverage = useCallback(async (playerId: string) => {
    try {
      const cur = await getCurrentRatings(playerId);
      const { avg, count } = computeAvg(cur);
      setAvgByPlayerId((prev) => ({ ...prev, [playerId]: { avg, count } }));
    } catch {
      // ignore
    }
  }, []);

  const openEdit = (player: Player) => {
    setEditingPlayer(player);
    editForm.setFieldsValue({
      name: player.name,
      sex: player.sex,
      email: player.email ?? "",
      phone: player.phone ?? "",
      birthDate: player.birthDate ? dayjs(player.birthDate) : null,
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingPlayer) return;
    try {
      const values = await editForm.validateFields();
      const birthDate = values.birthDate
        ? (values.birthDate as Dayjs).format("YYYY-MM-DD")
        : undefined;
      await updatePlayer(editingPlayer.id, {
        name: values.name,
        sex: values.sex,
        email: values.email || undefined,
        phone: values.phone || undefined,
        birthDate,
      });
      message.success("Jogador atualizado");
      setEditModalOpen(false);
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao atualizar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlayer(id);
      message.success("Jogador excluído");
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao excluir");
    }
  };

  const columns = useMemo(
    () => [
      { title: "Nome", dataIndex: "name", width: 300 },
      { title: "Sexo", dataIndex: "sex", width: 80 },
      {
        title: "Média Rating",
        key: "avg",
        width: 120,
        render: (_: any, p: Player) => {
          const info = avgByPlayerId[p.id];
          if (avgLoading && !info) return <span style={{ opacity: 0.7 }}>...</span>;
          if (!info || info.count === 0) return <Tag color="default">Sem rating</Tag>;
          return <span style={{ fontWeight: 900 }}>{info.avg.toFixed(1)}</span>;
        },
      },
      {
        title: "Ações",
        width: 220,
        render: (_: any, p: Player) => (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <AppButton
              tone="copy"
              onClick={() => openRatings(p)}
              style={{ width: 80, height: 32, lineHeight: "32px", padding: 0, transition: "none" }}
            >
              Ratings
            </AppButton>
            <AppButton
              tone="save"
              onClick={() => openEdit(p)}
              style={{ width: 70, height: 32, lineHeight: "32px", padding: 0, transition: "none" }}
            >
              Editar
            </AppButton>
            <Popconfirm
              title="Excluir jogador?"
              description="Esta ação é irreversível."
              onConfirm={() => handleDelete(p.id)}
              okText="Sim"
              cancelText="Cancelar"
            >
              <AppButton
                tone="reset"
                style={{ width: 70, height: 32, lineHeight: "32px", padding: 0, transition: "none" }}
              >
                Excluir
              </AppButton>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [avgByPlayerId, avgLoading]
  );

  return (
    <>
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <Card title="Novo Jogador">
          <Form layout="inline" onFinish={handleCreate} initialValues={{ sex: "M" }}>
            <Form.Item name="name" rules={[{ required: true }]} label="Nome">
              <Input style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="sex" label="Sexo" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio.Button value="M">M</Radio.Button>
                <Radio.Button value="F">F</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="email" label="E-mail">
              <Input type="email" style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="phone" label="Celular">
              <Input style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="birthDate" label="Nascimento">
              <DatePicker format="DD/MM/YYYY" placeholder="dd/mm/aaaa" />
            </Form.Item>
            <AppButton tone="generate" htmlType="submit">Adicionar</AppButton>
          </Form>
        </Card>

        <Card
          title="Jogadores"
          extra={
            <AppButton tone="save" onClick={refresh} disabled={loading || avgLoading}>
              Recarregar
            </AppButton>
          }
        >
          <Table<Player>
            rowKey="id"
            loading={loading}
            dataSource={items}
            columns={columns as any}
          />
        </Card>
      </Space>

      <Modal
        title="Editar Jogador"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleUpdate}
        okText="Salvar"
        cancelText="Cancelar"
        closeIcon={<CloseOutlined style={{ color: '#2bd96b' }} />}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sex" label="Sexo" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="M">M</Radio>
              <Radio value="F">F</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="email" label="E-mail">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label="Celular">
            <Input />
          </Form.Item>
          <Form.Item name="birthDate" label="Nascimento">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      <PlayerRatingsModal
        open={ratingsOpen}
        playerId={ratingsPlayerId}
        playerName={ratingsPlayerName}
        onClose={closeRatings}
        onSaved={async () => {
          if (ratingsPlayerId) await reloadOneAverage(ratingsPlayerId);
        }}
      />
    </>
  );
}
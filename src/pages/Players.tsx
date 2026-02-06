import { Card, Form, Input, Radio, Space, Table, message, Tag } from "antd";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createPlayer, listPlayers } from "../api/players";
import type { Player } from "../api/players";
import AppButton from "../components/AppButton";

// ✅ modal
import PlayerRatingsModal from "../features/players/PlayerRatingsModal";

// ✅ busca ratings atuais
import { getCurrentRatings } from "../api/ratings";

type AvgMap = Record<string, { avg: number; count: number }>;

function computeAvg(ratings: Record<string, number>) {
  const values = Object.values(ratings);

  // Se você quiser considerar apenas >0 (recomendado pra “já foi avaliado?”)
  const used = values.filter((v) => v > 0);

  const count = used.length;
  if (count === 0) return { avg: 0, count: 0 };

  const sum = used.reduce((a, b) => a + b, 0);
  return { avg: sum / count, count };
}

export default function Players() {
  const [items, setItems] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  // médias
  const [avgByPlayerId, setAvgByPlayerId] = useState<AvgMap>({});
  const [avgLoading, setAvgLoading] = useState(false);

  // modal state
  const [ratingsOpen, setRatingsOpen] = useState(false);
  const [ratingsPlayerId, setRatingsPlayerId] = useState<string | null>(null);
  const [ratingsPlayerName, setRatingsPlayerName] = useState<string | undefined>(undefined);

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
      // Busca ratings atuais de todos e calcula média
      const results = await Promise.all(
        players.map(async (p) => {
          try {
            const cur = await getCurrentRatings(p.id);
            const { avg, count } = computeAvg(cur);
            return [p.id, { avg, count }] as const;
          } catch {
            // se der erro em um, não quebra tudo
            return [p.id, { avg: 0, count: 0 }] as const;
          }
        })
      );

      setAvgByPlayerId((prev) => {
        const next = { ...prev };
        for (const [id, val] of results) next[id] = val;
        return next;
      });
    } finally {
      setAvgLoading(false);
    }
  }, []);

  async function refresh() {
    const list = await refreshPlayers();
    await loadAverages(list);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(values: any) {
    try {
      await createPlayer(values);
      message.success("Jogador criado");
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao criar jogador");
    }
  }

  function openRatings(p: Player) {
    setRatingsPlayerId(p.id);
    setRatingsPlayerName(p.name);
    setRatingsOpen(true);
  }

  function closeRatings() {
    setRatingsOpen(false);
    setRatingsPlayerId(null);
    setRatingsPlayerName(undefined);
  }

  // Atualiza só a média do jogador editado
  const reloadOneAverage = useCallback(async (playerId: string) => {
    try {
      const cur = await getCurrentRatings(playerId);
      const { avg, count } = computeAvg(cur);
      setAvgByPlayerId((prev) => ({ ...prev, [playerId]: { avg, count } }));
    } catch {
      // ignore
    }
  }, []);

  const columns = useMemo(
    () => [
      { title: "Nome", dataIndex: "name", width: 400 },
      { title: "Sexo", dataIndex: "sex", width: 100 },
      {
        title: "Média Rating",
        key: "avg",
        width: 140,
        render: (_: any, p: Player) => {
          const info = avgByPlayerId[p.id];
          if (avgLoading && !info) return <span style={{ opacity: 0.7 }}>...</span>;

          if (!info || info.count === 0) {
            return <Tag color="default">Sem rating</Tag>;
          }

          return (
            <span style={{ fontWeight: 900 }}>
              {info.avg.toFixed(1)}{" "}
            </span>
          );
        },
      },
      {
        title: "Ações",
        width: 160,
        render: (_: any, p: Player) => (
          <AppButton tone="copy" onClick={() => openRatings(p)}>
            Ratings
          </AppButton>
        ),
      },
    ],
    [avgByPlayerId, avgLoading]
  );

  return (
    <>
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <Card title="Novo Jogador">
          <Form layout="inline" onFinish={onCreate} initialValues={{ sex: "M" }}>
            <Form.Item name="name" rules={[{ required: true }]} label="Nome">
              <Input style={{ width: 280 }} />
            </Form.Item>
            <Form.Item name="sex" label="Sexo" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio.Button value="M">M</Radio.Button>
                <Radio.Button value="F">F</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <AppButton tone="generate" htmlType="submit">
              Adicionar
            </AppButton>
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
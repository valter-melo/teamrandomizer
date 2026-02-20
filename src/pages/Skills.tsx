import { Card, Form, Input, Space, Table, message } from "antd";
import { useEffect, useState } from "react";
import { createSkill, listSkills } from "../api/skills";
import type { Skill } from "../api/skills"
import AppButton from "../components/AppButton";

export default function Skills() {
  const [items, setItems] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listSkills());
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao listar skills");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(values: any) {
    try {
      await createSkill(values);
      message.success("Skill criada");
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao criar skill");
    }
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card title="Nova Skill">
        <Form layout="inline" onFinish={onCreate}>
          <Form.Item name="code" rules={[{ required: true }]} label="Code">
            <Input placeholder="SAQUE" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="name" rules={[{ required: true }]} label="Nome">
            <Input placeholder="Saque" style={{ width: 280 }} />
          </Form.Item>
          <AppButton tone="generate">
            Adicionar
          </AppButton>
        </Form>
      </Card>

      <Card title="Skills">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={[
            { title: "Code", dataIndex: "code" },
            { title: "Nome", dataIndex: "name" },
            { title: "Ativa", dataIndex: "active", render: (v) => (v ? "Sim" : "Não") },
          ]}
        />
      </Card>
    </Space>
  );
}
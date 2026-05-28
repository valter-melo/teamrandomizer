import { Card, Form, Input, Radio, Space, Table, message, Modal, Popconfirm, Tag } from "antd";
import { useEffect, useState } from "react";
import { http } from "../api/http";
import AppButton from "../components/AppButton";

export interface Position {
  id: string;
  name: string;
  active: boolean;
}

export default function PositionsPage() {
  const [items, setItems] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [form] = Form.useForm();

  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await http.get<Position[]>("/positions");
      setItems(data);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao carregar posições");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async (values: { name: string }) => {
    try {
      await http.post("/positions", values);
      message.success("Posição criada");
      refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao criar posição");
    }
  };

  const openEdit = (pos: Position) => {
    setEditing(pos);
    form.setFieldsValue({ name: pos.name, active: pos.active });
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      const values = await form.validateFields();
      await http.put(`/positions/${editing.id}`, values);
      message.success("Posição atualizada");
      setEditModalOpen(false);
      refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao atualizar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/positions/${id}`);
      message.success("Posição excluída");
      refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao excluir");
    }
  };

  const columns = [
    { title: "Nome", dataIndex: "name", key: "name" },
    {
      title: "Ativa",
      dataIndex: "active",
      key: "active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "red"}>{active ? "Sim" : "Não"}</Tag>
      ),
    },
    {
      title: "Ações",
      key: "actions",
      render: (_: any, record: Position) => (
        <div style={{ display: "flex", gap: 8 }}>
          <AppButton tone="save" onClick={() => openEdit(record)}>
            Editar
          </AppButton>
          <Popconfirm
            title="Excluir posição?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sim"
            cancelText="Cancelar"
          >
            <AppButton tone="reset">Excluir</AppButton>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card title="Nova Posição">
        <Form layout="inline" onFinish={handleCreate}>
          <Form.Item name="name" rules={[{ required: true }]} label="Nome">
            <Input placeholder="Levantador" style={{ width: 250 }} />
          </Form.Item>
          <AppButton tone="generate" htmlType="submit">
            Adicionar
          </AppButton>
        </Form>
      </Card>

      <Card title="Posições">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
        />
      </Card>

      <Modal
        title="Editar Posição"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleUpdate}
        okText="Salvar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="active" label="Ativa" valuePropName="checked">
            {/* Podemos usar um Switch ou Radio, mas como é booleano, um Radio.Group */}
            <Radio.Group>
              <Radio value={true}>Sim</Radio>
              <Radio value={false}>Não</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
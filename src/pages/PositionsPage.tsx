import { Card, Form, Input, Modal, Popconfirm, Radio, Table, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";

import { http } from "../api/http";
import AppButton from "../components/AppButton";

const { Title, Text } = Typography;

export interface Position {
  id: string;
  name: string;
  active: boolean;
}

export default function PositionsPage() {
  const [messageApi, contextHolder] = message.useMessage();

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const [items, setItems] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);

  const refresh = async () => {
    setLoading(true);

    try {
      const { data } = await http.get<Position[]>("/positions");
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      messageApi.error(
        error?.response?.data?.message ?? "Erro ao carregar posições"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async (values: { name: string }) => {
    setCreating(true);

    try {
      await http.post("/positions", values);

      messageApi.success("Posição criada com sucesso.");
      createForm.resetFields();

      await refresh();
    } catch (error: any) {
      messageApi.error(
        error?.response?.data?.message ?? "Erro ao criar posição"
      );
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (position: Position) => {
    setEditing(position);

    editForm.setFieldsValue({
      name: position.name,
      active: position.active,
    });

    setEditModalOpen(true);
  };

  const closeEdit = () => {
    setEditModalOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const handleUpdate = async () => {
    if (!editing) return;

    setUpdating(true);

    try {
      const values = await editForm.validateFields();

      await http.put(`/positions/${editing.id}`, values);

      messageApi.success("Posição atualizada com sucesso.");
      closeEdit();

      await refresh();
    } catch (error: any) {
      if (error?.errorFields) return;

      messageApi.error(
        error?.response?.data?.message ?? "Erro ao atualizar posição"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/positions/${id}`);

      messageApi.success("Posição excluída com sucesso.");
      await refresh();
    } catch (error: any) {
      messageApi.error(
        error?.response?.data?.message ?? "Erro ao excluir posição"
      );
    }
  };

  const columns: ColumnsType<Position> = [
    {
      title: "Nome",
      dataIndex: "name",
      key: "name",
      width: "45%",
      ellipsis: true,
      render: (name: string) => <span className="position-name">{name}</span>,
    },
    {
      title: "Status",
      dataIndex: "active",
      key: "active",
      width: "20%",
      align: "center",
      render: (active: boolean) => (
        <span className={`position-status ${active ? "active" : "inactive"}`}>
          {active ? "Ativa" : "Inativa"}
        </span>
      ),
    },
    {
      title: "Ações",
      key: "actions",
      width: "35%",
      align: "center",
      render: (_, record) => (
        <div className="positions-actions">
          <AppButton
            tone="save"
            className="positions-action"
            onClick={() => openEdit(record)}
          >
            Editar
          </AppButton>

          <Popconfirm
            title="Excluir posição?"
            description="Essa ação não poderá ser desfeita."
            onConfirm={() => handleDelete(record.id)}
            okText="Sim"
            cancelText="Cancelar"
          >
            <AppButton tone="reset" className="positions-action">
              Excluir
            </AppButton>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <main className="positions-page">
      {contextHolder}

      <header className="positions-header">
        <Title level={2} className="positions-title">
          Posições
        </Title>

        <Text className="positions-subtitle">
          Cadastre e gerencie as posições usadas no cadastro dos atletas.
        </Text>
      </header>

      <section className="positions-stack">
        <Card
          className="positions-card"
          title={<span className="positions-section-title">Nova Posição</span>}
        >
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreate}
            className="positions-create-form"
          >
            <div className="positions-form-grid">
              <Form.Item
                name="name"
                label="Nome"
                rules={[
                  {
                    required: true,
                    message: "Informe o nome da posição",
                  },
                ]}
              >
                <Input placeholder="Ex: Levantador, Central, Ponteiro..." />
              </Form.Item>

              <Form.Item>
                <div className="positions-submit">
                  <AppButton
                    tone="generate"
                    htmlType="submit"
                    disabled={creating}
                  >
                    <PlusOutlined />
                    Adicionar
                  </AppButton>
                </div>
              </Form.Item>
            </div>
          </Form>
        </Card>

        <Card
          className="positions-card positions-table-card"
          title={
            <span className="positions-section-title">
              Posições cadastradas
            </span>
          }
        >
          <Table<Position>
            rowKey="id"
            loading={loading}
            dataSource={items}
            columns={columns}
            scroll={{
              x: "max-content",
            }}
            pagination={{
              responsive: true,
              pageSize: 10,
              showSizeChanger: false,
            }}
            locale={{
              emptyText: (
                <div className="positions-empty">
                  Nenhuma posição cadastrada.
                </div>
              ),
            }}
          />
        </Card>
      </section>

      <Modal
        title={<span className="positions-modal-title">Editar Posição</span>}
        open={editModalOpen}
        onCancel={closeEdit}
        onOk={handleUpdate}
        confirmLoading={updating}
        okText="Salvar"
        cancelText="Cancelar"
        width={400}
        className="positions-modal"
        closeIcon={<CloseOutlined className="positions-modal-close" />}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label="Nome"
            rules={[
              {
                required: true,
                message: "Informe o nome da posição",
              },
            ]}
          >
            <Input placeholder="Nome da posição" />
          </Form.Item>

          <Form.Item name="active" label="Status">
            <Radio.Group>
              <Radio value={true}>Ativa</Radio>
              <Radio value={false}>Inativa</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
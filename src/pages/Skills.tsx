import { Card, Form, Input, Table, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";

import { createSkill, listSkills } from "../api/skills";
import type { Skill } from "../api/skills";
import AppButton from "../components/AppButton";

const { Title, Text } = Typography;

export default function Skills() {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [items, setItems] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);

    try {
      setItems(await listSkills());
    } catch (error: any) {
      messageApi.error(error?.response?.data?.error ?? "Erro ao listar skills");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(values: { name: string }) {
    setCreating(true);

    try {
      await createSkill(values);

      messageApi.success("Skill criada com sucesso.");
      form.resetFields();

      await refresh();
    } catch (error: any) {
      messageApi.error(error?.response?.data?.error ?? "Erro ao criar skill");
    } finally {
      setCreating(false);
    }
  }

  const columns: ColumnsType<Skill> = [
    {
      title: "Nome",
      dataIndex: "name",
      width: "70%",
      ellipsis: true,
      render: (name: string) => <span className="skill-name">{name}</span>,
    },
    {
      title: "Status",
      dataIndex: "active",
      width: "30%",
      render: (active: boolean) => (
        <span className={`skill-status ${active ? "active" : "inactive"}`}>
          {active ? "Ativa" : "Inativa"}
        </span>
      ),
    },
  ];

  return (
    <main className="skills-page">
      {contextHolder}

      <header className="skills-header">
        <Title level={2} className="skills-title">
          Skills
        </Title>

        <Text className="skills-subtitle">
          Cadastre e acompanhe os critérios usados para avaliação dos atletas.
        </Text>
      </header>

      <section className="skills-stack">
        <Card
          className="skills-card"
          title={<span className="skills-section-title">Nova Skill</span>}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onCreate}
            className="skills-create-form"
          >
            <div className="skills-form-grid">
              <Form.Item
                name="name"
                label="Nome"
                rules={[
                  {
                    required: true,
                    message: "Informe o nome da skill",
                  },
                ]}
              >
                <Input placeholder="Ex: Saque, Ataque, Defesa..." />
              </Form.Item>

              <Form.Item>
                <div className="skills-submit">
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
          className="skills-card skills-table-card"
          title={<span className="skills-section-title">Skills cadastradas</span>}
        >
          <Table<Skill>
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
              emptyText: <div className="skills-empty">Nenhuma skill cadastrada.</div>,
            }}
          />
        </Card>
      </section>
    </main>
  );
}
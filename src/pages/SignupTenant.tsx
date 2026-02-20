import { Button, Card, Form, Input, message } from "antd";
import { registerTenant } from "../api/auth";
import { authStore } from "../auth/store";
import { useNavigate } from "react-router-dom";

export default function SignupTenant() {
  const [form] = Form.useForm();
  const nav = useNavigate();

  async function onFinish(values: any) {
    try {
      const res = await registerTenant(values);
      // se seu backend já devolve token, salva e segue. Se vier token "", só salva tenantId.
      authStore.set({ token: res.token || null, tenantId: res.tenantId, userId: res.userId, role: res.role });
      message.success("Tenant criado com sucesso!");
      nav(res.token ? "/dashboard" : "/login");
    } catch (e: any) {
      console.log(e);
      message.error(e?.response?.data?.message ?? "Falha ao criar tenant");
    }
  }

  return (
    <Card title="Criar Tenant + Admin" style={{ maxWidth: 520 }}>
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item label="Identificador do grupo" name="tenantName" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item label="Nome do grupo (tenant)" name="tenantSlug" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item label="Nome do admin" name="adminName" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
          <Input />
        </Form.Item>

        <Form.Item label="Senha" name="password" rules={[{ required: true, min: 6 }]}>
          <Input.Password />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Criar
        </Button>
      </Form>
    </Card>
  );
}

import { Button, Card, Form, Input, message } from "antd";
import { login } from "../api/auth";
import { authStore } from "../auth/store";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [form] = Form.useForm();
  const nav = useNavigate();

  async function onFinish(values: any) {
    try {
      const res = await login(values);
      authStore.set({ token: res.token, tenantId: res.tenantId, userId: res.userId, role: res.role });
      message.success("Logado!");
      nav("/dashboard");
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Falha no login");
    }
  }

  return (
    <Card title="Login" style={{ maxWidth: 520 }}>
      <Form layout="vertical" form={form} onFinish={onFinish} initialValues={{ tenantId: authStore.getTenantId() ?? "" }}>
        <Form.Item label="TenantId (UUID)" name="tenantId" rules={[{ required: true }]}>
          <Input placeholder="Cole o UUID do tenant" />
        </Form.Item>

        <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
          <Input />
        </Form.Item>

        <Form.Item label="Senha" name="password" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Entrar
        </Button>
      </Form>
    </Card>
  );
}

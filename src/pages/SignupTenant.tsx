import { Button, Card, Form, Input, message } from "antd";
import { registerTenant } from "../api/auth";
import { authStore } from "../auth/store";
import { useNavigate, Link } from "react-router-dom";

export default function SignupTenant() {
  const [form] = Form.useForm();
  const nav = useNavigate();

  async function onFinish(values: any) {
    try {
      const res = await registerTenant(values);

      authStore.set({
        token: res.token || null,
        tenantId: res.tenantId,
        userId: res.userId,
        role: res.role,
        userName: res.userName,
        tenantSlug: values.tenantSlug,
        primaryColor: res.primaryColor,
        secondaryColor: res.secondaryColor,
        logoUrl: res.logoUrl,
        planName: res.planName,
        features: res.features,
        emailVerified: res.emailVerified || false,
      });

      message.success({
        content: "Conta criada com sucesso! Verifique seu e-mail para definir sua senha.",
        duration: 6,
      });

      nav("/login?verified=pending");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Falha ao criar conta";

      if (msg.toLowerCase().includes("já existe")) {
        message.warning("Este identificador de grupo já está em uso. Escolha outro.");
      } else {
        message.error(msg);
      }
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0d0d0d",
        padding: 16,
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/images/logo_light.svg"
            alt="Bora Ver"
            style={{ width: 400, height: "auto" }}
          />
        </div>

        <Card title="Criar Grupo + Administrador">
          <Form layout="vertical" form={form} onFinish={onFinish}>
            <Form.Item
              label="Nome do grupo"
              name="tenantName"
              rules={[{ required: true, message: "Informe o nome do grupo" }]}
            >
              <Input placeholder="Ex.: Vôlei Bora Ver" />
            </Form.Item>

            <Form.Item
              label="Identificador (slug)"
              name="tenantSlug"
              rules={[
                { required: true, message: "Informe um identificador único" },
                { pattern: /^[a-z0-9-]+$/, message: "Apenas letras minúsculas, números e hífen" },
                { min: 3, message: "Mínimo de 3 caracteres" },
              ]}
            >
              <Input placeholder="Ex.: boraver" addonBefore="t/" />
            </Form.Item>

            <Form.Item
              label="Nome do administrador"
              name="adminName"
              rules={[{ required: true, message: "Informe o nome do admin" }]}
            >
              <Input placeholder="Seu nome completo" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Informe o e-mail" },
                { type: "email", message: "E-mail inválido" },
              ]}
            >
              <Input placeholder="admin@exemplo.com" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block style={{ marginBottom: 16 }}>
              Criar Conta
            </Button>
          </Form>

          <div style={{ textAlign: "center" }}>
            <Link to="/login">Já possui uma conta? Faça login</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
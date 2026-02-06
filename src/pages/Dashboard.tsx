import { Card, Typography } from "antd";
import { authStore } from "../auth/store";

export default function Dashboard() {
  const auth = authStore.get();
  return (
    <Card title="Dashboard">
      <Typography.Paragraph>
        Tenant: <b>{auth.tenantId}</b>
      </Typography.Paragraph>
      <Typography.Paragraph>
        User: <b>{auth.userId}</b> — Role: <b>{auth.role}</b>
      </Typography.Paragraph>
      <Typography.Paragraph>
        Próximo passo: cadastrar skills, players e ratings.
      </Typography.Paragraph>
    </Card>
  );
}

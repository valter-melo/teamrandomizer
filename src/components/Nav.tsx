import { Layout, Menu } from "antd";
import {
  TrophyOutlined,
  UserOutlined,
  StarOutlined,
  LogoutOutlined,
  LoginOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { authStore } from "../auth/store";

const { Sider } = Layout;

export default function Nav() {
  const nav = useNavigate();
  const loc = useLocation();
  const { slug } = useParams();
  const token = authStore.getToken();

  const base = slug ? `/t/${slug}` : "";

  const items = token
    ? [
        { key: `${base}/dashboard`, icon: <TrophyOutlined />, label: "Dashboard" },
        { key: `${base}/skills`, icon: <StarOutlined />, label: "Skills" },
        { key: `${base}/players`, icon: <UserOutlined />, label: "Jogadores" },
        { key: `${base}/generator`, icon: <UserOutlined />, label: "Gerar Times" },
        { key: `${base}/logout`, icon: <LogoutOutlined />, label: "Sair" },
      ]
    : [
        { key: `${base}/login`, icon: <LoginOutlined />, label: "Login" },
        // Recomendo signup fora do tenant, mas se você mantiver por slug, funciona
        { key: "/signup", icon: <UserOutlined />, label: "Criar Tenant" },
      ];

  // Seleção mais “inteligente”: seleciona o item que é prefixo do pathname
  const selectedKey =
    items
      .map((i) => i.key)
      .filter((k) => !k.endsWith("/logout"))
      .sort((a, b) => b.length - a.length)
      .find((k) => loc.pathname.startsWith(k)) ?? loc.pathname;

  return (
    <Sider width={220} className="nav-sider">
      <div className="nav-brand">
        <img src="/BoraVer.svg" alt="Logo" className="nav-logo" />
        <div>
          <div className="nav-title">Bora Ver</div>
          <div className="nav-subtitle">
            {slug ? `Grupo: ${slug}` : "Team Generator"}
          </div>
        </div>
      </div>

      <Menu
        className="nav-menu"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items}
        onClick={(e) => {
          if (e.key.endsWith("/logout")) {
            authStore.clear();
            nav(slug ? `/t/${slug}/login` : "/login");
            return;
          }
          nav(e.key);
        }}
      />
    </Sider>
  );
}
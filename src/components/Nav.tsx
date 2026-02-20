// src/layout/Nav.tsx
import { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Tooltip } from "antd";
import {
  TrophyOutlined,
  UserOutlined,
  StarOutlined,
  LogoutOutlined,
  LoginOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { authStore } from "../auth/store";

const { Sider } = Layout;

export default function Nav() {
  const nav = useNavigate();
  const loc = useLocation();
  const { slug } = useParams();
  const token = authStore.getToken();

  // ✅ lembra estado do menu
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("nav:collapsed") === "1");

  useEffect(() => {
    localStorage.setItem("nav:collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const base = slug ? `/t/${slug}` : "";

  const items = useMemo(
    () =>
      token
        ? [
            { key: `${base}/dashboard`, icon: <TrophyOutlined />, label: "Dashboard" },
            { key: `${base}/skills`, icon: <StarOutlined />, label: "Skills" },
            { key: `${base}/players`, icon: <UserOutlined />, label: "Jogadores" },
            { key: `${base}/generator`, icon: <TeamOutlined />, label: "Gerar Times" },
            { key: `${base}/logout`, icon: <LogoutOutlined />, label: "Sair" },
          ]
        : [
            { key: `${base}/login`, icon: <LoginOutlined />, label: "Login" },
            { key: "/signup", icon: <UserOutlined />, label: "Criar Tenant" },
          ],
    [token, base]
  );

  // Seleção “inteligente” (prefixo do pathname)
  const selectedKey = useMemo(() => {
    return (
      items
        .map((i) => i.key)
        .filter((k) => !k.endsWith("/logout"))
        .sort((a, b) => b.length - a.length)
        .find((k) => loc.pathname.startsWith(k)) ?? loc.pathname
    );
  }, [items, loc.pathname]);

  const toggle = () => setCollapsed((c) => !c);

  return (
    <Sider
      width={220}
      collapsedWidth={72}
      collapsed={collapsed}
      trigger={null}
      className="nav-sider"
    >
      {/* BRAND */}
      <div className={`nav-brand ${collapsed ? "collapsed" : ""}`}>
        <img src="/BoraVer.svg" alt="Logo" className="nav-logo" />

        {!collapsed && (
          <div className="nav-brand-text">
            <div className="nav-title">Bora Ver</div>
            <div className="nav-subtitle">{slug ? `Grupo: ${slug}` : "Team Generator"}</div>
          </div>
        )}
      </div>

      {/* MENU */}
      <Menu
        className="nav-menu"
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={[selectedKey]}
        items={items}
        onClick={(e) => {
          if (String(e.key).endsWith("/logout")) {
            authStore.clear();
            nav(slug ? `/t/${slug}/login` : "/login");
            return;
          }
          nav(String(e.key));
        }}
      />

      <div className="nav-footer">
        <Tooltip title={collapsed ? "Expandir menu" : "Recolher menu"} placement="right">
          <button
            type="button"
            className="action-btn-compact generate nav-toggle-btn"
            onClick={toggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </Tooltip>
      </div>
    </Sider>
  );
}
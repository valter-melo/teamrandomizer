import { useMemo } from "react";
import { Layout, Menu, Tooltip, Drawer, FloatButton } from "antd";
import {
  TrophyOutlined,
  UserOutlined,
  StarOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  ScheduleOutlined,
  EditOutlined,
  BarChartOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { FaVolleyballBall } from "@react-icons/all-files/fa/FaVolleyballBall";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import { authStore } from "../auth/store";
import { useState } from "react";

const { Sider } = Layout;

interface NavProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Nav({ collapsed, onToggle }: NavProps) {
  const nav = useNavigate();
  const loc = useLocation();
  const { slug } = useParams();
  const token = authStore.getToken();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const auth = authStore.get();
  const features = auth.features || [];
  const groupName = auth.groupName || slug || "Team Generator";

  const resolveLogoUrl = (logoPath?: string | null) => {
    if (!logoPath) {
      return "/logo_minimal_light.svg";
    }
    if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) {
      return logoPath;
    }
    if (logoPath.startsWith("/api/")) {
      return logoPath;
    }
    if (logoPath.startsWith("/uploads/")) {
      return `/api${logoPath}`;
    }
    return logoPath;
  };

  const logoSrc = resolveLogoUrl(auth.logoUrl);

  const base = slug ? `/t/${slug}` : "";

  const menuItems = useMemo(() => {
    const items = [
      { key: `${base}/dashboard`, icon: <TrophyOutlined />, label: "Dashboard" },
      { key: `${base}/performance`, icon: <BarChartOutlined />, label: "Desempenho" },
      { key: `${base}/skills`, icon: <StarOutlined />, label: "Skills" },
      { key: `${base}/positions`, icon: <FaVolleyballBall />, label: "Posições" },
      { key: `${base}/players`, icon: <UserOutlined />, label: "Jogadores" },
      { key: `${base}/generator`, icon: <TeamOutlined />, label: "Gerar Times" },
    ];

    if (features.includes('campeonatos')) {
      items.push(
        { key: "/manual-teams", icon: <EditOutlined />, label: "Criar Campeonato" },
        { key: "/championships", icon: <ScheduleOutlined />, label: "Campeonatos" }
      );
    }

    items.push({ key: `${base}/logout`, icon: <LogoutOutlined />, label: "Sair" });

    return items;
  }, [token, base, features]);

  const selectedKey = useMemo(() => {
    return (
      menuItems
        .map((i) => i.key)
        .filter((k) => !k.endsWith("/logout"))
        .sort((a, b) => b.length - a.length)
        .find((k) => loc.pathname.startsWith(k)) ?? loc.pathname
    );
  }, [menuItems, loc.pathname]);

  const handleMenuClick = (key: string) => {
    if (key.endsWith("/logout")) {
      authStore.clear();
      nav(slug ? `/t/${slug}/login` : "/login");
      return;
    }
    nav(key);
    setMobileMenuOpen(false);
  };

  const renderMenu = (mode: "inline" | "vertical", inlineCollapsed: boolean) => (
    <Menu
      className="nav-menu"
      mode={mode}
      inlineCollapsed={inlineCollapsed}
      selectedKeys={[selectedKey]}
      items={menuItems}
      onClick={(e) => handleMenuClick(String(e.key))}
    />
  );

  // ─── DESKTOP: Sider fixa ───
  if (!isMobile) {
    return (
      <Sider
        width={220}
        collapsedWidth={72}
        collapsed={collapsed}
        trigger={null}
        className="nav-sider"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          height: "100vh",
          overflow: "auto",
          zIndex: 10,
        }}
      >
        {/* BRAND */}
        <div className={`nav-brand ${collapsed ? "collapsed" : ""}`}>
          <img src={logoSrc} alt="Logo" className="nav-logo" />
          {!collapsed && (
            <div className="nav-brand-text">
              <div className="nav-title">R4NDO</div>
              <div className="nav-subtitle">{groupName.toUpperCase()}</div>
            </div>
          )}
        </div>

        {/* MENU */}
        {renderMenu("inline", collapsed)}

        <div className="nav-footer">
          <Tooltip title={collapsed ? "Expandir menu" : "Recolher menu"} placement="right">
            <button
              type="button"
              className="action-btn-compact generate nav-toggle-btn"
              onClick={onToggle}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </Tooltip>
        </div>
      </Sider>
    );
  }

  // ─── MOBILE: FAB + Drawer ───
  return (
    <>
      <FloatButton
        icon={<MenuOutlined />}
        type="primary"
        style={{
          right: 16,
          bottom: 16,
          backgroundColor: '#01ff69',
          color: '#1a1a1a',
        }}
        onClick={() => setMobileMenuOpen(true)}
      />
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={logoSrc} alt="Logo" style={{ width: 32, height: 32 }} />
            <span style={{ color: '#01ff69', fontWeight: 'bold' }}>{groupName.toUpperCase()}</span>
          </div>
        }
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        size="default"
        styles={{
          header: {
            backgroundColor: '#1a1a1a',
            borderBottom: '1px solid #333',
          },
          body: {
            backgroundColor: '#1a1a1a',
            padding: 0,
          },
        }}
      >
        {renderMenu("vertical", false)}
      </Drawer>
    </>
  );
}
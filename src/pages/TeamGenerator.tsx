import { useCallback, useState } from "react";
import { Tabs } from "antd";
import type { TabsProps } from "antd";
import {
  DatabaseOutlined,
  FundOutlined,
} from "@ant-design/icons";
import { useMediaQuery } from "react-responsive";

import DbTeamGenerator from "../components/DbTeamGenerator";
import { PotSelection } from "../components/PotSelection";

export type PlayerColumns = {
  coluna1: string[];
  coluna2: string[];
  coluna3: string[];
  coluna4: string[];
};

type TabKey = "database" | "potes";

export default function TeamGenerator() {
  const [activeTab, setActiveTab] = useState<TabKey>("database");
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const tabsItems: TabsProps["items"] = [
    {
      key: "database",
      label: (
        <span style={{ fontSize: 'clamp(14px, 2.5vw, 18px)', fontWeight: "bold" }}>
          <DatabaseOutlined /> Sorteio
        </span>
      ),
    },
    {
      key: "potes",
      label: (
        <span style={{ fontSize: 'clamp(14px, 2.5vw, 18px)', fontWeight: "bold" }}>
          <FundOutlined /> Potes
        </span>
      ),
    }
  ];

  const onTabChange = useCallback((k: string) => {
    setActiveTab(k as TabKey);
  }, []);

  return (
    <div style={{ padding: isMobile ? '8px' : 'clamp(12px, 2vw, 24px)', maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        items={tabsItems}
        size="large"
        style={{ overflowX: 'auto' }}
        tabBarStyle={{ color: "#01ff69", fontWeight: "bold" }}
      />      
      {activeTab === "database" && <DbTeamGenerator />}
      {activeTab === "potes" && <PotSelection />}
    </div>
  );
};
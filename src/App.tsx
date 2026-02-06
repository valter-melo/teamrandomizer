import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "antd";
import Nav from "./components/Nav";
import RequireAuth from "./auth/RequireAuth";

import Login from "./pages/Login";
import SignupTenant from "./pages/SignupTenant";
import Dashboard from "./pages/Dashboard";
import Skills from "./pages/Skills";
import Players from "./pages/Players";
import PlayerRatings from "./pages/PlayerRatings";
import TeamGenerator from "./pages/TeamGenerator";

const { Content } = Layout;

export default function App() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Nav />
      <Layout>
        <Content style={{ padding: 24 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignupTenant />} />

            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/skills"
              element={
                <RequireAuth>
                  <Skills />
                </RequireAuth>
              }
            />
            <Route
              path="/players"
              element={
                <RequireAuth>
                  <Players />
                </RequireAuth>
              }
            />
            <Route
              path="/generator"
              element={
                <RequireAuth>
                  <TeamGenerator />
                </RequireAuth>
              }
            />            
            <Route
              path="/players/:playerId/ratings"
              element={
                <RequireAuth>
                  <PlayerRatings />
                </RequireAuth>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
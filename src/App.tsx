import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import ChampionshipsPage from "./pages/ChampionshipsPage";
import ChampionshipDetailPage from "./pages/ChampionshipDetailPage";
import ManualTeamPage from "./pages/ManualTeamPage";

const { Content } = Layout;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
              <Route
                path="/championships"
                element={
                  <RequireAuth>
                    <ChampionshipsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/championships/:id"
                element={
                  <RequireAuth>
                    <ChampionshipDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/manual-teams"
                element={
                  <RequireAuth>
                    <ManualTeamPage />
                  </RequireAuth>
                }
              />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </QueryClientProvider>
  );
}
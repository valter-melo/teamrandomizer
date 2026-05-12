import { http } from "./http";

export type Player = { id: string; name: string; sex: "M" | "F"; active: boolean };

export async function listPlayers() {
  const { data } = await http.get<Player[]>("/players");
  return data;
}

export async function createPlayer(payload: { name: string; sex: "M" | "F" }) {
  const { data } = await http.post<Player>("/players", payload);
  return data;
}

export async function updatePlayer(id: string, data: { name: string; sex: string }) {
  return http.put(`/players/${id}`, data).then(res => res.data);
}

export async function deletePlayer(id: string) {
  return http.delete(`/players/${id}`);
}
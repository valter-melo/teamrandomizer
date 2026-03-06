import { http } from "./http";

export type Skill = { id: string; name: string; active: boolean };

export async function listSkills() {
  const { data } = await http.get<Skill[]>("/skills");
  return data;
}

export async function createSkill(payload: { name: string }) {
  const { data } = await http.post<Skill>("/skills", payload);
  return data;
}
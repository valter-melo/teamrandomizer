import { http } from "./http";

export type Skill = { id: string; code: string; name: string; active: boolean };

export async function listSkills() {
  const { data } = await http.get<Skill[]>("/skills");
  return data;
}

export async function createSkill(payload: { code: string; name: string }) {
  const { data } = await http.post<Skill>("/skills", payload);
  return data;
}
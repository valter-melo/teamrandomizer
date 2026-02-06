type AuthState = {
  token: string | null;
  tenantId: string | null;
  userId: string | null;
  role: string | null;
};

const KEY = "tg_auth_v1";

function load(): AuthState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthState) : { token: null, tenantId: null, userId: null, role: null };
  } catch {
    return { token: null, tenantId: null, userId: null, role: null };
  }
}

let state: AuthState = load();

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export const authStore = {
  get: () => state,
  set: (next: Partial<AuthState>) => {
    state = { ...state, ...next };
    save();
  },
  clear: () => {
    state = { token: null, tenantId: null, userId: null, role: null };
    save();
  },
  getToken: () => state.token,
  getTenantId: () => state.tenantId,
};

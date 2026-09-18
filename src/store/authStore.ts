import { create } from "zustand";
import type { AuthUser } from "../modules/auth/types";

interface AuthState {
  currentUser: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  setUser: (user) => set({ currentUser: user }),
}));
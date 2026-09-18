export interface User {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role_id: number;
  role_code: "ADMIN" | "OPERATOR" | "VIEWER";
  is_active: number;
}

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: "ADMIN" | "OPERATOR" | "VIEWER";
}
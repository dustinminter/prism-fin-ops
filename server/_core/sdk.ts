import type { User } from "../../shared/types/user";

const DEV_USER: User = {
  id: 1,
  openId: "dev-user-001",
  name: "Dev User",
  email: "dev@prism.local",
  role: "admin",
};

export const sdk = {
  authenticateRequest(_req: unknown): User {
    return DEV_USER;
  },
};

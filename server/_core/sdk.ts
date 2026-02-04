import type { User } from "../../shared/types/user";

const DEV_USER: Omit<User, "tenantId"> = {
  id: 1,
  openId: "dev-user-001",
  name: "Dev User",
  email: "dev@prism.local",
  role: "admin",
};

export const sdk = {
  authenticateRequest(_req: unknown): Omit<User, "tenantId"> {
    return DEV_USER;
  },
};

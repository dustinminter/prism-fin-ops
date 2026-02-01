export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// No external OAuth in SPCS — sign-in links are no-ops.
export const getLoginUrl = () => "#";

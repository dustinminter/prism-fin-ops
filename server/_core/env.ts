export const ENV = {
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "3000"),
};

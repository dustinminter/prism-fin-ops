# ============================================================================
# PRISM FinOps - Router Dockerfile for SPCS
# Routes traffic between frontend and backend services
# ============================================================================

FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy template config (uses env vars)
COPY spcs/docker/nginx-router.conf /etc/nginx/templates/default.conf.template

# Copy custom entrypoint that extracts DNS resolver
COPY spcs/docker/router-entrypoint.sh /router-entrypoint.sh
RUN chmod +x /router-entrypoint.sh

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Use custom entrypoint that sets up DNS resolver
CMD ["/router-entrypoint.sh"]

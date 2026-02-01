# ============================================================================
# PRISM FinOps - Frontend Dockerfile for SPCS
# Uses pre-built artifacts (run `pnpm run build:client` first)
# ============================================================================

FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY spcs/docker/nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Copy pre-built static files
COPY dist/public /usr/share/nginx/html

# Create non-root user (nginx already has one)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

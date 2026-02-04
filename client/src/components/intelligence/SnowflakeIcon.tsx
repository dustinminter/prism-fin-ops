// Snowflake official logo mark — icon only (no wordmark)
export function SnowflakeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <img
      src="/logos/snowflake-icon.png"
      alt="Snowflake"
      className={className}
    />
  );
}

// Full Snowflake logo (icon + wordmark) as PNG — for light backgrounds
export function SnowflakeLogo({ className = "h-5" }: { className?: string }) {
  return (
    <img
      src="/logos/snowflake-logo.png"
      alt="Snowflake"
      className={className}
    />
  );
}

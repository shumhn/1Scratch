export const STOCK_NAMES: Record<string, string> = {
  AAPLx: "Apple",
  TSLAx: "Tesla",
  CRCLx: "Circle",
};

export function StockIdentity({
  symbol,
  className = "",
}: {
  symbol: string;
  className?: string;
}) {
  return (
    <span
      className={`stock-icon stock-icon-${symbol.toLowerCase()} ${className}`}
      aria-hidden="true"
    >
      {symbol === "AAPLx" ? (
        <svg viewBox="0 0 32 32" fill="currentColor">
          <path
            d="M20.4 7.6c1.2-1.4 1.1-3 1.1-3s-1.8.1-3 1.5c-1.2 1.3-1.1 2.8-1.1 2.8s1.8.2 3-1.3ZM24.9 18.4c-.1-3.6 3-5.3 3-5.3-1.7-2.5-4.3-2.8-5.2-2.8-2.2-.2-4.3 1.3-5.4 1.3s-2.8-1.3-4.6-1.2c-2.4 0-4.5 1.4-5.7 3.5-2.4 4.2-.6 10.5 1.7 13.8 1.1 1.6 2.4 3.3 4.1 3.2 1.7-.1 2.3-1.1 4.4-1.1 2 0 2.6 1.1 4.4 1 1.8 0 2.9-1.6 4-3.2 1.3-1.9 1.8-3.8 1.9-3.9-.1 0-2.6-1-2.6-5.3Z"
            transform="translate(0 -2) scale(.94)"
          />
        </svg>
      ) : symbol === "TSLAx" ? (
        <svg viewBox="0 0 32 32" fill="currentColor">
          <path d="M5 7c7-3 15-3 22 0l-1 3c-3-1-5-2-8-2l-1 18h-2L14 8c-3 0-5 1-8 2L5 7Zm2 5 5-1 1 3-6-2Zm13-1 5 1-6 2 1-3Z" />
        </svg>
      ) : symbol === "CRCLx" ? (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M21 9a9 9 0 1 0 2 13M11 23a9 9 0 1 0-2-13" />
          <path d="m12 19 8-8m-7 13 8-8" />
        </svg>
      ) : (
        <span>{symbol.slice(0, 1)}</span>
      )}
    </span>
  );
}

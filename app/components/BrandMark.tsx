export default function BrandMark() {
  return (
    <span className="brand-lockup">
      <svg
        width="34"
        height="34"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7 10.5 24 5l5.5 17-17 5.5L7 10.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M7 10h22v6a3 3 0 0 0 0 6v5H7v-5a3 3 0 0 0 0-6v-6Z"
          fill="currentColor"
        />
        <path
          d="m15 14 6 9m-1-10 3 4m-10 3 3 4"
          stroke="var(--logo-ink)"
          strokeWidth="1.5"
        />
      </svg>
      <span>
        1<span className="brand-weight">scratch</span>
        <small>DEVNET</small>
      </span>
    </span>
  );
}

export default function OutfitArt({ category = "Casual", hero = false }) {
  const formal = category.includes("Formal"),
    polo = category === "Smart Casual";
  const shirt = hero
    ? "#f6eee0"
    : formal
      ? "#f7f1df"
      : polo
        ? "#cdc9e8"
        : "#f6eee0";
  return (
    <svg
      className={`outfit-art ${hero ? "hero-art" : ""}`}
      viewBox="0 0 440 340"
      fill="none"
      role="img"
      aria-label={`${category}: atasan, celana, dan sepatu`}
    >
      <ellipse cx="228" cy="307" rx="176" ry="12" fill="#000" opacity=".035" />
      <path
        d="M110 55c0-14 18-17 21-5 2 6-4 10-9 13v11"
        stroke="#7c7966"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M122 72L55 110h135l-68-38Z"
        stroke="#7c7966"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <g transform="rotate(-8 120 170)">
        <path
          d="M82 94l26-12c6 13 22 13 29 0l27 12 40 42-29 25-17-18 4 108H82l4-108-17 18-29-25 42-42Z"
          fill={shirt}
          stroke="#d8cfbe"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M109 83c4 17 23 18 28 0" stroke="#d8cfbe" strokeWidth="5" />
        {(formal || polo) && (
          <>
            <path
              d="m108 85 14 20 15-20M122 106v117"
              stroke="#c7bda8"
              strokeWidth="2"
            />
            <circle cx="126" cy="125" r="1.6" fill="#afa48f" />
            <circle cx="126" cy="147" r="1.6" fill="#afa48f" />
            {formal && (
              <path
                d="M137 124h16v19h-16z"
                stroke="#d8cfbe"
                strokeWidth="1.5"
              />
            )}
          </>
        )}
        <path
          d="M85 237h74M48 139l18 15M179 154l18-16"
          stroke="#d8cfbe"
          strokeWidth="2"
        />
      </g>
      <g transform="rotate(8 292 184)">
        <path
          d="m243 79 83 1 14 201-39 3-23-132-8 133-40-3 13-203Z"
          fill={formal ? "#b8c3c1" : "#bac5b0"}
          stroke="#98a68f"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="m244 91 82 1M278 94v48l-11 9M252 93c-1 20-5 27-13 29M315 93c1 14 5 23 13 28M233 270l35 2M302 272l35-2"
          stroke="#98a68f"
          strokeWidth="2"
        />
        <circle cx="284" cy="86" r="2.2" fill="#77856c" />
      </g>
      <g transform="rotate(-12 142 281)">
        <path
          d="m95 259 24 2 13 18 39 11c12 4 13 17-1 19H89c-14-1-16-10-10-20l16-30Z"
          fill="#fbfaf3"
          stroke="#d8d4c7"
          strokeWidth="2"
        />
        <path
          d="M78 297h102M117 278l13-6M125 285l13-6M133 291l13-6M92 273l10 8"
          stroke="#b7b8a4"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      <g transform="rotate(9 362 98)">
        <rect
          x="340"
          y="77"
          width="45"
          height="22"
          rx="9"
          stroke="#706a56"
          strokeWidth="4"
        />
        <path
          d="M360 84h6m-29 5h-10m61 0h9"
          stroke="#706a56"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M335 107q26 9 56 0"
          stroke="#bba179"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      {hero && (
        <>
          <path
            d="m195 48 4 12 12 4-12 4-4 12-4-12-12-4 12-4 4-12Z"
            fill="#ee7257"
          />
          <path d="m373 238 3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" fill="#6d8860" />
          <circle cx="51" cy="222" r="5" fill="#e9b267" />
        </>
      )}
    </svg>
  );
}

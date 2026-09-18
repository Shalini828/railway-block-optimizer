export function GovtNationalEmblem({ className = "size-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Government of India / Indian Railways Emblem"
    >
      {/* Outer circular crest frame */}
      <circle cx="50" cy="50" r="47" stroke="#003366" strokeWidth="3" fill="#ffffff" />
      <circle cx="50" cy="50" r="43" stroke="#FF9933" strokeWidth="1.5" />

      {/* Ashoka Chakra in Center */}
      <circle cx="50" cy="50" r="18" stroke="#003366" strokeWidth="2.5" fill="#f8fafc" />
      <circle cx="50" cy="50" r="3.5" fill="#003366" />
      {/* 24 Chakra Spokes */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const x2 = 50 + 17 * Math.sin(rad);
        const y2 = 50 - 17 * Math.cos(rad);
        return (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={x2}
            y2={y2}
            stroke="#003366"
            strokeWidth="1"
          />
        );
      })}

      {/* Stylized Train Engine Silhouette in Foreground */}
      <path
        d="M38 68 L62 68 L60 82 L40 82 Z"
        fill="#003366"
      />
      <rect x="42" y="71" width="16" height="5" rx="1" fill="#FF9933" />
      <circle cx="45" cy="80" r="2" fill="#ffffff" />
      <circle cx="55" cy="80" r="2" fill="#ffffff" />

      {/* Decorative Laurel / Wheat stalks on sides */}
      <path
        d="M16 50 C16 32 30 18 50 16 C34 20 22 34 22 50 C22 66 34 80 50 84 C30 82 16 68 16 50 Z"
        fill="#003366"
        opacity="0.85"
      />
      <path
        d="M84 50 C84 32 70 18 50 16 C66 20 78 34 78 50 C78 66 66 80 50 84 C70 82 84 68 84 50 Z"
        fill="#003366"
        opacity="0.85"
      />

      {/* Top Ashoka Crown / Three Lions silhouette representation */}
      <path
        d="M44 26 L44 20 L47 18 L50 21 L53 18 L56 20 L56 26 Z"
        fill="#003366"
      />
      <rect x="42" y="26" width="16" height="3" fill="#FF9933" rx="0.5" />
    </svg>
  );
}

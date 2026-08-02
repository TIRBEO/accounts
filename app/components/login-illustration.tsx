export function LoginIllustration() {
  return (
    <svg viewBox="0 0 620 540" fill="none" className="mx-auto h-auto w-full select-none" aria-hidden="true">
      {/* Person only: transparent SVG so the blue panel supplies the background. */}
      <ellipse cx="310" cy="488" rx="132" ry="15" fill="#0A3B82" fillOpacity="0.30" />

      {/* legs */}
      <rect x="250" y="376" width="42" height="104" rx="19" fill="#243B5A" />
      <rect x="307" y="376" width="42" height="104" rx="19" fill="#243B5A" />
      <rect x="240" y="466" width="61" height="20" rx="10" fill="#17283F" />
      <rect x="299" y="466" width="61" height="20" rx="10" fill="#17283F" />

      {/* shirt + neck */}
      <path d="M213 246c0-28 25-51 56-51h42c31 0 56 23 56 51v135H213V246Z" fill="#F8FAFC" />
      <rect x="280" y="187" width="40" height="42" rx="13" fill="#F2B98D" />

      {/* hair + head */}
      <circle cx="300" cy="143" r="63" fill="#2B2630" />
      <circle cx="300" cy="158" r="51" fill="#F2B98D" />
      <circle cx="248" cy="163" r="11" fill="#E9AA80" />
      <circle cx="352" cy="163" r="11" fill="#E9AA80" />
      <path d="M250 139c6-38 35-58 70-55 28 2 44 18 50 43-23-15-45-18-66-12-16 4-33 13-54 24Z" fill="#2B2630" />
      <circle cx="281" cy="158" r="4" fill="#252A31" />
      <circle cx="319" cy="158" r="4" fill="#252A31" />
      <path d="M286 179c9 8 19 8 28 0" stroke="#B36F55" strokeWidth="3" strokeLinecap="round" />

      {/* arms */}
      <path d="M222 270c-26 28-29 85 22 131" stroke="#F8FAFC" strokeWidth="31" strokeLinecap="round" />
      <path d="M357 270c26 30 30 77 27 126" stroke="#F8FAFC" strokeWidth="31" strokeLinecap="round" />

      {/* phone */}
      <rect x="285" y="235" width="119" height="225" rx="24" fill="#18283D" />
      <rect x="293" y="243" width="103" height="209" rx="17" fill="#F6F9FD" />
      <rect x="326" y="251" width="38" height="5" rx="2.5" fill="#D7E4F5" />
      <path d="M344.5 278 370 290v25c0 21-10 35-25.5 43-15.5-8-25.5-22-25.5-43v-25l25.5-12Z" fill="#1A73E8" />
      <path d="m333 314 8 8 17-18" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="320" y="385" width="50" height="13" rx="6.5" fill="#1A73E8" />
      <rect x="320" y="407" width="50" height="6" rx="3" fill="#C8DCF8" />
      <rect x="320" y="419" width="34" height="6" rx="3" fill="#C8DCF8" />

      {/* hands */}
      <circle cx="281" cy="434" r="16" fill="#F2B98D" />
      <circle cx="411" cy="431" r="16" fill="#F2B98D" />
    </svg>
  );
}

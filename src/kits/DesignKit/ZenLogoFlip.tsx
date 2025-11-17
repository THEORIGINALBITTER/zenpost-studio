import React from "react";
import BLogoIcon from "../../assets/ZenLogo_B.png?url";
import ZenPostLogo from "../../assets/ZenPost.png?url";

interface ZenLogoFlipProps {
  className?: string;
}

export const ZenLogoFlip: React.FC<ZenLogoFlipProps> = ({ className = "" }) => {
  return (
    <div className={`zen-logo-flip-container ${className}`}>
      <div className="zen-logo-flip-inner">
        {/* Vorderseite */}
        <div className="zen-logo-flip-front">
          <img
            src={BLogoIcon}
            alt="B Logo"
            className="object-contain max-w-[70%] max-h-[70%]"
          />
        </div>

        {/* Rückseite */}
<div className="zen-logo-flip-back">
  <div className="flex flex-col items-center justify-center gap-1">
    <img
      src={ZenPostLogo}
      alt="ZenPost Studio"
      className="object-contain max-w-[50%] max-h-[50%]"
    />
    <span className="font-mono text-[9px] text-[#AC8E66] font-semibold">
      ZenPost Studio
    </span>
    <span className="font-mono text-[9px] text-[#AC8E66] font-semibold">
      Version 1.0.0
    </span>
  </div>
</div>



      </div>

      <style>{`
        .zen-logo-flip-container {
          perspective: 1000px;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

  .zen-logo-flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.7s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}


  .zen-logo-flip-container:hover .zen-logo-flip-inner {
  transform: rotateY(180deg) scale(1.05);
}

        @keyframes wobble {
          0%   { transform: rotateY(180deg) scale(1.05) rotateZ(5deg); }
          25%  { transform: rotateY(180deg) scale(1.05) rotateZ(-5deg); }
          50%  { transform: rotateY(180deg) scale(1.05) rotateZ(3deg); }
          75%  { transform: rotateY(180deg) scale(1.05) rotateZ(-2deg); }
          100% { transform: rotateY(180deg) scale(1.05) rotateZ(0deg); }
        }

   .zen-logo-flip-front,
.zen-logo-flip-back {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
}

        .zen-logo-flip-front {
          background: transparent;
        }

.zen-logo-flip-back {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center; /* horizontal zentriert */
  justify-content: center; /* vertikal zentriert */
  flex-direction: column;
  backface-visibility: hidden;
  background: rgba(26,26,26,0.8);
  transform: rotateY(180deg);
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  opacity: 0;
  transition: opacity 0.3s ease 0.35s;
  pointer-events: none;
  padding: 1rem;
}

.zen-logo-flip-container:hover .zen-logo-flip-back {
  opacity: 1;
  pointer-events: auto;
}
      `}</style>
    </div>
  );
};

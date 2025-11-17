// ./kits/PatternKit/ZenLogo.tsx
import BLogoIco from "../../assets/ZenLogo_B.png";

interface ZenLogoProps {
  size?: number;
}

export const ZenLogo = ({ size = 150 }: ZenLogoProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
 
     
        <img
          src={BLogoIco}
          alt="ZenPost Logo"
          style={{
            width: size,
            height: size,
          }}
        />
      </div>
    </div>
  );
};

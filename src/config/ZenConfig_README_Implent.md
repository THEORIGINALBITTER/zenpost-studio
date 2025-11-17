# 🪞 ZenFooter.tsx

Der **ZenFooter** rendert statische Informationen aus der zentralen  
[`zenConfig.ts`](./zenConfig.ts) Datei – minimalistisch, konsistent und typografisch klar.

Er dient als Abschlussbereich der Anwendung und kann um Social-Icons, Version oder Support-Hinweise erweitert werden.

---

## 📂 Speicherort

```
src/kits/PatternKit/ZenFooter.tsx
```

---

## ⚙️ Abhängigkeiten

```tsx
import { zenConfig } from "../config/zenConfig";
import { ZenFooterText } from "./ZenFooterText";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin, faGithub, faTwitter } from "@fortawesome/free-brands-svg-icons";
```

---

## 🧩 Beispiel-Implementierung

```tsx
import React from "react";
import { zenConfig } from "../config/zenConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin, faGithub, faTwitter } from "@fortawesome/free-brands-svg-icons";

export const ZenFooter: React.FC = () => {
  return (
    <footer className="border-t border-[#333] py-6 px-4 flex flex-col items-center gap-3">
      {/* Autor & Ort */}
      <p className="font-mono text-[10px] text-[#777] text-center">
        {zenConfig.author.name} · {zenConfig.address.city} · v{zenConfig.app.version}
      </p>

      {/* Kontakt */}
      <p className="font-mono text-[9px] text-[#666] text-center">
        <a href={`mailto:${zenConfig.author.email}`} className="hover:text-[#AC8E66]">
          {zenConfig.author.email}
        </a>{" "}
        ·{" "}
        <a href={`tel:${zenConfig.author.mobile}`} className="hover:text-[#AC8E66]">
          {zenConfig.author.mobile}
        </a>
      </p>

      {/* Social Icons */}
      <div className="flex gap-4 mt-2">
        {zenConfig.social.linkedin && (
          <a href={zenConfig.social.linkedin} target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faLinkedin} className="text-[#777] hover:text-[#AC8E66]" />
          </a>
        )}
        {zenConfig.social.github && (
          <a href={zenConfig.social.github} target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faGithub} className="text-[#777] hover:text-[#AC8E66]" />
          </a>
        )}
        {zenConfig.social.twitter && (
          <a href={zenConfig.social.twitter} target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faTwitter} className="text-[#777] hover:text-[#AC8E66]" />
          </a>
        )}
      </div>

      {/* Optional: Footertext */}
      <p className="font-mono text-[8px] text-[#555] mt-4">
        © 2025 {zenConfig.author.name} — {zenConfig.app.name}
      </p>
    </footer>
  );
};
```

---

## 💻 Verwendung

Der Footer kann überall eingebunden werden, z. B. in `App.tsx` oder im Haupt-Layout:

```tsx
import { ZenFooter } from "./kits/PatternKit/ZenFooter";

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ... Header / Content ... */}
      <ZenFooter />
    </div>
  );
}
```

---

## 🎨 Gestaltungsprinzipien

- **Typografie:** `font-mono` (IBM Plex Mono oder Courier Prime)  
- **Farbakzent:** `#AC8E66` für Hover oder primäre Interaktion  
- **Linienführung:** schmale obere Trennlinie (`border-t border-[#333]`)  
- **Abstände:** großzügig, mit ruhiger vertikaler Atmung (`py-6`, `gap-3`)  
- **Layout:** zentriert, flexibel, reduziert  

---

## 🌿 Vorteile

- Vollständig **datengetrieben** durch `zenConfig.ts`  
- Einheitliche Darstellung über alle Seiten  
- **Kein Hardcoding** von Strings oder Links  
- Erweiterbar mit zusätzlichen Feldern (`theme`, `legal`, `buildDate` etc.)  

---

## 🪶 Beispielausgabe

> Denis Bitter · Cuxhaven · v1.0.0  
> saghallo@theoriginalbitter.de · +49 151 53231791  
> [GitHub] [LinkedIn] [X]  
> © 2025 Denis Bitter — ZenPost Studio

---

**© 2025 Denis Bitter — ZenPost Studio**  
_„Clarity in Code. Calm in Design.“_

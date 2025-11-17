# 🌀 ZenLogoFlip · V2

Ein reduzierter, perfekt zentrierter 3D-Flip für Logos,\
entwickelt für das **Zen Design Kit** -- ruhig, präzise und
browserstabil.\
Version 2 enthält vollständige Layoutkorrekturen, sauberes 3D-Verhalten\
und eine klare Beschreibung aller behobenen Fehlerquellen.

------------------------------------------------------------------------

## ✨ Überblick

`ZenLogoFlip` ist eine React-Komponente, die auf Hover (oder Klick)\
zwischen einem Front- und Back-Logo dreht.

Front: **B-Logo**\
Back: **ZenPost-Logo + Versionsangabe**

Sie verwendet native CSS-3D-Transformationen\
mit ruhigem Übergang und klarer Mitte.

------------------------------------------------------------------------

## 🧩 Installation

1.  **Bilder ablegen**

        src/assets/ZenLogo_B.png
        src/assets/ZenPost.png

2.  **Import**

    ``` tsx
    import { ZenLogoFlip } from "../kits/DesignKit/ZenLogoFlip";
    ```

3.  **Verwendung**

    ``` tsx
    <div style={{ width: "150px", height: "150px" }}>
      <ZenLogoFlip />
    </div>
    ```

------------------------------------------------------------------------

## ⚙️ Props

  -------------------------------------------------------------------------
  Prop                Typ              Standard        Beschreibung
  ------------------- ---------------- --------------- --------------------
  `className`         `string`         `""`            Optionale
                                                       zusätzliche Klassen
                                                       für z. B. Schatten
                                                       oder Animation.

  -------------------------------------------------------------------------

------------------------------------------------------------------------

## 🧱 Technischer Aufbau

``` text
ZenLogoFlip
├── zen-logo-flip-container  (Flex + Perspective)
│   └── zen-logo-flip-inner  (3D-Raum, Rotation)
│       ├── zen-logo-flip-front  → BLogoIcon
│       └── zen-logo-flip-back   → ZenPostLogo + Versionstext
```

------------------------------------------------------------------------

## 🧠 Fehler & Korrekturen in V2

### 1. Zentrierung

**Problem:** Bilder waren nicht mittig, da kein flex-Center aktiv war.\
**Lösung:**

``` css
display: flex;
align-items: center;
justify-content: center;
```

auf allen Containern (`container`, `inner`, `front`, `back`).

------------------------------------------------------------------------

### 2. Überlappung & Versatz

**Problem:** Vorder- und Rückseite lagen leicht versetzt.\
**Lösung:**\
`position: absolute; inset: 0;` auf beiden Seiten --\
so decken sie sich exakt pixelgenau.

------------------------------------------------------------------------

### 3. Bildgrößen-Verhältnis

**Problem:** `w-1/2 h-1/2` führte zu ungleichen Flächen bei Logos mit
unterschiedlicher Form.\
**Lösung:**\
`max-w-[70%] max-h-[70%] object-contain;`\
→ gleiche visuelle Balance, keine Verzerrung.

------------------------------------------------------------------------

### 4. 3D-Tiefe / Durchblitzen

**Problem:** Rückseite schimmerte beim Flip durch.\
**Lösung:**\
`backface-visibility: hidden;` und `transform-style: preserve-3d;`\
→ echte 3D-Illusion, kein Flackern.

------------------------------------------------------------------------

### 5. Größenverhalten im Parent

**Problem:** Container (z. B. im `WelcomeScreen`) gab zwar Höhe/Breite
vor,\
aber `ZenLogoFlip` nutzte sie nicht vollständig.\
**Lösung:**

``` css
.zen-logo-flip-container {
  width: 100%;
  height: 100%;
}
```
## Problem Größenänderung 
hier kannst du dann die Größe in der Datei WelcomeScreen.tsx selbst festlegen 
da du in der ZenLogoFlip.tsx width 100 und hight 100 sagst 

gilt jedoch für das gesmate Logo 
wilst du nur ein Logo in der Größe ändern, musst du das in der ZenLogoFlip.tsx machen 

``` tsx

 <div className="zen-logo-flip-back">
          <img
            src={ZenPostLogo}
            alt="ZenPost Studio"
            className="object-contain max-w-[50%] max-h-[50%] mb-2"
          />
          <p className="font-mono text-[9px] text-[#AC8E66] font-semibold mt-1">
            Version 1.0 · 2025
          </p>
          ```


``` tsx
  <div style={{ width: '150px', height: '150px' }}>
          <ZenLogoFlip />
        </div>
        ```

→ übernimmt automatisch die Größe des Eltern-Elements.

------------------------------------------------------------------------

### 6. Hover-Verhalten in Safari

**Problem:** Safari verlor 3D-Perspektive bei Hover.\
**Lösung:**\
`perspective: 1000px;` auf dem Container,\
nicht auf dem inneren Element.

------------------------------------------------------------------------

### 7. Kleine UI-Verbesserungen

-   `mt-1` beim Rückseiten-Text → Abstand unter dem Logo\
-   `rgba(26,26,26,0.9)` → sanfterer Hintergrund\
-   `backdrop-filter: blur(8px)` → leichter Zen-Schimmer\
-   `transition: transform 0.6s ease-in-out;` → natürlicher Flip

------------------------------------------------------------------------

## 🎨 Design-Details siehe Safari Fix bei Hover 1000px

  Merkmal       Wert
  ------------- ----------------------
  Perspektive   `1000px`
  Rahmenfarbe   `#AC8E66`
  Hintergrund   `rgba(26,26,26,0.9)`
  Schrift       `IBM Plex Mono`
  Textgröße     `9px`
  Flip          `rotateY(180deg)`
  Radius        `12px`
  Blur          `8px`

------------------------------------------------------------------------

## 💡 Tipps

-   Verwende `object-contain` für alle Logografiken.\

-   Du kannst statt `:hover` auch einen **Klick-Flip** implementieren:

    ``` tsx
    const [flipped, setFlipped] = useState(false);
    <div onClick={() => setFlipped(!flipped)} className={flipped ? "rotateY-180" : ""}>
    ```

-   Mit `transition: transform 0.8s cubic-bezier(0.4, 0.1, 0.2, 1)`
    erreichst du ein besonders weiches Zen-Gefühl.

------------------------------------------------------------------------

## 🧘 Beispiel im Layout

``` tsx
<div className="flex flex-col items-center justify-center min-h-screen bg-[#1A1A1A]">
  <div style={{ width: "150px", height: "150px" }}>
    <ZenLogoFlip />
  </div>
  <h4 className="font-mono text-2xl text-[#e5e5e5] mt-4">Willkommen</h4>
  <p className="font-mono text-xs text-[#888]">ZenPost – dein Markdown kann mehr.</p>
</div>
```

------------------------------------------------------------------------

## 🔧 To-Do für Version 3

-   [ ] Optionaler Flip per Klick (nicht nur Hover)\
-   [ ] Auto-Rotation bei Inaktivität\
-   [ ] Fade-Transition zwischen Logos\
-   [ ] Adaptive Größenverhältnisse für quadratische und rechteckige
    Logos

------------------------------------------------------------------------

## 🧾 Lizenz

Teil des **Zen Design Kit**\
© 2025 Denis Bitter --- *ZenPost Studio*

Verwendung frei in allen Zen-basierten Projekten,\
unter Nennung der Quelle in externen Repos:

> *Design & Code © Denis Bitter -- ZenPost Studio 2025*

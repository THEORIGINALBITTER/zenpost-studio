# 🌀 ZenLogoFlip

Eine minimalistische React-Komponente für ein 3D-Flip-Logo mit Vorder-
und Rückseite.\
Ideal für **ZenPost Studio** oder jedes Projekt, das visuelle Ruhe,
Bewegung und Präzision vereinen möchte.

------------------------------------------------------------------------

## ✨ Übersicht

`ZenLogoFlip` zeigt auf der Vorderseite das Haupt-Icon (z. B. dein
*B-Logo*)\
und auf der Rückseite das **ZenPost-Logo mit Versionsangabe**.

Beim Hover wird die Karte sanft in 3D gedreht (`rotateY(180deg)`).

------------------------------------------------------------------------

## 🧩 Installation

1.  **Bilder ablegen**

    Lege deine Logo-Dateien im `assets`-Ordner ab:

        src/assets/ZenLogo_B.png
        src/assets/ZenPost.png

2.  **Import**

    ``` tsx
    import { ZenLogoFlip } from "../kits/DesignKit/ZenLogoFlip";
    ```

------------------------------------------------------------------------

## 🧱 Verwendung

``` tsx
<div style={{ width: "150px", height: "150px" }}>
  <ZenLogoFlip />
</div>
```

> Die Komponente ist responsiv -- sie passt sich automatisch an die
> Containergröße an.\
> Empfohlenes Mindestmaß: **120 × 120 px**.

------------------------------------------------------------------------

## ⚙️ Props

  -------------------------------------------------------------------------
  Prop                Typ              Standard        Beschreibung
  ------------------- ---------------- --------------- --------------------
  `className`         `string`         `""`            Optionale
                                                       zusätzliche
                                                       CSS-Klassen (z. B.
                                                       für Animation oder
                                                       Schatten).

  -------------------------------------------------------------------------

------------------------------------------------------------------------

## 🎨 Design-Details

-   **3D-Perspektive:** `perspective: 1000px`\
-   **Rotation:** sanftes `transform: rotateY(180deg)` beim Hover\
-   **Farben:**
    -   Hintergrund: `rgba(26,26,26,0.9)`\
    -   Rahmen: `#AC8E66` (Zen-Gold)\
-   **Rückseite:** leicht transparent mit `backdrop-filter: blur(8px)`\
-   **Typografie:** `IBM Plex Mono` in 9 px -- zentriert unter dem Logo

------------------------------------------------------------------------

## 📸 Aufbau

``` text
ZenLogoFlip
├── zen-logo-flip-container
│   └── zen-logo-flip-inner
│       ├── zen-logo-flip-front  → BLogoIcon
│       └── zen-logo-flip-back   → ZenPostLogo + Versionstext
```

------------------------------------------------------------------------

## 💡 Tipps

-   Passe die Größe über den äußeren Container (`width` / `height`) an.\
-   Für dunkle Themes eignet sich `rgba(26,26,26,0.9)` als
    Rückseiten-Farbe.\
-   Wenn du den Flip-Effekt bei Klick statt bei Hover möchtest,\
    kannst du `:hover` durch ein React-State-Toggle ersetzen.

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

## 🧠 Lizenz / Nutzung

Diese Komponente ist Teil des **Zen Design Kit**\
und darf in internen oder öffentlichen Zen-Projekten frei verwendet
werden.\
Bitte erwähne bei externer Nutzung:\
\> *Design & Code © Denis Bitter -- ZenPost Studio 2025*

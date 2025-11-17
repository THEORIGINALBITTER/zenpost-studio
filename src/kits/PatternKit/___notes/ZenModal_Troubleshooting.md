# 🧘‍♂️ ZenModal — Troubleshooting Guide

### Ziel
Dieses Dokument hilft dir, alle häufigen Probleme mit dem **ZenModal-System** (Modal, About-Modal, Close-Button, Overlay, Blur) schnell zu erkennen und zu beheben.

---

## 📦 Strukturüberblick

```
src/kits/
 ├─ DesignKit/
 │   └─ ZenCloseButton.tsx
 ├─ PatternKit/
 │   ├─ ZenModal.tsx          ← Basis-Modal (technische Schicht)
 │   ├─ ZenAboutModal.tsx     ← Inhalts-Modal (nutzt ZenModal)
 │   └─ ZenFooterText.tsx
 └─ screens/
     └─ WelcomeScreen.tsx     ← öffnet ZenAboutModal
```

---

## ⚙️ Datenfluss

1. **WelcomeScreen**
   Öffnet das About-Modal via `setIsModalOpen(true)`
   ```tsx
   <ZenAboutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
   ```

2. **ZenAboutModal**
   Enthält Inhalt + Buttons, ruft intern `ZenModal` auf.
   ```tsx
   <ZenModal isOpen={isOpen} onClose={onClose}>…</ZenModal>
   ```

3. **ZenModal**
   - Rendert per `createPortal` in `#zen-modal-root`
   - Blurrt den `#root`-Inhalt
   - Verhindert Scrollen
   - Schließt bei Klick außerhalb

4. **ZenCloseButton**
   Löst `onClose()` aus, wenn angeklickt.

---

## 🔍 Typische Fehler & Lösungen

### 1️⃣ Modal schließt nicht beim Klick auf Close-Button
**Ursache:** `e.stopPropagation()` blockiert Event oder doppelte Modal-Instanz.
**Lösung:**
- Im `ZenCloseButton` nur `e.preventDefault()`, **kein `stopPropagation()`**.
- Sicherstellen, dass **nur eine** Datei `ZenModal.tsx` existiert.
- `onClick={onClose}` **nur** auf dem Overlay, nicht auf der gesamten Modal-Ebene.

---

### 2️⃣ Overlay blockiert alle Klicks im Modal
**Ursache:** Overlay-Ebene fängt Pointer-Events ab.
**Lösung:**
```tsx
<div
  className="absolute inset-0 bg-black/60 backdrop-blur-lg cursor-pointer"
  onClick={onClose}
/>
<div
  className="relative max-w-lg w-[90%] z-20 pointer-events-auto"
  onClick={(e) => e.stopPropagation()}
/>
```

---

### 3️⃣ Doppelte Modale oder kein Blur
**Ursache:** zweite `ZenModal`-Kopie oder falscher Import.
**Lösung:**
- Nur eine Datei: `src/kits/PatternKit/ZenModal.tsx`.
- In allen anderen Modalen:
  ```tsx
  import { ZenModal } from "./ZenModal";
  ```

---

### 4️⃣ Blur bleibt aktiv nach Schließen
**Ursache:** `useEffect`-Cleanup fehlt oder `isOpen` bleibt true.
**Lösung:**
`ZenModal`-Hook enthält:
```tsx
return () => {
  if (appRoot) appRoot.style.filter = "";
  document.body.style.overflow = "";
};
```

---

### 5️⃣ Falsche Groß-/Kleinschreibung bei Imports
**Ursache:** macOS ignoriert Case, Build-System nicht.
**Lösung:**
Dateiname exakt:
`ZenAboutModal.tsx` (nicht `ZenAboutmodal.tsx`)

---

## ✅ Final getestete Kombination

**WelcomeScreen.tsx**
```tsx
import { ZenAboutModal } from "../kits/PatternKit/ZenAboutModal";
…
<ZenInfoFooter onClick={() => setIsModalOpen(true)} />
<ZenAboutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
```

**ZenAboutModal.tsx**
```tsx
import { ZenModal } from "./ZenModal";
import { ZenCloseButton } from "../DesignKit/ZenCloseButton";
…
<ZenModal isOpen={isOpen} onClose={onClose}>
  <div className="relative">
    <ZenCloseButton onClick={onClose} className="absolute top-4 right-4" />
    …
  </div>
</ZenModal>
```

**ZenModal.tsx**
```tsx
<div
  className="absolute inset-0 bg-black/60 backdrop-blur-lg cursor-pointer"
  onClick={onClose}
/>
<div
  className="relative max-w-lg w-[90%] z-20 pointer-events-auto"
  onClick={(e) => e.stopPropagation()}
>
  {children}
</div>
```

**ZenCloseButton.tsx**
```tsx
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  onClick?.();
};
```

---

## 💬 Best Practice

- Nur **eine zentrale Modal-Basis** im Projekt.
- Kein `stopPropagation()` in interaktiven Child-Komponenten.
- Overlay immer separat vom Inhalt.
- Konsistente Z-Index-Struktur (`Overlay z-10`, `Content z-20`).
- Blur und Scroll-Block im Cleanup entfernen.

---

> 🧠 **Merksatz:**
> *Ein ZenModal lebt nur in einer Ebene –  
> alle anderen Modale atmen darin.*

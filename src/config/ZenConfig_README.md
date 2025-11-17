# 🧭 zenConfig.ts

Zentrale Konfigurationsdatei für **ZenPost Studio**  
Definiert alle statischen Basisinformationen der Anwendung –  
App-Metadaten, Autor-Informationen, Adresse, Social-Links und externe Referenzen.  

Diese Datei dient als **Single Source of Truth** für Header, Footer, Modals, Impressum und Support-Komponenten.

---

## 📂 Speicherort

```
src/config/zenConfig.ts
```

---

## 🧩 Strukturübersicht

```ts
export interface ZenConfig {
  app: AppInfo;
  author: AuthorInfo;
  address: AddressInfo;
  social: SocialLinks;
  links: LinkItem[];
}
```

---

## 🪶 Inhalt

### 🔹 App-Informationen

```ts
app: {
  name: "ZenPost Studio",
  version: "1.0.0",
  description: "Transform your Markdown files into Editor.js JSON format with ease.",
}
```

| Feld | Beschreibung |
|------|---------------|
| `name` | Anzeigename der Anwendung |
| `version` | Versionsnummer |
| `description` | Kurzbeschreibung (z. B. für About-Modal, Footer, SEO) |

---

### 🔹 Autor-Informationen

```ts
author: {
  name: "Denis Bitter",
  website: "https://denisbitter.de",
  email: "saghallo@theoriginalbitter.de",
  phone: "+49 471 1234567",
  mobile: "+49 151 53231791",
}
```

| Feld | Beschreibung |
|------|---------------|
| `name` | Hauptautor oder Herausgeber |
| `website` | Offizielle Website |
| `email` | Kontaktadresse |
| `phone` | Festnetz |
| `mobile` | Direktkontakt / Support-Mobilnummer |

---

### 🔹 Adress-Informationen

```ts
address: {
  street: "Beispielstraße 12",
  postalCode: "27472",
  city: "Cuxhaven",
  country: "Deutschland",
}
```

| Feld | Beschreibung |
|------|---------------|
| `street` | Straße und Hausnummer |
| `postalCode` | Postleitzahl |
| `city` | Stadt |
| `country` | Land |

---

### 🔹 Social-Links

```ts
social: {
  linkedin: "https://linkedin.com/in/denisbitter",
  youtube: "https://youtube.com/@theoriginalbitter",
  instagram: "https://instagram.com/theoriginalbitter",
  twitter: "https://twitter.com/denisbitter",
  github: "https://github.com/theoriginalbitter",
}
```

Diese Links können in Social-Icon-Komponenten oder im Footer automatisch gerendert werden.

---

### 🔹 Externe Links

```ts
links: [
  {
    icon: faGithub,
    label: "GitHub",
    url: "https://github.com/theoriginalbitter/zenpost-studio",
    description: "View source code",
  },
  {
    icon: faGlobe,
    label: "Website",
    url: "https://denisbitter.de",
    description: "Visit website",
  },
  ...
]
```

| Feld | Beschreibung |
|------|---------------|
| `icon` | FontAwesome-Icon |
| `label` | Titel des Links |
| `url` | Zieladresse |
| `description` | Tooltip / Beschreibung (optional) |

---

## 💻 Zugriff im Code

Beispiele für den Zugriff in React-Komponenten:

```tsx
import { zenConfig } from "../config/zenConfig";

// App-Name
console.log(zenConfig.app.name);

// Autor-Name
console.log(zenConfig.author.name);

// Adresse
console.log(zenConfig.address.street);

// Social-Link
console.log(zenConfig.social.linkedin);
```

---

## 🪶 Beispiel im Footer

```tsx
<p className="font-mono text-[10px] text-[#777] text-center">
  {zenConfig.author.name} · {zenConfig.address.city} · {zenConfig.app.version}
</p>
```

Ergebnis:

> Denis Bitter · Cuxhaven · v1.0.0

---

## 🌿 Vorteile

- **Zentrale Pflege:** Eine Datei, alle statischen Infos  
- **Konsistenz:** Einheitliche Daten in Header, Footer & Modals  
- **Autovervollständigung:** Dank Interface-Definitionen  
- **Erweiterbar:** Leicht um `legal`, `theme` oder `meta` ergänzbar  

---

## 🧘 Best Practice

- Niemals lokale Strings in Komponenten verwenden.  
  → Stattdessen immer über `zenConfig` referenzieren.  
- Änderungen an `zenConfig.ts` wirken automatisch in allen Bereichen.  
- Für dynamische Werte (z. B. User, State) separate Config oder Context nutzen.

---

**© 2025 Denis Bitter — ZenPost Studio**  
_„Clarity in Code. Calm in Design.“_

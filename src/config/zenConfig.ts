import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faGlobe,
  faLifeRing,
  faPhone,
  faMobileScreen,
} from "@fortawesome/free-solid-svg-icons";
import {
  faGithub,
  faTwitter,
  faLinkedin,
  faYoutube,
  faInstagram,
} from "@fortawesome/free-brands-svg-icons";

//
// 🔧 Typdefinitionen für klare Struktur & Autovervollständigung
//
interface LinkItem {
  icon: IconDefinition;
  label: string;
  url: string;
  description?: string;
}

interface AuthorInfo {
  name: string;
  website: string;
  email: string;
  phone: string;
  mobile: string;
}

interface AddressInfo {
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

interface SocialLinks {
  linkedin?: string;
  youtube?: string;
  instagram?: string;
  twitter?: string;
  github?: string;
}

interface AppInfo {
  name: string;
  version: string;
  description: string;
}

export interface ZenConfig {
  app: AppInfo;
  author: AuthorInfo;
  address: AddressInfo;
  social: SocialLinks;
  links: LinkItem[];
}

//
// 🧘 Hauptkonfiguration – zentral für Footer, Modals, Header usw.
//
export const zenConfig: ZenConfig = {
  app: {
    name: "ZenPost Studio",
    version: "1.0.0",
    description:
      "Transform your Markdown files into Editor.js JSON format with ease.",
  },

  author: {
    name: "Denis Bitter",
    website: "https://denisbitter.de",
    email: "saghallo@theoriginalbitter.de",
    phone: "+49 471 1234567",     // optional Festnetz
    mobile: "+49 151 53231791",   // dein echtes Handy
  },

  address: {
    street: "Beispielstraße 12",
    postalCode: "27472",
    city: "Cuxhaven",
    country: "Deutschland",
  },

  social: {
    linkedin: "https://linkedin.com/in/denisbitter",
    youtube: "https://youtube.com/@theoriginalbitter",
    instagram: "https://instagram.com/theoriginalbitter",
    twitter: "https://twitter.com/denisbitter",
    github: "https://github.com/theoriginalbitter",
  },

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
    {
      icon: faLifeRing,
      label: "Support",
      url: "mailto:saghallo@denisbitter.de",
      description: "Contact support",
    },
    {
      icon: faPhone,
      label: "Telefon",
      url: "tel:+494711234567",
      description: "Ruf uns an",
    },
    {
      icon: faMobileScreen,
      label: "Mobil",
      url: "tel:+4915153231791",
      description: "Direktkontakt",
    },
    {
      icon: faTwitter,
      label: "X / Twitter",
      url: "https://twitter.com/denisbitter",
      description: "Follow on X",
    },
    {
      icon: faLinkedin,
      label: "LinkedIn",
      url: "https://linkedin.com/in/denisbitter",
      description: "Connect on LinkedIn",
    },
    {
      icon: faYoutube,
      label: "YouTube",
      url: "https://youtube.com/@theoriginalbitter",
      description: "Watch on YouTube",
    },
    {
      icon: faInstagram,
      label: "Instagram",
      url: "https://instagram.com/denisbitter",
      description: "Follow on Instagram",
    },
  ],
};

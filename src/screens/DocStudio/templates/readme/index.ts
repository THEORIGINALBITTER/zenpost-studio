/**
 * Smart README Template Selection
 * Wählt automatisch das passende README-Template basierend auf Projekt-Analyse
 */

import type { ProjectInfo } from '../../types';
import { libraryTemplate } from './library.template';
import { appTemplate } from './app.template';
import { apiTemplate } from './api.template';

export { libraryTemplate } from './library.template';
export { appTemplate } from './app.template';
export { apiTemplate } from './api.template';

export type ReadmeTemplateType = 'library' | 'app' | 'api';

// Dependencies die auf API/Backend hinweisen
const API_INDICATORS = [
  'express',
  'fastify',
  'hono',
  'koa',
  '@nestjs/core',
  'nestjs',
  '@hapi/hapi',
  'restify',
  'polka',
  'micro',
  'apollo-server',
  '@apollo/server',
  'graphql-yoga',
  'trpc',
  '@trpc/server',
];

// Dependencies die auf App/Frontend hinweisen
const APP_INDICATORS = [
  'next',
  'nuxt',
  'vite',
  '@vitejs/plugin-react',
  '@vitejs/plugin-vue',
  'tauri',
  '@tauri-apps/api',
  '@tauri-apps/cli',
  'electron',
  'electron-builder',
  'react-native',
  'expo',
  '@remix-run/react',
  'remix',
  'astro',
  'svelte-kit',
  '@sveltejs/kit',
  'gatsby',
  'create-react-app',
  'vue-cli',
  '@vue/cli',
];

/**
 * Erkennt den Projekttyp basierend auf den Dependencies
 */
export function detectProjectType(projectInfo: ProjectInfo | null): ReadmeTemplateType {
  if (!projectInfo || !projectInfo.dependencies || projectInfo.dependencies.length === 0) {
    return 'library'; // Fallback
  }

  const deps = projectInfo.dependencies.map(d => d.toLowerCase());

  // Prüfe zuerst auf API-Indikatoren
  const hasApiIndicator = API_INDICATORS.some(indicator =>
    deps.some(dep => dep.includes(indicator.toLowerCase()))
  );

  if (hasApiIndicator && !projectInfo.hasApi === false) {
    // Wenn hasApi explizit false ist, aber API-Dependencies vorhanden sind,
    // könnte es ein Full-Stack-Projekt sein - dann App bevorzugen
    const hasAppIndicator = APP_INDICATORS.some(indicator =>
      deps.some(dep => dep.includes(indicator.toLowerCase()))
    );

    if (hasAppIndicator) {
      return 'app'; // Full-Stack → App-Template
    }
    return 'api';
  }

  // Prüfe auf App-Indikatoren
  const hasAppIndicator = APP_INDICATORS.some(indicator =>
    deps.some(dep => dep.includes(indicator.toLowerCase()))
  );

  if (hasAppIndicator) {
    return 'app';
  }

  // Fallback: Library
  return 'library';
}

/**
 * Gibt das passende README-Template zurück
 */
export function getSmartReadmeTemplate(projectInfo: ProjectInfo | null): string {
  const type = detectProjectType(projectInfo);
  return getReadmeTemplateByType(type);
}

/**
 * Gibt ein README-Template nach Typ zurück
 */
export function getReadmeTemplateByType(type: ReadmeTemplateType): string {
  switch (type) {
    case 'api':
      return apiTemplate;
    case 'app':
      return appTemplate;
    case 'library':
    default:
      return libraryTemplate;
  }
}

/**
 * Gibt einen Hinweis-Text zurück, warum dieses Template gewählt wurde
 */
export function getTemplateHint(projectInfo: ProjectInfo | null): string | null {
  if (!projectInfo) {
    return '> Diese Vorlage wurde erstellt, weil keine Projektinfos gefunden wurden.';
  }

  const type = detectProjectType(projectInfo);
  const deps = projectInfo.dependencies;

  switch (type) {
    case 'api':
      const apiDep = deps.find(d =>
        API_INDICATORS.some(i => d.toLowerCase().includes(i.toLowerCase()))
      );
      return apiDep
        ? `> API-Template gewählt (erkannt: ${apiDep})`
        : null;

    case 'app':
      const appDep = deps.find(d =>
        APP_INDICATORS.some(i => d.toLowerCase().includes(i.toLowerCase()))
      );
      return appDep
        ? `> App-Template gewählt (erkannt: ${appDep})`
        : null;

    case 'library':
    default:
      return null; // Library ist der Standard, kein Hinweis nötig
  }
}

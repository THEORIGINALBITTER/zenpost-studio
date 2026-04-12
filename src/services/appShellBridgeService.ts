type AppScreen = 'zen-note';
type SettingsTab = 'ai' | 'social' | 'editor' | 'license' | 'localai' | 'api' | 'zenstudio' | 'mobile' | 'cloud';
type AppNavigationRequest = { screen: AppScreen; noteId?: number | null };

type NavigateListener = (request: AppNavigationRequest) => void;
type OpenSettingsListener = (tab: SettingsTab) => void;

const navigateListeners = new Set<NavigateListener>();
const openSettingsListeners = new Set<OpenSettingsListener>();

export function navigateToAppScreen(screen: AppScreen, options?: { noteId?: number | null }): void {
  const request: AppNavigationRequest = { screen, noteId: options?.noteId ?? null };
  navigateListeners.forEach((listener) => listener(request));
}

export function subscribeToAppNavigation(listener: NavigateListener): () => void {
  navigateListeners.add(listener);
  return () => navigateListeners.delete(listener);
}

export function openAppSettings(tab: SettingsTab): void {
  openSettingsListeners.forEach((listener) => listener(tab));
}

export function subscribeToOpenAppSettings(listener: OpenSettingsListener): () => void {
  openSettingsListeners.add(listener);
  return () => openSettingsListeners.delete(listener);
}

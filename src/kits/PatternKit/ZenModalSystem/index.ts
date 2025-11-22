/**
 * ZenModal System - Configuration-driven modal architecture for React
 *
 * @module @zenpost/modal-system
 * @author Denis Bitter <contact@denisbitter.de>
 * @license MIT
 */

// Core Components
export { ZenModal } from './components/ZenModal';
export { ZenModalHeader } from './components/ZenModalHeader';
export { ZenModalFooter } from './components/ZenModalFooter';
export { ZenFooterText } from './components/ZenFooterText';
export { ZenDropdown } from './components/ZenDropdown';
export { ZenRoughButton } from './components/ZenRoughButton';
export { ZenInfoBox } from './components/ZenInfoBox';
export { ZenSlider } from './components/ZenSlider';

// Configuration
export {
  getModalPreset,
  createCustomPreset,
  getProviderInfo,
  getSliderConfig,
  MODAL_PRESETS,
  AI_PROVIDER_INFO,
  SLIDER_CONFIGS,
} from './config/ZenModalConfig';

// Types
export type {
  ModalHeaderConfig,
  ModalPreset,
  InfoBoxConfig,
  InfoBoxLink,
  SliderConfig,
} from './config/ZenModalConfig';

// Pre-built Modals (Examples)
export { ZenAISettingsModal } from './modals/ZenAISettingsModal';
export { ZenAboutModal } from './modals/ZenAboutModal';

/**
 * Version information
 */
export const VERSION = '1.0.0';

/**
 * Package metadata
 */
export const PACKAGE_INFO = {
  name: '@zenpost/modal-system',
  version: VERSION,
  author: 'Denis Bitter',
  license: 'MIT',
  repository: 'https://github.com/THEORIGINALBITTER/zenpost-studio',
} as const;

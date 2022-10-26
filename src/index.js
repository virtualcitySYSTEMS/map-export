import { ButtonLocation, createToggleAction, WindowSlot } from '@vcmap/ui';
import { version, name } from '../package.json';
import ExportWindow, { windowId } from './exportWindow.vue';

/**
 * @param {T} config - the configuration of this plugin instance, passed in from the app.
 * @param {string} baseUrl - the absolute URL from which the plugin was loaded (without filename, ending on /)
 * @returns {import("@vcmap/ui/src/vcsUiApp").VcsPlugin<T>}
 * @template {Object} T
 * @template {Object} S
 */
export default function(config, baseUrl) {
  return {
    get name() { return name; },
    get version() { return version; },
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     * @param {S=} state
     * @returns {Promise<void>}
     */
    initialize: async (vcsUiApp, state) => {
      console.log('Called before loading the rest of the current context. Passed in the containing Vcs UI App ');
    },
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     * @returns {Promise<void>}
     */
    onVcsAppMounted: async (vcsUiApp) => {
      console.log('Called when the root UI component is mounted and managers are ready to accept components');
      const { action } = createToggleAction(
        {
          name: 'export.name',
          icon: '$vcsImport',
          title: 'export.tooltip',
        },
        {
          id: windowId,
          component: ExportWindow,
          slot: WindowSlot.DYNAMIC_LEFT,
          state: {
            headerTitle: 'export.headerTitle',
          },
        },
        vcsUiApp.windowManager,
        name,
      );
      vcsUiApp.navbarManager.add(
        { id: windowId, action },
        name,
        ButtonLocation.TOOL,
      );
    },
    // /**
    //  * @returns {Promise<S>}
    //  */
    // getState: async () => {
    //   console.log('Called when serializing this plugin instance');
    //   return {};
    // },
    /**
     * @returns {Promise<T>}
     */
    toJSON: async () => {
      console.log('Called when serializing this plugin instance');
      return {};
    },
    i18n: {
      en: {
        export: {
          name: 'Export',
          headerTitle: 'Object Export Wizard',
          tooltip: 'Close',
        },
      },
      de: {
        export: {
          name: 'Export',
          headerTitle: '@vcmap/plugin-cli - Hallo Welt',
          tooltip: 'Schließen',
        },
      },
    },
    destroy() {
      console.log('hook to cleanup');
    },
  };
};

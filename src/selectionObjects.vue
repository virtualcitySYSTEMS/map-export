<template>
  <v-container class="px-1 py-0">
    <v-row no-gutters>
      <v-col>
        {{ $t('export.selectionTypes.objectSelection1') }}
        <v-icon>$vcsPointSelect</v-icon>
        {{ $t('export.selectionTypes.objectSelection2') }}.
      </v-col>
    </v-row>
    <v-row no-gutters class="mt-1 mb-0">
      <v-col> {{ $t('export.selectionTypes.selectableLayers') }}: </v-col>
      <v-col class="d-flex justify-end">
        <ul>
          <li v-for="layer in selectableLayerNames" :key="layer">
            {{ layer }}
          </li>
        </ul>
      </v-col>
    </v-row>
    <VcsTooltip
      tooltip-position="right"
      :tooltip="isError ? 'export.validation.objectSelection' : ''"
      color="error"
    >
      <template #activator="{ on, attrs }">
        <v-row no-gutters v-bind="attrs" v-on="on">
          <v-input
            :value="count"
            :rules="[(v) => !!v]"
            hide-details
            @update:error="
              (errorState) => {
                isError = errorState;
              }
            "
          >
            <v-col cols="8" class="px-0 py-1">
              {{ $t('export.selectionTypes.objectCount') }}:
            </v-col>
            <v-col cols="4" class="px-0 py-1 d-flex justify-end">
              <span>{{ count }}</span>
            </v-col>
          </v-input>
        </v-row>
      </template>
    </VcsTooltip>
    <v-row no-gutters v-if="buttonShow">
      <v-col class="d-flex flex-row-reverse">
        <VcsFormButton @click="$emit('continue')" :disabled="buttonDisabled">
          {{ $t('export.continue') }}
        </VcsFormButton>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  import { CesiumTilesetLayer } from '@vcmap/core';
  import { VcsFormButton, VcsTooltip } from '@vcmap/ui';
  import {
    computed,
    inject,
    onBeforeUnmount,
    ref,
    shallowRef,
    watch,
  } from 'vue';
  import { VContainer, VRow, VCol, VIcon, VInput } from 'vuetify/lib';
  import { name } from '../package.json';
  import { windowId } from './index.js';
  import ObjectSelectionInteraction from './selectionObjectsInteraction.js';

  /**
   * @param {import("@vcmap/ui").VcsUiApp} app
   * @param {string} fmeServerUrl
   * @returns {Array<import("@vcmap/core").CesiumTilesetLayer>}
   */
  function getSelectableLayers(app, fmeServerUrl) {
    return [...app.layers].filter(
      (layer) =>
        layer instanceof CesiumTilesetLayer &&
        layer.properties.exportWorkbench === fmeServerUrl,
    );
  }

  /**
   * @description Component for selecting city model objects.
   * @vue-prop {string[]} value - Ids of the selected city model objects.
   * @vue-prop {boolean} buttonDisabled - If the continue button is disabled or not.
   * @vue-prop {boolean} [buttonShow=true] - If the continue button is shown or not.
   */
  export default {
    name: 'SelectionObjects',
    components: {
      VContainer,
      VRow,
      VCol,
      VIcon,
      VInput,
      VcsFormButton,
      VcsTooltip,
    },
    props: {
      value: {
        type: Array,
        required: true,
      },
      buttonDisabled: {
        type: Boolean,
        required: true,
      },
      buttonShow: {
        type: Boolean,
        required: false,
        default: true,
      },
    },
    setup(props, { emit }) {
      const app = inject('vcsApp');
      const plugin = app.plugins.getByKey(name);
      const selectableLayers = shallowRef(
        getSelectableLayers(app, plugin.config.settingsCityModel.fmeServerUrl),
      );
      const selectedObjects = ref(props.value);
      /** Number of selected Objects. */
      const count = ref(selectedObjects.value.length);

      const { eventHandler } = app.maps;

      const interaction = new ObjectSelectionInteraction(
        app,
        selectableLayers.value,
      );

      const selectableLayerNames = computed(() => {
        return selectableLayers.value.map((l) => l.properties?.title ?? l.name);
      });

      let destroy = () => {};

      let stopWatching = () => {};

      destroy = () => {
        stopWatching();
        selectedObjects.value = [];
        count.value = 0;
        interaction.clearSelection();
        interaction.destroy();
      };

      const listeners = [
        interaction.featureClicked.addEventListener((selectedFeatures) => {
          selectedObjects.value = selectedFeatures;
          count.value = selectedFeatures.length;
        }),
        eventHandler.addExclusiveInteraction(interaction, () => {
          destroy?.();
        }),
        eventHandler.exclusiveRemoved.addEventListener(() => {
          destroy?.();
          app.windowManager.remove(windowId);
        }),
        app.layers.added.addEventListener((layer) => {
          if (layer.properties.exportWorkbench === plugin.config.fmeServerUrl) {
            selectableLayers.value = getSelectableLayers(
              app,
              plugin.config.settingsCityModel.fmeServerUrl,
            );
          }
        }),
        app.layers.removed.addEventListener((layer) => {
          if (layer.properties.exportWorkbench === plugin.config.fmeServerUrl) {
            selectableLayers.value = getSelectableLayers(
              app,
              plugin.config.settingsCityModel.fmeServerUrl,
            );
          }
        }),
      ];

      // in case the selected features are changed from outside this component (e.g. by selecting object with context menu).
      stopWatching = watch(
        () => props.value,
        () => {
          interaction.selectedFeatures = props.value;
          count.value = props.value.length;
        },
        { immediate: true },
      );

      onBeforeUnmount(() => {
        listeners.forEach((cb) => cb());
        destroy();
      });

      watch(selectedObjects, () => emit('input', selectedObjects));

      return {
        selectableLayerNames,
        count,
        isError: ref(false),
      };
    },
  };
</script>

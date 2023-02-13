<template>
  <VcsTooltip
    tooltip-position="right"
    :tooltip="isError ? 'export.validation.areaSelection' : ''"
    color="error"
  >
    <template #activator="{ on, attrs }">
      <v-sheet v-bind="attrs" v-on="on">
        <v-input
          :value="featureDrawn"
          :rules="[v => !!v]"
          hide-details
          @update:error="(errorState) => { isError = errorState }"
        >
          <VcsButton
            v-for="(value, name) in allowedGeometries"
            :key="name"
            :icon="value"
            :active="geometryState[name]"
            :tooltip="$t('export.selectionTypes.draw'+name)"
            @click="waitForGeometry(name)"
          />
        </v-input>
      </v-sheet>
    </template>
  </VcsTooltip>
</template>

<style scoped>
</style>

<script>
  import { VSheet, VInput } from 'vuetify/lib';
  import { VcsButton, VcsTooltip } from '@vcmap/ui';
  import {
    VectorLayer,
    startCreateFeatureSession,
    GeometryType,
    mercatorProjection,
    VectorStyleItem,
  } from '@vcmap/core';
  import {
    inject,
    onMounted,
    onUnmounted,
    reactive,
    ref,
    watch,
  } from 'vue';
  import { Color } from '@vcmap-cesium/engine';

  export const areaSelectionLayerName = Symbol('areaSelection');

  // TODO: Replace this by import from @vcmap/ui as soon as available
  const defaultPrimaryColor = '#409D76';

  /**
   * Allowed geometry types for area selection. Key is the a value of {@link GeometryType}, value the corresponding VCS icon.
   * @type {Object<string, string>}
   */
  const allowedGeometries = {
    Polygon: '$vcsTriangle',
    BBox: '$vcsBoundingBox',
  };

  /** The state for each geometry type if create feature session is active. Key is the a value of {@link GeometryType}. */
  const geometryState = reactive({
    Polygon: false,
    BBox: false,
  });

  export function createSelectionLayerStyle(color) {
    return new VectorStyleItem({
      fill: {
        color: Color.fromCssColorString(color).withAlpha(0.3).toCssColorString(),
      },
      stroke: {
        color,
        width: 2,
      },
    });
  }

  /**
   * @description Component for drawing a selection area.
   * @vue-event {Promise<import("ol").Feature | null} sessionstart - Emits Promise that resolves with drawn feature.
   */
  export default {
    name: 'SelectionArea',
    components: { VcsButton, VSheet, VInput, VcsTooltip },
    emits: ['sessionstart'],
    setup(props, { emit }) {
      const app = inject('vcsApp');
      /** State if there exists currently an area selection feature. */
      const featureDrawn = ref(false);

      /**
       * @returns {import("@vcmap/core").VectorLayer}
       */
      function getAreaSelectionLayer() {
        if (!app.layers.hasKey(String(areaSelectionLayerName))) {
          const primary = app.uiConfig.config.value.primaryColor ?? defaultPrimaryColor;
          const style = createSelectionLayerStyle(primary);
          app.layers.add(new VectorLayer({
            name: String(areaSelectionLayerName),
            projection: mercatorProjection.toJSON(),
            style,
          }));
        }
        const layer = app.layers.getByKey(String(areaSelectionLayerName));
        layer.activate();
        return layer;
      }

      const listeners = [
        app.uiConfig.added.addEventListener((item) => {
          if (item?.name === 'primaryColor') {
            getAreaSelectionLayer().setStyle(createSelectionLayerStyle(item.value));
          }
        }),
        app.uiConfig.removed.addEventListener((item) => {
          if (item?.name === 'primaryColor') {
            getAreaSelectionLayer().setStyle(createSelectionLayerStyle(defaultPrimaryColor));
          }
        }),
      ];

      /**
       * Handles the geometry creation with the @vcmap/core editor.
       * @param {string} geometryType Value of {@link GeometryType}
       */
      function waitForGeometry(geometryType) {
        const layer = getAreaSelectionLayer();
        if (layer) {
          layer.removeAllFeatures();
          featureDrawn.value = false;
        }
        const session = startCreateFeatureSession(app, layer, GeometryType[geometryType]);

        emit('sessionstart', new Promise((resolve) => {
          let feature = null;
          session.stopped.addEventListener(() => {
            geometryState[geometryType] = false;
            resolve(feature); // may be null if finished before feature was valid
          });

          session.creationFinished.addEventListener((f) => {
            if (f) {
              feature = f;
              session.stop();
              featureDrawn.value = true;
            }
          });
        }));
        geometryState[geometryType] = true;
      }

      watch(featureDrawn, () => emit('featurechange', featureDrawn));

      onMounted(() => {
        const layer = getAreaSelectionLayer(); // makes sure that layer exists and is active
        featureDrawn.value = layer.getFeatures().length !== 0;
      });
      onUnmounted(() => {
        getAreaSelectionLayer().deactivate();
        listeners.forEach(listener => listener());
      });

      return {
        waitForGeometry,
        allowedGeometries,
        geometryState,
        featureDrawn,
        isError: ref(false),
      };
    },
  };
</script>

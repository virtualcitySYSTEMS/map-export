<template>
  <v-sheet class="px-1">
    <v-input
      class="feature-input"
      :model-value="featureDrawn"
      :rules="[(v) => !!v || 'export.validation.areaSelection']"
    >
      <VcsToolButton
        v-for="(value, name) in allowedGeometries"
        :key="name"
        :icon="value"
        :active="geometryState[name]"
        :tooltip="$st('export.selectionTypes.draw' + name)"
        @click="waitForGeometry(name)"
      />
      <template #message="{ message }">
        <v-tooltip
          activator=".feature-input"
          :v-if="message"
          :text="$st(message)"
          content-class="bg-error"
          location="right"
        />
      </template>
    </v-input>
  </v-sheet>
</template>

<script>
  import { VSheet, VInput, VTooltip } from 'vuetify/components';
  import { VcsToolButton, getDefaultPrimaryColor } from '@vcmap/ui';
  import {
    VectorLayer,
    startCreateFeatureSession,
    GeometryType,
    mercatorProjection,
    VectorStyleItem,
    markVolatile,
  } from '@vcmap/core';
  import { inject, onMounted, reactive, ref } from 'vue';
  import { Color } from '@vcmap-cesium/engine';
  import { windowId } from './index.js';

  export const areaSelectionLayerName = Symbol('areaSelection');

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
        color: Color.fromCssColorString(color)
          .withAlpha(0.3)
          .toCssColorString(),
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
    components: { VcsToolButton, VSheet, VInput, VTooltip },
    emits: ['sessionstart'],
    setup(props, { emit }) {
      const app = inject('vcsApp');
      const defaultPrimaryColor = getDefaultPrimaryColor(app);
      /** State if there exists currently an area selection feature. */
      const featureDrawn = ref(false);

      /**
       * @returns {import("@vcmap/core").VectorLayer}
       */
      function getAreaSelectionLayer() {
        if (!app.layers.hasKey(String(areaSelectionLayerName))) {
          const primary =
            app.uiConfig.config.primaryColor ?? defaultPrimaryColor;
          const style = createSelectionLayerStyle(primary);
          const layer = new VectorLayer({
            name: String(areaSelectionLayerName),
            projection: mercatorProjection.toJSON(),
            style,
          });
          markVolatile(layer);
          app.layers.add(layer);
        }
        const layer = app.layers.getByKey(String(areaSelectionLayerName));
        layer.activate();
        return layer;
      }

      const listeners = [
        app.uiConfig.added.addEventListener((item) => {
          if (item?.name === 'primaryColor') {
            getAreaSelectionLayer().setStyle(
              createSelectionLayerStyle(item.value),
            );
          }
        }),
        app.uiConfig.removed.addEventListener((item) => {
          if (item?.name === 'primaryColor') {
            getAreaSelectionLayer().setStyle(
              createSelectionLayerStyle(defaultPrimaryColor),
            );
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
        const session = startCreateFeatureSession(
          app,
          layer,
          GeometryType[geometryType],
        );

        emit(
          'sessionstart',
          new Promise((resolve) => {
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
          }),
        );
        geometryState[geometryType] = true;
      }

      onMounted(() => {
        const layer = getAreaSelectionLayer(); // makes sure that layer exists and is active
        featureDrawn.value = layer.getFeatures().length !== 0;
      });

      app.windowManager.removed.addEventListener(({ id }) => {
        if (id === windowId) {
          getAreaSelectionLayer().deactivate();
          listeners.forEach((listener) => listener());
        }
      });
      return {
        waitForGeometry,
        allowedGeometries,
        geometryState,
        featureDrawn,
      };
    },
  };
</script>

<style scoped></style>

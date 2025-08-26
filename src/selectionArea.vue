<template>
  <v-sheet class="px-1">
    <v-input
      class="feature-input"
      :model-value="featureDrawn"
      :rules="[(v) => !!v || 'export.validation.areaSelection']"
    >
      <VcsToolButton
        v-for="(value, name) in AllowedGeometries"
        :key="name"
        :icon="value"
        :active="geometryState[name]"
        :tooltip="$st('export.selectionTypes.draw' + name)"
        @click="waitForGeometry(GeometryType[name])"
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

<script lang="ts">
  import { VSheet, VInput, VTooltip } from 'vuetify/components';
  import type { VcsUiApp } from '@vcmap/ui';
  import { VcsToolButton, getDefaultPrimaryColor } from '@vcmap/ui';
  import {
    VectorLayer,
    startCreateFeatureSession,
    GeometryType,
    mercatorProjection,
    VectorStyleItem,
    markVolatile,
  } from '@vcmap/core';
  import { defineComponent, inject, onMounted, reactive, ref } from 'vue';
  import { Color } from '@vcmap-cesium/engine';
  import type Feature from 'ol/Feature.js';
  import { windowId } from './index.js';

  export const areaSelectionLayerName = Symbol('areaSelection');

  /** Allowed geometry types for area selection. Key is the a value of {@link GeometryType}, value the corresponding VCS icon. */
  enum AllowedGeometries {
    Polygon = '$vcsTriangle',
    BBox = '$vcsBoundingBox',
  }

  /** The state for each geometry type if create feature session is active. Key is the a value of {@link GeometryType}. */
  const geometryState = reactive<{
    [GeometryType.BBox]: boolean;
    [GeometryType.Polygon]: boolean;
  }>({
    [GeometryType.Polygon]: false,
    [GeometryType.BBox]: false,
  });

  export function createSelectionLayerStyle(color: string): VectorStyleItem {
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
  export default defineComponent({
    name: 'SelectionArea',
    components: { VcsToolButton, VSheet, VInput, VTooltip },
    emits: ['sessionstart'],
    setup(_, { emit }) {
      const app = inject('vcsApp') as VcsUiApp;
      const defaultPrimaryColor = getDefaultPrimaryColor(app);
      /** State if there exists currently an area selection feature. */
      const featureDrawn = ref(false);

      function getAreaSelectionLayer(): VectorLayer {
        let layer = app.layers.getByKey(
          String(areaSelectionLayerName),
        ) as VectorLayer;
        if (!layer) {
          const primary =
            app.uiConfig.config.primaryColor ?? defaultPrimaryColor;
          const style = createSelectionLayerStyle(primary);
          layer = new VectorLayer({
            name: String(areaSelectionLayerName),
            projection: mercatorProjection.toJSON(),
            style,
          });
          markVolatile(layer);
          app.layers.add(layer);
        }
        layer.activate().catch(() => {});
        return layer;
      }

      const listeners = [
        app.uiConfig.added.addEventListener((item) => {
          if (item?.name === 'primaryColor') {
            getAreaSelectionLayer().setStyle(
              createSelectionLayerStyle(item.value as string),
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
       * @param geometryType Value of {@link GeometryType}
       */
      function waitForGeometry(
        geometryType: GeometryType.BBox | GeometryType.Polygon,
      ): void {
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
            let feature: Feature | null = null;
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
          listeners.forEach((listener) => {
            listener();
          });
        }
      });
      return {
        GeometryType,
        waitForGeometry,
        AllowedGeometries,
        geometryState,
        featureDrawn,
      };
    },
  });
</script>

<style scoped></style>

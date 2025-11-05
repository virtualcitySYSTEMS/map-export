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
        :active="selectionState[name]"
        :tooltip="$st('export.selectionTypes.draw' + name)"
        @click="waitForGeometry(GeometryType[name])"
      />
      <VcsToolButton
        icon="$vcsImport"
        :active="selectionState.import"
        :tooltip="$st('export.selectionTypes.fileImport')"
        @click="setupFileImport"
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
    <v-row v-show="selectionState.import" no-gutters>
      <VcsFileInput
        ref="fileInput"
        accept=".json, .geojson"
        clearable
        @update:model-value="uploadFile"
      />
    </v-row>
  </v-sheet>
</template>

<script lang="ts">
  import { VSheet, VInput, VTooltip, VRow } from 'vuetify/components';
  import type { VcsUiApp } from '@vcmap/ui';
  import {
    NotificationType,
    VcsFileInput,
    VcsToolButton,
    getDefaultPrimaryColor,
  } from '@vcmap/ui';
  import type { CreateFeatureSession } from '@vcmap/core';
  import {
    startCreateFeatureSession,
    GeometryType,
    mercatorProjection,
    VectorStyleItem,
    parseGeoJSON,
    Viewpoint,
    Extent,
  } from '@vcmap/core';
  import {
    defineComponent,
    inject,
    onMounted,
    onUnmounted,
    reactive,
    ref,
  } from 'vue';
  import { Color } from '@vcmap-cesium/engine';
  import type Feature from 'ol/Feature.js';
  import { name } from '../package.json';
  import type { ExportPlugin } from './index.js';

  /** Allowed geometry types for area selection. Key is the a value of {@link GeometryType}, value the corresponding VCS icon. */
  enum AllowedGeometries {
    Polygon = '$vcsTriangle',
    BBox = '$vcsBoundingBox',
  }

  /** The state for each geometry type if create feature session is active. Key is the a value of {@link GeometryType} or 'import'. */
  const selectionState = reactive({
    [GeometryType.Polygon]: false,
    [GeometryType.BBox]: false,
    import: false,
  });

  export function createSelectionLayerStyle(color: string): VectorStyleItem {
    return new VectorStyleItem({
      fill: {
        color: Color.fromCssColorString(color)
          .withAlpha(0.3)
          .toCssColorString(),
      },
      stroke: { color, width: 2 },
    });
  }

  /**
   * @description Component for drawing a selection area.
   * @vue-event {import("ol").Feature} feature - Emits the drawn feature.
   */
  export default defineComponent({
    name: 'SelectionArea',
    components: { VcsFileInput, VcsToolButton, VInput, VRow, VSheet, VTooltip },
    emits: ['featureDrawn'],
    setup(_, { emit }) {
      const app = inject('vcsApp') as VcsUiApp;
      const { areaSelectionLayer } = app.plugins.getByKey(name) as ExportPlugin;
      /** State if there exists currently an area selection feature. */
      const featureDrawn = ref(false);
      const fileInput = ref();
      let session: CreateFeatureSession<
        GeometryType.Polygon | GeometryType.BBox
      > | null = null;

      const listeners = [
        app.uiConfig.added.addEventListener((item) => {
          if (item?.name === 'primaryColor') {
            const style = createSelectionLayerStyle(item.value as string);
            areaSelectionLayer.setStyle(style);
          }
        }),
        app.uiConfig.removed.addEventListener((item) => {
          if (item?.name === 'primaryColor') {
            const defaultPrimary = getDefaultPrimaryColor(app);
            const style = createSelectionLayerStyle(defaultPrimary);
            areaSelectionLayer.setStyle(style);
          }
        }),
      ];

      type SelectionKey = keyof typeof selectionState;
      function resetSelectionState(
        resetSession = false,
        newSelection?: SelectionKey,
      ): void {
        if (newSelection) {
          featureDrawn.value = false;
        }
        const keys = Object.keys(selectionState) as SelectionKey[];
        keys.forEach((key) => {
          selectionState[key] = newSelection === key;
        });
        if (resetSession) {
          session?.stop();
        }
      }

      /**
       * Handles the geometry creation with the @vcmap/core editor.
       * @param geometryType Value of {@link GeometryType}
       */
      function waitForGeometry(
        geometryType: GeometryType.BBox | GeometryType.Polygon,
      ): void {
        resetSelectionState(false, geometryType);
        areaSelectionLayer.removeAllFeatures();
        featureDrawn.value = false;
        session = startCreateFeatureSession(
          app,
          areaSelectionLayer,
          GeometryType[geometryType],
        );

        let feature: Feature | null = null;
        listeners.push(
          session.stopped.addEventListener(() => {
            featureDrawn.value = !!feature;
            const activeType = Object.entries(selectionState).find(
              ([, v]) => v,
            )?.[0];
            if (feature && session?.geometryType === activeType) {
              emit('featureDrawn', feature);
            }
            session = null;
          }),
          session.creationFinished.addEventListener((f) => {
            feature = f;
            session!.stop();
          }),
        );
      }

      async function uploadFile(file: File): Promise<void> {
        if (!file) {
          return;
        }
        try {
          areaSelectionLayer.removeAllFeatures();
          featureDrawn.value = false;
          const raw = await file.text();
          const data = parseGeoJSON(raw);
          if (!data || !data.features) {
            throw new Error('export.validation.importFileInvalid');
          }
          if (data.features.length === 0) {
            throw new Error('export.validation.importFileNoFeatures');
          }
          const polygons = data.features.filter(
            (f) => f.getGeometry()?.getType() === GeometryType.Polygon,
          );
          if (polygons.length === 0) {
            throw new Error('export.validation.importFileNoValidGeometries');
          } else {
            if (polygons.length > 1) {
              app.notifier.add({
                type: NotificationType.WARNING,
                message: app.vueI18n.t(
                  'export.validation.importFileMultipleFeatures',
                ),
              });
            }
            const feature = polygons[0];
            feature.setStyle();
            areaSelectionLayer.addFeatures([feature]);
            const extent = feature.getGeometry()?.getExtent();
            if (extent) {
              const mercatorExtent = new Extent({
                coordinates: extent,
                projection: mercatorProjection,
              });
              const vp = Viewpoint.createViewpointFromExtent(mercatorExtent);
              if (vp) {
                await app.maps.activeMap?.gotoViewpoint(vp);
              }
            }
            featureDrawn.value = true;
            resetSelectionState(true);
            emit('featureDrawn', feature);
          }
        } catch (e: unknown) {
          app.notifier.add({
            type: NotificationType.ERROR,
            message: app.vueI18n.t((e as Error).message),
          });
        }
      }

      onMounted(() => {
        featureDrawn.value = areaSelectionLayer.getFeatures().length !== 0;
      });
      onUnmounted(() => {
        resetSelectionState(true);
        listeners.forEach((listener) => {
          listener();
        });
      });

      return {
        GeometryType,
        waitForGeometry,
        AllowedGeometries,
        selectionState,
        featureDrawn,
        fileInput,
        uploadFile,
        setupFileImport: (): void => {
          resetSelectionState(true, 'import');
          fileInput.value?.$el.childNodes[1].childNodes[1].click(); // trigger VcsFileInput window opening
          areaSelectionLayer.removeAllFeatures();
          featureDrawn.value = false;
        },
      };
    },
  });
</script>

<style scoped></style>

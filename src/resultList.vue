<template>
  <v-sheet class="px-1">
    <!-- TODO: turn this into paginated list -->
    <div class="list-height">
      <VcsList
        v-if="resultItems"
        v-model="selectedResults"
        :items="resultItems"
        selectable
        :title="listTitle"
        :action-button-list-overflow-count="1"
      />
      <v-icon v-else> $vcsProgress </v-icon>
    </div>
  </v-sheet>
</template>

<script lang="ts">
  import type { PropType, Ref } from 'vue';
  import {
    computed,
    defineComponent,
    inject,
    onMounted,
    onUnmounted,
    ref,
    watch,
  } from 'vue';
  import type { VcsUiApp, VcsListItem } from '@vcmap/ui';
  import { VcsList, NotificationType, useProxiedAtomicModel } from '@vcmap/ui';
  import { VSheet, VIcon } from 'vuetify/components';
  import type Feature from 'ol/Feature.js';
  import { validatePolygonFeature } from './exportHelper.js';
  import { name } from '../package.json';
  import type { OneOfDataSourceOptions } from './dataSources/abstractDataSource.js';
  import type AbstractDataSource from './dataSources/abstractDataSource.js';
  import type { ExportPlugin } from './index.js';
  import type GeoJSONDataSource from './dataSources/geojsonDataSource.js';
  import { DataSourceOptions } from './configManager.js';

  export async function createListItems(
    feature: Feature,
    dataSource: AbstractDataSource,
    resultItems: Ref<VcsListItem[]>,
  ): Promise<void> {
    await dataSource.query(feature);
    const { results } = dataSource;
    resultItems.value = results
      .sort((a, b) => (a.title < b.title ? -1 : 1))
      .map((result) => {
        return {
          name: result.title as string,
          title: result.title as string,
          tooltip: 'export.selectToDownload',
          selectionChanged: (selected): void => {
            if (selected) {
              dataSource.resultLayer.featureVisibility.showObjects([
                result.featureId,
              ]);
            } else {
              dataSource.resultLayer.featureVisibility.hideObjects([
                result.featureId,
              ]);
            }
          },
        };
      });
    await dataSource.resultLayer.activate();
    return Promise.resolve();
  }

  /**
   * @description Renders the results, e.g. the available oblique images for a specific area, in a VcsList. On selection the extend of the result is shown in the map.
   * @vue-prop {import("./dataSources/abstractDataSource.js").default} dataSource - The dataSource instance of the currently selected data source.
   * @vue-prop {{name: string, title: string, tooltip: string, selectionChanged: Function}[]} value - The results of the dataSource query as VcsListItems
   * @vue-prop {boolean} active - If the resultList component is active or not.
   * @vue-prop {number} maxSelectionArea - The maximum area for area selection. If selection area is bigger, a notification is shown that the area is too big.
   */
  export default defineComponent({
    name: 'ResultList',
    components: { VSheet, VIcon, VcsList },
    props: {
      modelValue: {
        type: Array as PropType<
          {
            name: string;
            title: string;
            tooltip: string;
            selectionChanged: () => void;
          }[]
        >,
        required: true,
      },
      active: {
        type: Boolean,
        required: true,
      },
      maxSelectionArea: {
        type: Number,
        required: true,
      },
      selectedDataSourceOptions: {
        type: Object as PropType<OneOfDataSourceOptions>,
        required: true,
      },
    },
    emits: ['invalidArea', 'update:modelValue'],
    setup(props, { emit }) {
      const app = inject('vcsApp') as VcsUiApp;
      const plugin = app.plugins.getByKey(name) as ExportPlugin;
      const { areaSelectionLayer, dataSource } = plugin;

      const resultItems = ref();
      const selectedResults = useProxiedAtomicModel(props, 'modelValue', emit);

      const listTitle = computed(() =>
        props.selectedDataSourceOptions.type === DataSourceOptions.GEOJSON
          ? (dataSource as GeoJSONDataSource).title
          : 'export.dataSources.oblique',
      );

      function loadAreas(): void {
        dataSource?.clear();
        const feature = areaSelectionLayer?.getFeatures()[0];
        if (feature && feature.getGeometry()) {
          // TODO: Why are there multiple validations throughout the code? wouldn't be one validation when drawing enough?
          validatePolygonFeature(feature, app, props.maxSelectionArea)
            .then(() =>
              createListItems(
                feature,
                dataSource as AbstractDataSource,
                resultItems,
              ),
            )
            .catch((e: unknown) => {
              emit('invalidArea');
              app.notifier.add({
                type: NotificationType.ERROR,
                message: (e as Error).message,
                timeout: 5000,
              });
            });
        } else {
          throw new Error('Area selection feature does not exist.');
        }
      }

      // loads list each time user views result list.
      watch(
        () => props.active,
        () => {
          if (props.active) {
            loadAreas();
          }
        },
      );
      onMounted(() => {
        if (props.active) {
          loadAreas();
        }
      });
      onUnmounted(() => dataSource?.clear());

      return {
        resultItems,
        selectedResults,
        listTitle,
      };
    },
  });
</script>

<style scoped>
  .list-height {
    max-height: 290px;
    overflow-y: auto;
  }
</style>

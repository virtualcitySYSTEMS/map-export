<template>
  <v-sheet class="px-1">
    <!-- TODO: turn this into paginated list -->
    <div class="list-height">
      <VcsList
        v-if="resultItems"
        :items="resultItems"
        v-model="selectedResults"
        @input="$emit('input', selectedResults)"
        selectable
        :title="listTitle"
        :action-button-list-overflow-count="1"
      />
      <v-icon v-else> $vcsProgress </v-icon>
    </div>
  </v-sheet>
</template>

<script>
  import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue';
  import { VcsList, NotificationType } from '@vcmap/ui';
  import { VSheet, VIcon } from 'vuetify/lib';
  import { validatePolygonFeature } from './exportHelper.js';
  import { name } from '../package.json';

  export async function createListItems(feature, dataSource, resultItems) {
    await dataSource.query(feature);
    const { results } = dataSource;
    resultItems.value = results
      .sort((a, b) => (a.title < b.title ? -1 : 1))
      .map((result) => {
        return {
          name: result.title,
          title: result.title,
          tooltip: 'export.selectToDownload',
          selectionChanged: (selected) => {
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
    dataSource.resultLayer.activate();
    return Promise.resolve();
  }

  /**
   * @description Renders the results, e.g. the available oblique images for a specific area, in a VcsList. On selection the extend of the result is shown in the map.
   * @vue-prop {import("./dataSources/abstractDataSource.js").default} dataSource - The dataSource instance of the currently selected data source.
   * @vue-prop {symbol} selectionLayerName - Name of the area selection layer
   * @vue-prop {{name: string, title: string, tooltip: string, selectionChanged: Function}[]} value - The results of the dataSource query as VcsListItems
   * @vue-prop {boolean} active - If the resultList component is active or not.
   * @vue-prop {number} maxSelectionArea - The maximum area for area selection. If selection area is bigger, a notification is shown that the area is too big.
   */
  export default {
    name: 'ResultList',
    components: {
      VSheet,
      VIcon,
      VcsList,
    },
    props: {
      selectionLayerName: {
        type: Symbol,
        required: true,
      },
      value: {
        type: Array,
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
      selectedDataSource: {
        type: String,
        required: true,
      },
    },
    setup(props) {
      const app = inject('vcsApp');

      const plugin = app.plugins.getByKey(name);

      const resultItems = ref();
      const selectedResults = ref(props.value);

      const listTitle = computed(() =>
        props.selectedDataSource === 'geojson'
          ? plugin.dataSource.title
          : 'export.dataSources.oblique',
      );

      function loadAreas() {
        const selectionLayer = app.layers.getByKey(
          String(props.selectionLayerName),
        );
        plugin.dataSource.clear();
        const feature = selectionLayer?.getFeatures()[0];
        if (feature && feature.getGeometry()) {
          // TODO: Why are there multiple validations throughout the code? wouldn't be one validation when drawing enough?
          validatePolygonFeature(feature, app, props.maxSelectionArea)
            .then(() =>
              createListItems(feature, plugin.dataSource, resultItems),
            )
            .catch((error) => {
              app.notifier.add({
                type: NotificationType.ERROR,
                message: error.message,
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
      onUnmounted(() => plugin.dataSource?.clear());

      return {
        resultItems,
        selectedResults,
        listTitle,
      };
    },
  };
</script>

<style scoped>
  .list-height {
    max-height: 290px;
    overflow-y: auto;
  }
</style>

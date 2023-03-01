<template>
  <v-container class="px-1 py-0">
    <v-row no-gutters>
      <v-col>
        {{ $t('export.selectionTypes.objectSelection1') }}
        <v-icon>$vcsPointSelect</v-icon>
        {{ $t('export.selectionTypes.objectSelection2') }}.
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
            :rules="[v => !!v]"
            hide-details
            @update:error="(errorState) => { isError = errorState }"
          >
            <v-col cols="8" class="px-0 py-2">
              {{ $t('export.selectionTypes.objectCount') }}:
            </v-col>
            <v-col cols="4" class="px-0 py-2 d-flex justify-end">
              <span>{{ count }}</span>
            </v-col>
          </v-input>
        </v-row>
      </template>
    </VcsTooltip>
    <v-row no-gutters v-if="buttonShow">
      <v-col class="d-flex flex-row-reverse">
        <VcsButton
          @click="$emit('continue')"
          :disabled="buttonDisabled"
        >
          {{ $t('export.continue') }}
        </VcsButton>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  import { CesiumTilesetLayer } from '@vcmap/core';
  import { VcsButton, VcsTooltip } from '@vcmap/ui';
  import { inject, onBeforeUnmount, ref, watch } from 'vue';
  import { VContainer, VRow, VCol, VIcon, VInput } from 'vuetify/lib';
  import ObjectSelectionInteraction from './selectionObjectsInteraction.js';

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
      VcsButton,
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
      const selectedObjects = ref(props.value);
      /** Number of selected Objects. */
      const count = ref(selectedObjects.value.length);

      const app = inject('vcsApp');
      const { eventHandler } = app.maps;
      const selectableLayers = [...app.layers].filter(layer => layer instanceof CesiumTilesetLayer);

      const interaction = new ObjectSelectionInteraction(selectableLayers, selectedObjects.value);
      interaction.featureClicked.addEventListener((selectedFeatures) => {
        selectedObjects.value = selectedFeatures;
        count.value = selectedFeatures.length;
      });

      function resetSelection() {
        interaction.clearSelection();
        selectedObjects.value = [];
        count.value = 0;
      }

      const listener = eventHandler.addExclusiveInteraction(interaction, () => { resetSelection(); });

      onBeforeUnmount(() => {
        listener();
        interaction.clearHighlighting();
      });

      watch(selectedObjects, () => emit('input', selectedObjects));
      // in case the selected features are changed from outside this component (e.g. by selecting object with context menu).
      watch(() => props.value, () => {
        interaction.selectedFeatures = props.value;
        count.value = props.value.length;
      });

      return {
        count,
        resetSelection,
        isError: ref(false),
      };
    },
  };
</script>

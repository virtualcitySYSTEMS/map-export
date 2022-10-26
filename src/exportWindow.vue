<template>
  <v-stepper
    vertical
    v-model="step"
  >
    <v-stepper-step
      class="bck-clr-gray py-3"
      :step="stepOrder.dataSource"
      editable
      :complete="!!dataSourceSelected"
    >
      Choose data source to export
    </v-stepper-step>
    <v-stepper-content :step="stepOrder.dataSource">
      <VcsSelect
        :items="dataSourceOptions"
        label="Select"
        v-model="dataSourceSelected"
        @input="increaseStepper(stepOrder.dataSource); setSelectionOptions();"
      />
    </v-stepper-content>
    <v-stepper-step
      v-show="highestStep >= stepOrder.selectionMode"
      class="bck-clr-gray py-3"
      :step="stepOrder.selectionMode"
      editable
      :complete="!!selectionSelected"
    >
      Define export selection by
    </v-stepper-step>
    <v-stepper-content
      :step="stepOrder.selectionMode"
      v-show="highestStep >= stepOrder.selectionMode"
    >
      <VcsSelect
        :items="selectionOptions"
        label="Select"
        v-model="selectionSelected"
        @change="increaseStepper(stepOrder.selectionMode)"
      />
    </v-stepper-content>
    <v-stepper-step
      v-show="highestStep >= stepOrder.selection"
      class="bck-clr-gray py-3"
      :step="stepOrder.selection"
      editable
      :complete="highestStep >= stepOrder.selection"
    >
      Select Objects
    </v-stepper-step>
    <v-stepper-content
      v-show="highestStep >= stepOrder.selection"
      :step="stepOrder.selection"
    >
      <v-sheet
        v-if="selectionSelected === 'Selecting object'"
      >
        Use Ctrl + left mouse click to select objects.
        <p>Object Count: 0</p>
        <div class="d-flex flex-row-reverse">
          <VcsButton
            @click="increaseStepper(stepOrder.selection);"
          >
            Continue
          </VcsButton>
        </div>
      </v-sheet>
      <v-sheet v-else>
        Use drawing tool to define area or import polygon.
        <p>
          <VcsButton
            icon="$vcsTriangle"
            @click="increaseStepper(stepOrder.selection);"
          />
          <VcsButton
            icon="$vcsBoundingBox"
          />
          <VcsButton
            icon="$vcsCircle"
          />
          <v-divider vertical />
          <VcsButton
            icon="$vcsImport"
          />
        </p>
      </v-sheet>
    </v-stepper-content>
    <v-stepper-step
      v-show="highestStep >= stepOrder.settings"
      class="bck-clr-gray py-3"
      :step="stepOrder.settings"
      editable
      :complete="highestStep >= stepOrder.settings"
    >
      Settings
    </v-stepper-step>
    <v-stepper-content
      :step="stepOrder.settings"
      v-show="highestStep >= stepOrder.settings"
    >
      <v-sheet
        v-if="dataSourceSelected === '3D Models'"
      >
        <v-container class="py-0 px-2">
          <v-row
            v-for="(value, name) in pluginSetup.cityModel"
            :key="name"
            no-gutters
            align="center"
          >
            <v-col cols="7">
              <VcsLabel :html-for="name + 'Select'" :dense="true">
                {{ value.label }}
              </VcsLabel>
            </v-col>
            <v-col>
              <VcsSelect
                :id="name + 'Select'"
                :items="value.items"
                v-model="pluginState.cityModel[name]"
                :dense="true"
                multiple
              />
            </v-col>
          </v-row>
        </v-container>
      </v-sheet>
      <v-sheet v-else>
        settings for schraegluftbild
      </v-sheet>
      <div class="d-flex flex-row-reverse">
        <VcsButton
          @click="increaseStepper(stepOrder.settings);"
        >
          Continue
        </VcsButton>
      </div>
    </v-stepper-content>
    <v-stepper-step
      v-show="highestStep >= stepOrder.exportDestination"
      class="bck-clr-gray py-3"
      :step="stepOrder.exportDestination"
      editable
      :complete="highestStep >= stepOrder.exportDestination"
    >
      Define export destination
    </v-stepper-step>
    <v-stepper-content
      :step="stepOrder.exportDestination"
      v-show="highestStep >= stepOrder.exportDestination"
    >
      <VcsSelect
        :items="exportOptions"
        v-model="exportSelected"
      />
      <v-divider />
      <VcsTextField
        v-if="exportSelected === 'Send by E-Mail'"
        :dense="true"
        :label="undefined"
        placeholder="Enter your email address"
        v-model="email"
      />
    </v-stepper-content>
    <v-stepper-step
      :step="stepOrder.sendRequest"
      :complete="step > stepOrder.sendRequest"
      class="py-3"
    >
      <div class="d-flex flex-row-reverse">
        <VcsButton
          :disabled="!requestEnabled"
        >
          Send Request
        </VcsButton>
      </div>
    </v-stepper-step>
  </v-stepper>
</template>

<style>
.bck-clr-gray {
  background-color: #E8E8E8;
}

.v-stepper-step .step-padding {
  padding: 12px 12px 12px 24px;
}
</style>
<script>
  // @ts-check
  import { inject, ref, reactive, computed } from 'vue';
  import { VcsButton, VcsSelect, VcsLabel, VcsTextField, getPluginAssetUrl } from '@vcmap/ui';
  import { name } from '../package.json';

  export const windowId = 'export_window_id';

  export default {
    name: 'ExportWindow',
    components: {
      VcsButton,
      VcsSelect,
      VcsLabel,
      VcsTextField,
    },
    setup() {
      const app = inject('vcsApp');

      const step = ref(1);
      const highestStep = ref(1);

      const selectionOptions = ref([]);
      const selectionSelected = ref();
      const dataSourceSelected = ref();
      const exportOptions = ['Send by E-Mail'];
      const exportSelected = ref('Send by E-Mail');
      const email = ref();

      const stepOrder = {
        dataSource: 1,
        selectionMode: 2,
        selection: 3,
        settings: 4,
        exportDestination: 5,
        sendRequest: 6,
      };

      const pluginSetup = {
        cityModel: {
          format: {
            items: ['2D Shape', '3D Shape - Multipatch', '3D Shape - PolygonZ', '3DPDF', '3DS', 'COLLADA', 'CityGML', 'DWG', 'DXF', 'ESRI FGDB', 'FBX', 'FMEAR', 'GEOPACKAGE', 'GLTF', 'KMZ', 'OBJ', 'STEP', 'STL', 'SketchUp', 'VRML'],
            label: 'Export Format',
          },
          lodLevel: {
            items: ['LoD1', 'LoD2', 'LoD3'],
            label: 'LoD Level',
          },
          thematicClasses: {
            items: ['Building', 'Bridge', 'ReliefFeature', 'Railway'],
            label: 'Thematic classes',
          },
        },
      };

      const pluginState = reactive({
        cityModel: {
          format: ref(['2D Shape']),
          lodLevel: ref(['LoD1']),
          thematicClasses: ref(['ReliefFeature']),
        },
      });

      function increaseStepper(currentStep) {
        if (typeof step.value !== 'number') {
          step.value = Number(step.value);
        }
        step.value = currentStep + 1;
        if (currentStep >= highestStep.value) {
          highestStep.value = step.value;
        }
      }

      function setSelectionOptions() {
        if (dataSourceSelected.value === 'Schrägluftbilder') {
          selectionOptions.value = ['Area selection'];
        } else if (dataSourceSelected.value === '3D Models') {
          selectionOptions.value = ['Selecting object', 'Area selection'];
        } else {
          throw new Error(`${dataSourceSelected.value} as datasource not allowed`);
        }
      }

      const requestEnabled = computed(() => {
        return !!email.value;
      });

      return {
        stepOrder,
        step,
        highestStep,
        increaseStepper,
        selectionOptions,
        dataSourceOptions: ['3D Models', 'Schrägluftbilder'],
        selectionSelected,
        dataSourceSelected,
        setSelectionOptions,
        requestEnabled,
        pluginState,
        pluginSetup,
        exportOptions,
        exportSelected,
        email,
      };
    },
  };
</script>

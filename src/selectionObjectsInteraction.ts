import type { CesiumTilesetLayer, InteractionEvent } from '@vcmap/core';
import {
  AbstractInteraction,
  EventType,
  ModificationKeyType,
  VcsEvent,
  vcsLayerName,
} from '@vcmap/core';
import type { FeatureType, VcsUiApp } from '@vcmap/ui';
import {
  getDefaultPrimaryColor,
  getHighlightStyle,
  NotificationType,
} from '@vcmap/ui';

/** Class handling the selection of city model objects */
class SelectionObjectInteraction extends AbstractInteraction {
  private _app: VcsUiApp;

  /** All layers that are supported for export with object selection. */
  private _selectableLayers: CesiumTilesetLayer[];

  /** Array with the ids of selected features. */
  private _selectedFeatures: string[] = [];

  private _featureClicked = new VcsEvent<string[]>();
  constructor(app: VcsUiApp, layers: CesiumTilesetLayer[]) {
    super(EventType.CLICK, ModificationKeyType.CTRL);
    this._app = app;
    this._selectableLayers = layers;
  }

  get featureClicked(): VcsEvent<string[]> {
    return this._featureClicked;
  }

  /**
   * Either adds or removes a feature from the selected features and also adds and removes style.
   * @param feature A clicked feature.
   */
  private _selectFeature(feature: FeatureType): void {
    const featureId = feature.getId() as string;
    // TODO: Only hightlight feature on clicked layer.
    if (this._selectedFeatures.indexOf(featureId) !== -1) {
      this._selectedFeatures = this._selectedFeatures.filter(
        (selectedFeatureId) => selectedFeatureId !== featureId,
      );
      this._selectableLayers.forEach((layer) => {
        layer.featureVisibility.unHighlight([featureId]);
      });
    } else {
      this._selectedFeatures.push(featureId);
      this._selectableLayers.forEach((layer) => {
        layer.featureVisibility.highlight({
          [featureId]: getHighlightStyle(
            feature,
            layer,
            this._app.uiConfig.config.primaryColor ??
              getDefaultPrimaryColor(this._app),
          ),
        });
      });
    }
  }

  /** Highlights selected features. */
  private _highlightSelectedFeatures(): void {
    const toHighlight = this._selectedFeatures.reduce(
      (prev, curr) => ({
        ...prev,
        [curr]: getHighlightStyle(
          // @ts-expect-error feature
          null,
          null,
          this._app.uiConfig.config.primaryColor ??
            getDefaultPrimaryColor(this._app),
        ),
      }),
      {},
    );
    this._selectableLayers.forEach((layer) => {
      layer.featureVisibility.highlight(toHighlight);
    });
  }

  /** Removes highlight from selected features. */
  clearHighlighting(): void {
    this._selectableLayers.forEach((layer) => {
      layer.featureVisibility.unHighlight(this._selectedFeatures);
    });
  }

  /** Removes selection and clears highlighting. */
  clearSelection(): void {
    this.clearHighlighting();
    this._selectedFeatures = [];
  }

  /**
   * Sets the selected features. All previously selected features are unselected.
   * @param features The ids of the features to select.
   */
  set selectedFeatures(features: string[]) {
    this.clearSelection();
    this._selectedFeatures = features;
    this._highlightSelectedFeatures();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async pipe(event: InteractionEvent): Promise<InteractionEvent> {
    if (event.feature) {
      if (
        this._selectableLayers.some(
          (layer) => layer.name === event.feature![vcsLayerName],
        )
      ) {
        this._selectFeature(event.feature);
        this._featureClicked.raiseEvent(this._selectedFeatures);
      } else {
        this._app.notifier.add({
          type: NotificationType.WARNING,
          message: 'export.selectionTypes.layerNotSupportedWarning',
          timeout: 5000,
        });
      }
    }
    return event;
  }

  destroy(): void {
    super.destroy();
    this.clearSelection();
    this._featureClicked.destroy();
  }
}

export default SelectionObjectInteraction;

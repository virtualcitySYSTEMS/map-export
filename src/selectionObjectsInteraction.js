import {
  AbstractInteraction,
  EventType,
  ModificationKeyType,
  VcsEvent,
  vcsLayerName,
} from '@vcmap/core';
import {
  getDefaultPrimaryColor,
  getHighlightStyle,
  NotificationType,
} from '@vcmap/ui';

/** @typedef {import("ol").Feature<import("ol/geom/Geometry").default>|import("@vcmap/cesium").Cesium3DTileFeature|import("@vcmap/cesium").Cesium3DTilePointFeature|import("@vcmap/cesium").Entity} FeatureType */

/**
 * Class handling the selection of city model objects
 * @class
 */
class SelectionObjectInteraction extends AbstractInteraction {
  /**
   * @param {import("@vcmap/ui").VcsUiApp} app
   * @param {Array<import("@vcmap/core"):CesiumTilesetLayer>} layers
   */
  constructor(app, layers) {
    super(EventType.CLICK, ModificationKeyType.CTRL);
    /**
     * @type {import("@vcmap/ui").VcsUiApp}
     * @private
     */
    this._app = app;
    /**
     * All layers that are supported for export with object selection.
     * @type {Array<import("@vcmap/core").CesiumTilesetLayer>}
     * @private
     */
    this.selectableLayers = layers;
    /**
     * Array with the ids of selected features.
     * @type {string[]}
     * @private
     */
    this._selectedFeatures = [];
    /**
     * @type {import("@vcmap/core").VcsEvent<Array<string>>}
     * @private
     */
    this._featureClicked = new VcsEvent();
  }

  /**
   * Getter for featureClicked Event
   * @type {import("@vcmap/core").VcsEvent<Array<string>>}
   */
  get featureClicked() {
    return this._featureClicked;
  }

  /**
   * Either adds or removes a feature from the selected features and also adds and removes style.
   * @param {FeatureType} feature A clicked feature.
   */
  _selectFeature(feature) {
    /** @type {string} */
    const featureId = feature.getId();
    // TODO: Only hightlight feature on clicked layer.
    if (this._selectedFeatures.indexOf(featureId) !== -1) {
      this._selectedFeatures = this._selectedFeatures.filter(
        (selectedFeatureId) => selectedFeatureId !== featureId,
      );
      this.selectableLayers.forEach((layer) => {
        layer.featureVisibility.unHighlight([featureId]);
      });
    } else {
      this._selectedFeatures.push(featureId);
      this.selectableLayers.forEach((layer) => {
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

  /**
   * Highlights selected features.
   */
  _highlightSelectedFeatures() {
    const toHighlight = this._selectedFeatures.reduce(
      (prev, curr) => ({
        ...prev,
        [curr]: getHighlightStyle(
          null,
          null,
          this._app.uiConfig.config.primaryColor ??
            getDefaultPrimaryColor(this._app),
        ),
      }),
      {},
    );
    this.selectableLayers.forEach((layer) =>
      layer.featureVisibility.highlight(toHighlight),
    );
  }

  /**
   * Removes highlight from selected features.
   */
  clearHighlighting() {
    this.selectableLayers.forEach((layer) =>
      layer.featureVisibility.unHighlight(this._selectedFeatures),
    );
  }

  /**
   * Removes selection and clears highlighting.
   */
  clearSelection() {
    this.clearHighlighting();
    this._selectedFeatures = [];
  }

  /**
   * Sets the selected features. All previously selected features are unselected.
   * @param {string[]} features The ids of the features to select.
   */
  set selectedFeatures(features) {
    this.clearSelection();
    this._selectedFeatures = features;
    this._highlightSelectedFeatures();
  }

  /**
   * @inheritDoc
   * @param {import("@vcmap/core").InteractionEvent} event
   * @returns {Promise<import("@vcmap/core").InteractionEvent>}
   */
  async pipe(event) {
    if (event.feature) {
      if (
        this.selectableLayers.some(
          (layer) => layer.name === event.feature[vcsLayerName],
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

  destroy() {
    super.destroy();
    this.clearSelection();
    this._featureClicked.destroy();
  }
}

export default SelectionObjectInteraction;

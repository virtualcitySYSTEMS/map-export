import {
  AbstractInteraction,
  EventType,
  ModificationKeyType,
  VcsEvent,
  VectorStyleItem,
  vcsLayerName,
} from '@vcmap/core';

/** The highlight style for clicked features. */
export const hightlightStyle = new VectorStyleItem({
  fill: { color: '#ffcc66' },
  stroke: {
    color: '#ffaa00',
    width: 1,
  },
});

/** @typedef {import("ol").Feature<import("ol/geom/Geometry").default>|import("@vcmap/cesium").Cesium3DTileFeature|import("@vcmap/cesium").Cesium3DTilePointFeature|import("@vcmap/cesium").Entity} FeatureType */

/**
 * Class handling the selection of city model objects
 * @class
 */
class SelectionObjectInteraction extends AbstractInteraction {
  /**
   * @param {Array<import("@vcmap/core").CesiumTilesetLayer>} layers All layers that are supported for export with object selection.
   * @param {Array<string>} features Ids of selected features.
   */
  constructor(layers, features) {
    super(EventType.CLICK, ModificationKeyType.CTRL);

    // TODO: Does not need to be highlighted on all layers. Thus the layers property can be removed, and the layer can be received from feature.
    /**
     * All layers that are supported for export with object selection.
     * @type {Array<import("@vcmap/core").CesiumTilesetLayer>}
     * @private
     */
    this._selectableLayers = layers;
    /**
     * Array with the ids of selected features.
     * @type {string[]}
     * @private
     */
    this._selectedFeatures = features || [];
    this._highlightSelectedFeatures();
    /**
     * @type {import("@vcmap/core").VcsEvent<Array<string>>}
     * @private
     */
    this._featureClicked = new VcsEvent();
  }

  /**
   * Getter for featureClicked Event
   * @returns {import("@vcmap/core").VcsEvent<Array<string>>}
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
      this._selectedFeatures = this._selectedFeatures.filter(selectedFeatureId => selectedFeatureId !== featureId);
      this._selectableLayers.forEach((layer) => {
        layer.featureVisibility.unHighlight([featureId]);
      });
    } else {
      this._selectedFeatures.push(featureId);
      this._selectableLayers.forEach((layer) => {
        layer.featureVisibility.highlight({ [featureId]: hightlightStyle });
      });
    }
  }

  /**
   * Highlights selected features.
   */
  _highlightSelectedFeatures() {
    const toHighlight = this._selectedFeatures.reduce((prev, curr) => ({ ...prev, [curr]: hightlightStyle }), {});
    this._selectableLayers.forEach(layer => layer.featureVisibility.highlight(toHighlight));
  }

  /**
   * Removes highlight from selected features.
   */
  clearHighlighting() {
    this._selectableLayers.forEach(layer => layer.featureVisibility.unHighlight(this._selectedFeatures));
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
    if (event.feature && this._selectableLayers.some(layer => layer.name === event.feature[vcsLayerName])) {
      this._selectFeature(event.feature);
      this._featureClicked.raiseEvent(this._selectedFeatures);
    }
    return event;
  }
}

export default SelectionObjectInteraction;

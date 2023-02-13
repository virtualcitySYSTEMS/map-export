/**
 * @typedef {Object} AbstractResultOptions
 * @property {string|Object} title
 * @property {string|number} featureId
 * @property {string|undefined} fileSize
 * @api
 */

/**
 * @class
 * @api
 * @export
 */
class AbstractResult {
  /**
   * @param {AbstractResultOptions} options
   */
  constructor(options) {
    /** @type {string|Object} */
    this.title = options.title;
    /** @type {string|number} */
    this.featureId = options.featureId;
    /** @type {string|undefined} */
    this.fileSize = options.fileSize;
  }

  /**
   * @abstract
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line class-methods-use-this
  download() { return Promise.resolve(); }
}

export default AbstractResult;

import { downloadURI } from '@vcmap/ui';
import AbstractResult from './abstractResult.js';

/**
 * @typedef {Object} FileResultOptionAdditions
 * @property {string} href
 * @typedef {import("./abstractResult").AbstractResultOptions & FileResultOptionAdditions} FileResultOptions
 */

/**
 * @class
 * @api
 * @extends {AbstractResult}
 * @export
 */
class FileExportResult extends AbstractResult {
  /**
   * @param {FileResultOptions} options
   */
  constructor(options) {
    super(options);
    this.href = options.href;
  }

  download() {
    // TODO: Security - make sure that the url is trusted
    downloadURI(this.href, '');
    return Promise.resolve();
  }
}

export default FileExportResult;

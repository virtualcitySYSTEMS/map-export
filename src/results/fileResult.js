import AbstractResult from './abstractResult.js';

/**
 * Downloads a file.
 * @param {string} path Path to the file.
 * @param {string} fileName name that is assigned to the file.
 */
export function downloadURI(path, fileName) {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = path;
  link.target = '_blank';
  link.click();
  link.remove();
}


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

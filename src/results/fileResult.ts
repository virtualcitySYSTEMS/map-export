import { downloadURI } from '@vcmap/ui';
import type { AbstractResultOptions } from './abstractResult.js';
import AbstractResult from './abstractResult.js';

type FileResultOptionAdditions = { href: string };

type FileResultOptions = AbstractResultOptions & FileResultOptionAdditions;

class FileExportResult extends AbstractResult {
  href: string;
  constructor(options: FileResultOptions) {
    super(options);
    this.href = options.href;
  }

  download(): Promise<void> {
    // TODO: Security - make sure that the url is trusted
    downloadURI(this.href, '');
    return Promise.resolve();
  }
}

export default FileExportResult;

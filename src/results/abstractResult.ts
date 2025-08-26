export type AbstractResultOptions = {
  title: string | object;
  featureId: string | number;
  fileSize?: string;
};

class AbstractResult {
  title: string | object;
  featureId: string | number;
  fileSize?: string;

  constructor(options: AbstractResultOptions) {
    this.title = options.title;
    this.featureId = options.featureId;
    this.fileSize = options.fileSize;
  }
  // eslint-disable-next-line class-methods-use-this
  download(): Promise<void> {
    return Promise.resolve();
  }
}

export default AbstractResult;

declare module 'dom-to-image-more' {
  interface DomToImage {
    toPng: (node: HTMLElement, options?: object) => Promise<string>;
    toJpeg: (node: HTMLElement, options?: object) => Promise<string>;
    toBlob: (node: HTMLElement, options?: object) => Promise<Blob>;
  }

  const domtoimage: DomToImage;
  export default domtoimage;
}

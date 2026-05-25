declare module "unzipper" {
  export const Open: {
    buffer(buffer: Buffer | Uint8Array | ArrayBuffer): Promise<{
      files: Array<{
        path: string;
        type: string;
        size: number;
        buffer(): Promise<Buffer>;
      }>;
    }>;
  };
}

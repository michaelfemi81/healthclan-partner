declare module 'expo-document-picker' {
  export type DocumentPickerAsset = {
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
    file?: Blob;
  };

  export type DocumentPickerResult =
    | { canceled: true; assets?: null }
    | { canceled: false; assets: DocumentPickerAsset[] };

  export function getDocumentAsync(options?: {
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
    type?: string | string[];
  }): Promise<DocumentPickerResult>;
}

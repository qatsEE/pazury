
export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // Pełny URL danych dla tagu <img>
  base64: string;  // Czysty base64 dla API
}
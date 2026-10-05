import { isPreviewBuild } from './install';

interface PreviewDownloads {
  save(req: { filename: string; data: string }): Promise<unknown>;
}

/** Na prévia hospedada no claude.ai, downloads passam pela permissão "downloads" da página. */
async function previewDownloads(): Promise<PreviewDownloads | null> {
  const claude = (window as unknown as { claude?: { use?(name: string): Promise<unknown> } }).claude;
  if (!isPreviewBuild() || !claude?.use) return null;
  try {
    return (await claude.use('downloads')) as PreviewDownloads | null;
  } catch {
    return null;
  }
}

/** Oferece um arquivo para salvar. Devolve false se não foi possível. */
export async function downloadText(fileName: string, content: string, mime: string): Promise<boolean> {
  const viaPreview = await previewDownloads();
  if (viaPreview) {
    try {
      await viaPreview.save({ filename: fileName, data: content });
      return true;
    } catch {
      return false;
    }
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export type OpenConverterWithFileRequest = {
  file: File;
  requestId: string;
  source?: string;
  preset?: 'default' | 'format-change' | 'compress-image' | 'image-filters';
};

type OpenConverterWithFileListener = (request: OpenConverterWithFileRequest) => void;

const openConverterWithFileListeners = new Set<OpenConverterWithFileListener>();
const OPEN_CONVERTER_EVENT = 'zenpost:open-converter-file';
let latestOpenConverterWithFileRequest: OpenConverterWithFileRequest | null = null;

function buildRequestId(): string {
  return `open-converter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function openConverterWithFile(payload: {
  file: File;
  source?: string;
  preset?: OpenConverterWithFileRequest['preset'];
}): OpenConverterWithFileRequest {
  const request: OpenConverterWithFileRequest = {
    file: payload.file,
    source: payload.source,
    preset: payload.preset ?? 'default',
    requestId: buildRequestId(),
  };
  latestOpenConverterWithFileRequest = request;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<OpenConverterWithFileRequest>(OPEN_CONVERTER_EVENT, {
      detail: request,
    }));
    if (window.location.hash !== '#converter') {
      window.location.hash = '#converter';
    }
  } else {
    openConverterWithFileListeners.forEach((listener) => listener(request));
  }
  return request;
}

export function getPendingOpenConverterWithFileRequest(): OpenConverterWithFileRequest | null {
  return latestOpenConverterWithFileRequest;
}

export function clearPendingOpenConverterWithFileRequest(requestId?: string): void {
  if (!latestOpenConverterWithFileRequest) return;
  if (requestId && latestOpenConverterWithFileRequest.requestId !== requestId) return;
  latestOpenConverterWithFileRequest = null;
}

export function subscribeToOpenConverterWithFile(
  listener: OpenConverterWithFileListener,
): () => void {
  if (typeof window !== 'undefined') {
    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent<OpenConverterWithFileRequest>).detail;
      if (!detail) return;
      listener(detail);
    };
    window.addEventListener(OPEN_CONVERTER_EVENT, handleEvent);
    return () => window.removeEventListener(OPEN_CONVERTER_EVENT, handleEvent);
  }

  openConverterWithFileListeners.add(listener);
  return () => openConverterWithFileListeners.delete(listener);
}

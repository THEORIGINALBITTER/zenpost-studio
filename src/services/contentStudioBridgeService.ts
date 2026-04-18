import type { ScheduledPost } from '../types/scheduling';

export type OpenAsDraftRequest = {
  title?: string;
  content?: string;
  requestId: string;
};

export type InsertSnippetRequest = {
  content?: string;
  title?: string;
  requestId: string;
};

export type InsertImagesRequest = {
  images: Array<{ url: string; alt?: string }>;
  requestId: string;
};

export type EditScheduledPostRequest = {
  post: ScheduledPost;
  requestId: string;
};

type OpenAsDraftListener = (request: OpenAsDraftRequest) => void;
type InsertSnippetListener = (request: InsertSnippetRequest) => void;
type InsertImagesListener = (request: InsertImagesRequest) => void;
type EditScheduledPostListener = (request: EditScheduledPostRequest) => void;

const openAsDraftListeners = new Set<OpenAsDraftListener>();
const insertSnippetListeners = new Set<InsertSnippetListener>();
const insertImagesListeners = new Set<InsertImagesListener>();
const editScheduledPostListeners = new Set<EditScheduledPostListener>();

function buildRequestId(): string {
  return `open-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function openContentStudioAsDraft(payload: { title?: string; content?: string }): OpenAsDraftRequest {
  const request: OpenAsDraftRequest = {
    title: payload.title ?? '',
    content: payload.content ?? '',
    requestId: buildRequestId(),
  };
  openAsDraftListeners.forEach((listener) => listener(request));
  return request;
}

export function subscribeToOpenContentStudioAsDraft(listener: OpenAsDraftListener): () => void {
  openAsDraftListeners.add(listener);
  return () => openAsDraftListeners.delete(listener);
}

export function insertContentStudioSnippet(payload: { content?: string; title?: string }): InsertSnippetRequest {
  const request: InsertSnippetRequest = {
    content: payload.content ?? '',
    title: payload.title ?? '',
    requestId: buildRequestId(),
  };
  insertSnippetListeners.forEach((listener) => listener(request));
  return request;
}

export function subscribeToInsertContentStudioSnippet(listener: InsertSnippetListener): () => void {
  insertSnippetListeners.add(listener);
  return () => insertSnippetListeners.delete(listener);
}

export function insertContentStudioImages(payload: {
  images?: Array<{ url: string; alt?: string }>;
}): InsertImagesRequest {
  const request: InsertImagesRequest = {
    images: Array.isArray(payload.images) ? payload.images.filter((image) => !!image?.url) : [],
    requestId: buildRequestId(),
  };
  insertImagesListeners.forEach((listener) => listener(request));
  return request;
}

export function subscribeToInsertContentStudioImages(listener: InsertImagesListener): () => void {
  insertImagesListeners.add(listener);
  return () => insertImagesListeners.delete(listener);
}

export function editScheduledPostInContentStudio(post: ScheduledPost): EditScheduledPostRequest {
  const request: EditScheduledPostRequest = {
    post,
    requestId: buildRequestId(),
  };
  editScheduledPostListeners.forEach((listener) => listener(request));
  return request;
}

export function subscribeToEditScheduledPostInContentStudio(listener: EditScheduledPostListener): () => void {
  editScheduledPostListeners.add(listener);
  return () => editScheduledPostListeners.delete(listener);
}

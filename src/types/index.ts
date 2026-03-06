export interface Env {
  R2: R2Bucket;
  API_KEY?: string;
}

export type Source = {
  id: string;
  url: string;
};

export type RefreshResult = {
  id: string;
  url: string;
  key: string;
  status: "updated" | "not_modified" | "error";
  fetchedAt: string;
  detail?: string;
  sizeBytes?: number;
  sourceEtag?: string;
  sourceLastModified?: string;
};

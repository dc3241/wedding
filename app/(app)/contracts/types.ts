export type ArchiveWedding = {
  id: string;
  name: string;
  archived_at: string | null;
};

export type ArchiveContract = {
  id: string;
  name: string;
  created_at: string;
  status: string | null;
  project_id: string;
  project_name: string;
  /** Vendor-category id, or null = uncategorized. */
  category: string | null;
};

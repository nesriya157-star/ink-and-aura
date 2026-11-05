export type Visibility = "Private" | "Public";
export const TYPES = ["Story", "Poem", "Quote", "Journal", "Other"] as const;

export type Note = {
  id: string;
  title: string;
  body: string;
  type: string;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
};

export type User = { id: string; name: string; email: string };

export type Status = "paid" | "unpaid" | "pending";

export type Category = "player" | "nonplayer";

export const STATUSES: Status[] = ["paid", "unpaid", "pending"];

export interface JerseyOrder {
  id: string;
  name: string;
  jersey_number: string | null;
  size: string | null;
  jersey_name: string | null;
  status: Status;
  note: string | null;
  category: Category;
  facebook_url: string | null;
  created_at: string;
  updated_at: string;
}

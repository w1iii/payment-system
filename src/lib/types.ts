export type Status = "paid" | "unpaid" | "pending";

export type Category = "player" | "nonplayer" | "nonplayer2";

export const STATUSES: Status[] = ["paid", "unpaid", "pending"];

export const CATEGORY_PRICES: Record<Category, number> = {
  player: 350,
  nonplayer: 450,
  nonplayer2: 450,
};

export interface JerseyOrder {
  id: string;
  name: string;
  jersey_number: string | null;
  size: string | null;
  jersey_name: string | null;
  status: Status;
  note: string | null;
  category: Category;
  created_at: string;
  updated_at: string;
}

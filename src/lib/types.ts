export type Status = "paid" | "unpaid" | "pending";

export const STATUSES: Status[] = ["paid", "unpaid", "pending"];

export interface JerseyOrder {
  id: string;
  name: string;
  jersey_number: string | null;
  size: string | null;
  jersey_name: string | null;
  status: Status;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type RegistryItem = {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  buy_url: string | null;
  quantity_wanted: number;
  note: string | null;
  created_at: string;
};

export type RegistryClaimStatus = "reserved" | "purchased";

export type RegistryClaim = {
  id: string;
  registry_item_id: string;
  quantity: number;
  status: RegistryClaimStatus;
  claimer_name: string | null;
  created_at: string;
};

export type RegistryItemFields = {
  name: string;
  price?: number | null;
  image_url?: string | null;
  buy_url?: string | null;
  quantity_wanted?: number;
  note?: string | null;
};

export interface ScannedReceiptItem {
  name?: string;
  quantity?: number;
  price?: number;
  totalPrice?: number;
}

export interface ScannedReceipt {
  merchantName?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  transactionDate?: string; // ISO 8601
  total?: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  receiptType?: string;
  confidence?: number;
  items: ScannedReceiptItem[];
}

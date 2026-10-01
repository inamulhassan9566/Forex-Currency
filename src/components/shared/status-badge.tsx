import React from "react";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "AVAILABLE":
      return <Badge variant="success">AVAILABLE</Badge>;
    case "PARTIALLY_SOLD":
      return <Badge variant="warning">PARTIALLY SOLD</Badge>;
    case "SOLD_OUT":
      return <Badge variant="secondary">SOLD OUT</Badge>;
    case "CONFIRMED":
      return <Badge variant="success">CONFIRMED</Badge>;
    case "REVERSED":
      return <Badge variant="danger">REVERSED</Badge>;
    case "CANCELLED":
      return <Badge variant="danger">CANCELLED</Badge>;
    case "ACTIVE":
      return <Badge variant="success">ACTIVE</Badge>;
    case "INACTIVE":
      return <Badge variant="danger">INACTIVE</Badge>;
    case "MATCHED":
      return <Badge variant="success">MATCHED</Badge>;
    case "DISCREPANCY_DETECTED":
      return <Badge variant="danger">DISCREPANCY</Badge>;
    case "LOW_STOCK":
      return <Badge variant="danger">LOW STOCK</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

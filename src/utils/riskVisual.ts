export function getRiskVisual(score: number, riskLevel?: any) {
  const s = Math.round(Number(score || 0));
  const label = typeof riskLevel === "string" ? riskLevel : riskLevel?.label;

  if (label === "极高风险" || s >= 75) {
    return { label: label || "极高风险", color: "text-red-500", bg: "bg-red-500", border: "border-red-500/40", bgOp: "bg-red-500/10" };
  }
  if (label === "中高风险" || s >= 50) {
    return { label: label || "中高风险", color: "text-orange-500", bg: "bg-orange-500", border: "border-orange-500/40", bgOp: "bg-orange-500/10" };
  }
  if (label === "中等风险" || s >= 30) {
    return { label: label || "中等风险", color: "text-yellow-500", bg: "bg-yellow-500", border: "border-yellow-500/40", bgOp: "bg-yellow-500/10" };
  }
  return { label: label || "低风险", color: "text-green-500", bg: "bg-green-500", border: "border-green-500/40", bgOp: "bg-green-500/10" };
}

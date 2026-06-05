export function getRiskVisual(score: number, riskLevel?: any) {
  const s = Math.round(Number(score || 0));
  const label = typeof riskLevel === "string" ? riskLevel : riskLevel?.label;

  if (label === "极高风险" || s >= 75) {
    return { label: label || "极高风险", color: "text-[#F43F5E]", bg: "bg-[#F43F5E]", border: "border-[#F43F5E]/40", bgOp: "bg-[#F43F5E]/10" };
  }
  if (label === "中高风险" || s >= 50) {
    return { label: label || "中高风险", color: "text-[#FB923C]", bg: "bg-[#FB923C]", border: "border-[#FB923C]/40", bgOp: "bg-[#FB923C]/10" };
  }
  if (label === "中等风险" || s >= 30) {
    return { label: label || "中等风险", color: "text-[#FACC15]", bg: "bg-[#FACC15]", border: "border-[#FACC15]/40", bgOp: "bg-[#FACC15]/10" };
  }
  return { label: label || "低风险", color: "text-[#22C55E]", bg: "bg-[#22C55E]", border: "border-[#22C55E]/40", bgOp: "bg-[#22C55E]/10" };
}

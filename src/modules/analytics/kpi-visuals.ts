import { Buildings, CalendarCheck, Certificate, ChartLineUp, CheckCircle, ClipboardText, Clock, GraduationCap, Hourglass, MapPin, Medal, Percent, Prohibit, Star, Target, UserPlus, UsersThree, Warning, type Icon } from "@phosphor-icons/react";

export type KpiVisual = { icon: Icon; tone: string };

// Mỗi chỉ số một biểu tượng + màu token: cùng chỉ số luôn cùng màu ở mọi trang, không đổi theo thứ tự thẻ.
const VISUALS: Record<string, KpiVisual> = {
  activeLeaders: { icon: UsersThree, tone: "var(--viz-1)" },
  totalLeaders: { icon: UsersThree, tone: "var(--viz-1)" },
  newLeaders: { icon: UserPlus, tone: "var(--viz-3)" },
  promotions: { icon: Medal, tone: "var(--viz-4)" },
  activeRate: { icon: CheckCircle, tone: "var(--viz-3)" },
  trainedRate: { icon: GraduationCap, tone: "var(--viz-7)" },
  femaleRate: { icon: Percent, tone: "var(--viz-5)" },
  averageAge: { icon: Clock, tone: "var(--viz-2)" },
  youthRate: { icon: ChartLineUp, tone: "var(--viz-3)" },
  seniorRate: { icon: ChartLineUp, tone: "var(--viz-4)" },
  totalDeaneries: { icon: Buildings, tone: "var(--viz-1)" },
  totalParishes: { icon: MapPin, tone: "var(--viz-7)" },
  inactiveDeaneries: { icon: Prohibit, tone: "var(--viz-8)" },
  inactiveParishes: { icon: Prohibit, tone: "var(--viz-8)" },
  parishesWithoutLeaders: { icon: Warning, tone: "var(--viz-4)" },
  leadersPerParish: { icon: UsersThree, tone: "var(--viz-2)" },
  totalDioceses: { icon: Buildings, tone: "var(--viz-7)" },
  totalCourses: { icon: GraduationCap, tone: "var(--viz-7)" },
  registrations: { icon: ClipboardText, tone: "var(--viz-1)" },
  attendanceRate: { icon: CalendarCheck, tone: "var(--viz-2)" },
  passRate: { icon: Target, tone: "var(--viz-3)" },
  cancellationRate: { icon: Prohibit, tone: "var(--viz-8)" },
  rejectionRate: { icon: Prohibit, tone: "var(--viz-8)" },
  rejectedRegistrations: { icon: Prohibit, tone: "var(--viz-8)" },
  certificateRate: { icon: Certificate, tone: "var(--viz-4)" },
  averageScore: { icon: Star, tone: "var(--viz-5)" },
  pendingApproval: { icon: Hourglass, tone: "var(--viz-4)" },
  trainedLeaders: { icon: Medal, tone: "var(--viz-3)" },
  approvedCertificates: { icon: Certificate, tone: "var(--viz-3)" },
  totalCertificates: { icon: Certificate, tone: "var(--viz-1)" },
  approved: { icon: CheckCircle, tone: "var(--viz-3)" },
  pending: { icon: Hourglass, tone: "var(--viz-4)" },
  rejected: { icon: Prohibit, tone: "var(--viz-8)" },
  revoked: { icon: Warning, tone: "var(--viz-2)" },
  approvalRate: { icon: CheckCircle, tone: "var(--viz-3)" },
  conversionRate: { icon: Target, tone: "var(--viz-7)" },
  systemSuggestedRate: { icon: Star, tone: "var(--viz-1)" },
  exceptionRate: { icon: Warning, tone: "var(--viz-4)" },
  medianApprovalHours: { icon: Clock, tone: "var(--viz-2)" },
  averageApprovalHours: { icon: Clock, tone: "var(--viz-5)" },
};

export function kpiVisual(key: string): KpiVisual {
  return VISUALS[key] ?? { icon: ChartLineUp, tone: "var(--viz-1)" };
}

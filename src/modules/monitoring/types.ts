export type MonitoringSummary = {
  totalRequests: number;
  serverErrors: number;
  deniedRequests: number;
  failedLogins: number;
  uniqueIps: number;
  uniqueAccounts: number;
  privateIpRequests: number;
  p95Ms: number | null;
};

export type MonitoringTimelinePoint = {
  time: string;
  requests: number;
  serverErrors: number;
  deniedRequests: number;
  p95Ms: number | null;
};

export type MonitoringIpActivity = {
  ipAddress: string;
  requests: number;
  accounts: number;
  errors: number;
  deniedRequests: number;
  failedLogins: number;
  lastSeenAt: string;
};

export type MonitoringAccountActivity = {
  username: string;
  requests: number;
  ipAddresses: number;
  errors: number;
  lastSeenAt: string;
};

export type MonitoringEndpointActivity = {
  method: string;
  path: string;
  requests: number;
  serverErrors: number;
  p95Ms: number | null;
};

export type MonitoringAlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export type MonitoringAlert = {
  code: string;
  severity: MonitoringAlertSeverity;
  title: string;
  detail: string;
};

export type MonitoringOverview = {
  hours: number;
  bucketMinutes: number;
  from: string;
  generatedAt: string;
  summary: MonitoringSummary;
  previousSummary: MonitoringSummary | null;
  rateLimitedRequests: number | null;
  ipDataReliable: boolean;
  timeline: MonitoringTimelinePoint[];
  topIps: MonitoringIpActivity[];
  topAccounts: MonitoringAccountActivity[];
  busiestEndpoints: MonitoringEndpointActivity[];
  slowestEndpoints: MonitoringEndpointActivity[];
  alerts: MonitoringAlert[];
};

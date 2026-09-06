export type Role = 'social_media' | 'mobilizer' | 'polling_agent';

export interface RoleAssignment {
  id: string;
  role: Role;
  status: string;
  county: string;
  constituency: string;
  ward: string;
  pollingStation: { id: string; name: string; ward: string } | null;
}

export interface StipendState {
  canRequest: boolean;
  reason: string | null;
  nextEligibleAt: string | null;
  activationDelayDays: number;
  repeatCooldownDays: number;
  latestRequest: { id: string; status: string; requestedAt: string; approvedAt?: string | null; paidAt?: string | null } | null;
}

export interface MobilizerReport {
  id: string;
  periodStart: string;
  peopleReached: number;
  meetingsHeld: number;
  newVolunteers: number;
  keyIssues?: string | null;
  notes?: string | null;
  status: string;
  adminNote?: string | null;
  createdAt: string;
}

export interface MobilizerData {
  groupLink: string;
  periodStart: string;
  currentReport: MobilizerReport | null;
  recentReports: MobilizerReport[];
}

export interface PollingResult {
  id: string;
  status: string;
  validVotes: number;
  rejectedVotes: number;
  submittedAt: string;
  reviewNote?: string | null;
  attachments: { id: string; originalName: string; mimeType: string }[];
}

export interface TeamProfile {
  name: string;
  email: string;
  role: Role;
  status: string;
  county: string;
  constituency: string;
  ward: string;
  pollingStation: { id: string; name: string; ward: string } | null;
  selectedAssignmentId: string;
  assignments: RoleAssignment[];
  isSocialMedia: boolean;
  isApproved: boolean;
  approvedSocial: boolean;
  social: { groupLink: string; shareMessage: string; shareUrl: string } | null;
  stipend: StipendState;
  mobilizer: MobilizerData | null;
  pollingResult: PollingResult | null;
}

export interface Candidate {
  id: string;
  name: string;
  party?: string | null;
  imageUrl?: string | null;
}

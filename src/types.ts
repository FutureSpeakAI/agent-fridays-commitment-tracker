/**
 * types.ts — Data model for the Commitment Tracker.
 *
 * All interfaces and type aliases used by the commitment tracking engine.
 */

// ── Status & Classification Types ───────────────────────────────────

export type CommitmentStatus = 'active' | 'completed' | 'overdue' | 'cancelled' | 'snoozed';
export type CommitmentSource = 'conversation' | 'email' | 'message' | 'meeting' | 'calendar' | 'manual';
export type CommitmentDirection = 'user_promised' | 'other_promised' | 'mutual';
export type FollowUpUrgency = 'low' | 'medium' | 'high' | 'critical';

// ── Core Data Interfaces ────────────────────────────────────────────

export interface Commitment {
  id: string;
  /** What was committed to */
  description: string;
  /** Who made the commitment */
  direction: CommitmentDirection;
  /** Person involved (other party) */
  personName: string;
  /** Where the commitment was detected */
  source: CommitmentSource;
  /** Current status */
  status: CommitmentStatus;
  /** When this was detected */
  createdAt: number;
  /** When this is due (null = no explicit deadline) */
  deadline: number | null;
  /** Optional domain context */
  domain: string;
  /** Context snippet where commitment was detected */
  contextSnippet: string;
  /** How confident we are this is a real commitment (0-1) */
  confidence: number;
  /** Whether the user has been reminded about this */
  reminded: boolean;
  /** When the user was last reminded */
  lastRemindedAt: number | null;
  /** When this was completed/cancelled */
  resolvedAt: number | null;
  /** Notes or resolution details */
  notes: string;
}

export interface OutboundMessage {
  id: string;
  /** Who it was sent to */
  recipient: string;
  /** Communication channel */
  channel: string;
  /** Brief summary of what was sent */
  summary: string;
  /** When it was sent */
  sentAt: number;
  /** Whether a reply has been received */
  replyReceived: boolean;
  /** When reply was received (null if not yet) */
  replyReceivedAt: number | null;
  /** Expected response time in hours (learned per contact/channel) */
  expectedResponseHours: number;
  /** Whether we've already suggested a follow-up */
  followUpSuggested: boolean;
}

export interface FollowUpSuggestion {
  id: string;
  /** Related outbound message or commitment */
  relatedId: string;
  type: 'unreplied_message' | 'approaching_deadline' | 'overdue_commitment' | 'check_in';
  /** Who to follow up with */
  personName: string;
  /** What to say (suggestion) */
  suggestedAction: string;
  /** How urgent */
  urgency: FollowUpUrgency;
  /** When this suggestion was generated */
  createdAt: number;
  /** Whether it's been shown to the user */
  delivered: boolean;
  /** Whether the user acted on it */
  actedOn: boolean;
}

// ── Configuration ───────────────────────────────────────────────────

export interface CommitmentTrackerConfig {
  /** Maximum commitments to track */
  maxCommitments: number;
  /** Maximum outbound messages to track */
  maxOutboundMessages: number;
  /** Days to retain resolved commitments */
  retentionDays: number;
  /** Default expected response time in hours */
  defaultResponseHours: number;
  /** Hours before deadline to start reminding */
  reminderLeadHours: number;
  /** Minimum confidence to create a commitment */
  minConfidence: number;
}

// ── Input / Extraction ──────────────────────────────────────────────

export interface CommitmentMention {
  description: string;
  personName: string;
  direction: CommitmentDirection;
  source: CommitmentSource;
  deadline: number | null;
  domain: string;
  confidence: number;
  contextSnippet: string;
}

// ── Status Reporting ────────────────────────────────────────────────

export interface CommitmentTrackerStatus {
  activeCommitments: number;
  overdueCommitments: number;
  pendingFollowUps: number;
  trackedOutboundMessages: number;
  totalCommitmentsTracked: number;
}

// ── Serialization ───────────────────────────────────────────────────

export interface CommitmentTrackerStorage {
  commitments: Commitment[];
  outboundMessages: OutboundMessage[];
  followUpSuggestions: FollowUpSuggestion[];
}

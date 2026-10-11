> **This project now lives on in [Agent-Friday](https://github.com/FutureSpeakAI/Agent-Friday), archived 2026-10-11.**

# commitment-tracker

Track promises, deadlines, and follow-ups -- detect unreplied messages and generate proactive nudge suggestions.

A temporal reasoning engine for AI assistants. Extracted from [Agent Friday](https://github.com/FutureSpeakAI/nexus-os) (Electron) and decoupled into a standalone, framework-agnostic npm package with zero runtime dependencies.

## What It Does

- **Commitment extraction** -- records promises, deadlines, and follow-ups detected in conversations and messages
- **Outbound message tracking** -- monitors sent messages and detects when replies are overdue
- **Proactive follow-up suggestions** -- generates nudge recommendations based on elapsed time, per-contact response baselines, and deadline proximity
- **Context generation** -- produces compact strings suitable for system prompt injection so your AI assistant is always temporally aware
- **Deduplication** -- uses Jaccard text similarity to avoid duplicate commitment entries within time windows
- **Lifecycle management** -- commitments move through active -> completed/cancelled/overdue/snoozed with automatic pruning

All outputs are **suggestions only**. The tracker never sends messages or takes actions autonomously.

## Install

```bash
npm install commitment-tracker
```

## Quick Start

```typescript
import { CommitmentTracker } from 'commitment-tracker';

const tracker = new CommitmentTracker();

// In-memory mode (no file I/O)
await tracker.initialize();

// Or with file persistence
await tracker.initialize('/path/to/commitments.json');

// Track a commitment extracted from conversation
tracker.addCommitment({
  description: 'Send the quarterly report to Sarah',
  personName: 'Sarah',
  direction: 'user_promised',
  source: 'conversation',
  deadline: Date.now() + 48 * 60 * 60 * 1000, // 48 hours from now
  domain: 'work',
  confidence: 0.9,
  contextSnippet: 'I will send you the quarterly report by Friday.',
});

// Track an outbound message
tracker.trackOutboundMessage({
  recipient: 'Bob',
  channel: 'email',
  summary: 'Proposal for Q3 partnership',
});

// Later: check for follow-up suggestions
const suggestions = tracker.generateFollowUpSuggestions();
for (const s of suggestions) {
  console.log(`[${s.urgency}] ${s.suggestedAction}`);
}

// Get context for system prompt injection
const context = tracker.getContextString();
const compact = tracker.getPromptContext();
// => "[Commitments: 1 active commitments | 1 awaiting reply]"
```

## API Reference

### Constructor

```typescript
new CommitmentTracker()
```

Creates a new tracker instance.

### initialize(filePath?, config?)

```typescript
await tracker.initialize(filePath?: string, config?: Partial<CommitmentTrackerConfig>)
```

Initialize the tracker. If `filePath` is provided, data is loaded from and persisted to that JSON file. If omitted, the tracker runs entirely in-memory.

### Commitment CRUD

| Method | Description |
|--------|-------------|
| `addCommitment(mention)` | Add a single commitment. Returns the Commitment or null if below confidence threshold or duplicate. |
| `processCommitmentMentions(mentions)` | Batch-add multiple commitment mentions. Returns array of successfully added commitments. |
| `completeCommitment(id, notes?)` | Mark a commitment as completed. |
| `cancelCommitment(id, reason?)` | Cancel a commitment. |
| `snoozeCommitment(id, untilMs)` | Snooze a commitment until the given timestamp. |

### Outbound Message Tracking

| Method | Description |
|--------|-------------|
| `trackOutboundMessage({ recipient, channel, summary })` | Track a sent message for reply detection. Returns the OutboundMessage. |
| `recordReply(recipient, channel)` | Record that a reply was received. Fuzzy-matches recipient. |

### Follow-Up Suggestions

| Method | Description |
|--------|-------------|
| `generateFollowUpSuggestions()` | Scan all tracked items and return new suggestions. Call periodically. |
| `markSuggestionDelivered(id)` | Mark a suggestion as shown to the user. |
| `markSuggestionActedOn(id)` | Mark a suggestion as acted upon. |

### Queries

| Method | Description |
|--------|-------------|
| `getActiveCommitments()` | All active + overdue commitments. |
| `getOverdueCommitments()` | Only overdue commitments. |
| `getCommitmentsByPerson(name)` | Active/overdue commitments for a person (fuzzy match). |
| `getUpcomingDeadlines(withinHours?)` | Commitments due within N hours (default 72). |
| `getUnrepliedMessages()` | Outbound messages still awaiting reply. |
| `getPendingSuggestions()` | Follow-up suggestions not yet delivered. |
| `getCommitmentById(id)` | Look up a specific commitment. |
| `getAllCommitments()` | All commitments (including resolved). |
| `getStatus()` | Summary counts: active, overdue, pending follow-ups, etc. |
| `getConfig()` | Current configuration. |

### Context Generation

| Method | Description |
|--------|-------------|
| `getContextString()` | Multi-line context string for system prompt injection. Includes overdue items, upcoming deadlines, awaiting replies. |
| `getPromptContext()` | Compact single-line summary. |

### Import / Export

| Method | Description |
|--------|-------------|
| `importData(data)` | Replace all tracker data from a serialized object. |
| `exportData()` | Export all tracker data as a serializable object. |
| `flush()` | Force an immediate save to disk (if filePath was provided). |

## Types

### CommitmentStatus

```typescript
type CommitmentStatus = 'active' | 'completed' | 'overdue' | 'cancelled' | 'snoozed';
```

### CommitmentSource

```typescript
type CommitmentSource = 'conversation' | 'email' | 'message' | 'meeting' | 'calendar' | 'manual';
```

### CommitmentDirection

```typescript
type CommitmentDirection = 'user_promised' | 'other_promised' | 'mutual';
```

### FollowUpUrgency

```typescript
type FollowUpUrgency = 'low' | 'medium' | 'high' | 'critical';
```

Urgency is computed as a ratio of elapsed time to expected response time:

| Ratio | Urgency |
|-------|---------|
| >= 4x | critical |
| >= 2.5x | high |
| >= 1.5x | medium |
| < 1.5x | low |

## Channel Response Baselines

Default expected response times per communication channel (in hours):

| Channel | Expected Response |
|---------|-------------------|
| text | 2h |
| slack | 4h |
| teams | 4h |
| whatsapp | 4h |
| telegram | 8h |
| discord | 12h |
| email | 48h |
| meeting | 168h (1 week) |

These baselines are overridden per-contact once enough reply data is collected (minimum 3 replied messages; uses 80th percentile response time).

## Configuration

```typescript
interface CommitmentTrackerConfig {
  maxCommitments: number;         // default: 200
  maxOutboundMessages: number;    // default: 100
  retentionDays: number;          // default: 90
  defaultResponseHours: number;   // default: 48
  reminderLeadHours: number;      // default: 24
  minConfidence: number;          // default: 0.5
}
```

Pass partial overrides to `initialize()`:

```typescript
await tracker.initialize('/data/commitments.json', {
  maxCommitments: 500,
  reminderLeadHours: 48,
});
```

## In-Memory vs File-Persisted Mode

- **In-memory**: Call `initialize()` with no arguments. Data lives only in the instance. Use `exportData()` to serialize manually.
- **File-persisted**: Call `initialize("/path/to/file.json")`. Data is loaded on init and saved automatically (debounced 2s). Call `flush()` before shutdown to guarantee writes.

## Use Cases

- **AI assistant temporal awareness** -- inject `getContextString()` into your system prompt so the LLM knows about pending commitments and overdue items
- **Email/chat follow-up tracking** -- track outbound messages and get nudge suggestions when replies are overdue
- **Personal commitment management** -- record promises made in meetings, conversations, and messages
- **Team accountability** -- track who promised what and when it is due

## Origin

This package was extracted from the commitment tracking subsystem of [Agent Friday](https://github.com/FutureSpeakAI/nexus-os), an Electron-based AI assistant. The Electron-specific dependencies (`app` import, singleton pattern) have been removed to make it usable in any Node.js environment.

## License

MIT -- see [LICENSE](./LICENSE).

# PRISM Notification Severity & Routing Model

## Design Philosophy

Notifications are **operational signals**, not noise. The routing model ensures:

1. **Right person** - Notifications reach decision-makers, not inboxes
2. **Right time** - Urgency drives delivery speed and channel
3. **Right context** - Trust State gates visibility appropriately
4. **Audit trail** - Every notification is logged for compliance

---

## Severity Classification

### CRITICAL (Red)

**Definition**: Material deviation requiring immediate executive attention

**Thresholds**:
- Spending deviation > 50% from baseline
- Vendor concentration > 60% of agency spend
- Forecast miss > 30% for current period
- Compliance threshold breach (e.g., small business goals)
- Security/fraud indicators detected

**Response SLA**: 1 hour acknowledgment, 24 hour action plan

**Example Triggers**:
```
"CRITICAL: Defense Logistics Agency Q1 spending exceeded forecast by 47% ($2.1B)"
"CRITICAL: Single vendor received 63% of NASA IT spending this quarter"
"CRITICAL: End-of-year obligation rate 340% above normal pattern"
```

---

### WARNING (Yellow)

**Definition**: Significant deviation requiring management review

**Thresholds**:
- Spending deviation 20-50% from baseline
- Vendor concentration 40-60% of agency spend
- Forecast miss 15-30% for current period
- Trend indicates CRITICAL within 30 days
- Month-over-month change > 25%

**Response SLA**: 24 hour acknowledgment, 72 hour review

**Example Triggers**:
```
"WARNING: HHS spending 34% above Q4 baseline - review recommended"
"WARNING: Top 3 vendors now represent 48% of contract obligations"
"WARNING: Current trajectory will exceed FY budget by March 15"
```

---

### INFO (Blue)

**Definition**: Notable pattern for awareness, no immediate action required

**Thresholds**:
- Spending deviation 10-20% from baseline
- New vendor enters top-10 recipients
- Forecast updated with material change
- Trust State promotion completed
- Monthly/quarterly report generated

**Response SLA**: 48 hour acknowledgment (optional)

**Example Triggers**:
```
"INFO: February spending 12% below forecast - within confidence interval"
"INFO: Executive narrative promoted to CLIENT trust state"
"INFO: Q2 forecast updated with $340M reduction"
```

---

## Routing Matrix by Trust State

Trust State gates who can receive notifications about specific content.

| Content Trust State | DRAFT | INTERNAL | CLIENT | EXECUTIVE |
|---------------------|-------|----------|--------|-----------|
| **Recipients** | System admins only | Agency staff | Client-facing roles | Executive leadership |
| **CRITICAL alerts** | ❌ | ✅ Immediate | ✅ Immediate | ✅ Immediate |
| **WARNING alerts** | ❌ | ✅ Batched daily | ✅ Immediate | ✅ Batched daily |
| **INFO alerts** | ❌ | ✅ Batched weekly | ✅ Batched daily | ✅ Batched weekly |
| **Report availability** | ❌ | ✅ Immediate | ✅ Immediate | ✅ Immediate |

### Routing Rules

```typescript
interface NotificationRouting {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  contentTrustState: 'DRAFT' | 'INTERNAL' | 'CLIENT' | 'EXECUTIVE';
  recipientMinTrustLevel: 'INTERNAL' | 'CLIENT' | 'EXECUTIVE';
  channels: Channel[];
  deliveryMode: 'IMMEDIATE' | 'BATCHED_DAILY' | 'BATCHED_WEEKLY';
  escalationPath?: string[];
}
```

---

## Channel Configuration

### Email

**Use for**: All severity levels, primary channel for audit trail

**Format**:
```
Subject: [PRISM] [SEVERITY] Brief description
From: prism-alerts@agency.gov
Reply-To: prism-support@agency.gov

Body:
- Clear subject line with severity
- BLUF paragraph (what happened, impact, action needed)
- Key metrics table
- Link to full report in PRISM portal
- Unsubscribe/preferences link (for INFO only)
```

**Email Template Structure**:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .severity-critical { border-left: 4px solid #f85149; }
    .severity-warning { border-left: 4px solid #d29922; }
    .severity-info { border-left: 4px solid #58a6ff; }
  </style>
</head>
<body>
  <div class="severity-{{severity}}">
    <h2>{{title}}</h2>
    <p><strong>Impact:</strong> {{impact}}</p>
    <p><strong>Action Required:</strong> {{action}}</p>

    <table>
      <tr><th>Metric</th><th>Expected</th><th>Actual</th><th>Deviation</th></tr>
      {{#each metrics}}
      <tr>
        <td>{{name}}</td>
        <td>{{expected}}</td>
        <td>{{actual}}</td>
        <td>{{deviation}}</td>
      </tr>
      {{/each}}
    </table>

    <a href="{{reportUrl}}">View Full Report in PRISM</a>
  </div>
</body>
</html>
```

---

### Slack / Microsoft Teams

**Use for**: CRITICAL and WARNING only (INFO creates noise)

**Format**:
```
🔴 CRITICAL: [Agency] spending anomaly detected

*What:* Q1 obligations 47% above forecast
*Impact:* $2.1B unplanned expenditure
*Action:* Review required by COB today

📊 View in PRISM: [link]
✅ Acknowledge | 📋 Assign | ❌ False Positive
```

**Webhook Configuration**:
```typescript
interface SlackNotification {
  channel: string;  // e.g., "#prism-alerts-critical"
  username: 'PRISM FinOps';
  icon_emoji: ':chart_with_upwards_trend:';
  attachments: [{
    color: '#f85149' | '#d29922' | '#58a6ff';
    title: string;
    text: string;
    fields: Array<{ title: string; value: string; short: boolean }>;
    actions: Array<{ type: 'button'; text: string; url: string }>;
  }];
}
```

**Channel Routing**:
| Severity | Channel Pattern |
|----------|-----------------|
| CRITICAL | `#prism-alerts-critical` (agency-wide) |
| WARNING | `#prism-alerts-{agency-code}` (agency-specific) |
| INFO | Not sent to Slack |

---

### SMS (Optional - CRITICAL only)

**Use for**: CRITICAL alerts to designated executives

**Format**:
```
[PRISM CRITICAL] Agency: DOD | Q1 spending +47% vs forecast ($2.1B).
Action required. Details: prism.agency.gov/alert/12345
```

**Constraints**:
- 160 character limit
- Opt-in only
- Maximum 3 recipients per agency
- Rate limited: max 1 SMS per hour per recipient

---

## Escalation Model

### CRITICAL Escalation Path

```
T+0:    Alert sent to primary recipients
        Channels: Email + Slack + SMS (if enabled)

T+1hr:  If not acknowledged:
        → Escalate to supervisor level
        → Add to executive daily briefing

T+4hr:  If not acknowledged:
        → Escalate to CFO office
        → Create incident ticket

T+24hr: If not resolved:
        → Auto-schedule meeting with stakeholders
        → Flag for audit review
```

### WARNING Escalation Path

```
T+0:    Alert sent to primary recipients
        Channels: Email + Slack

T+24hr: If not acknowledged:
        → Reminder sent
        → Add to weekly review agenda

T+72hr: If not resolved:
        → Escalate to supervisor
        → Include in next executive summary
```

---

## Recipient Configuration

### Role-Based Distribution Lists

```typescript
interface RecipientRole {
  role: string;
  minTrustState: 'INTERNAL' | 'CLIENT' | 'EXECUTIVE';
  severities: ('CRITICAL' | 'WARNING' | 'INFO')[];
  channels: ('EMAIL' | 'SLACK' | 'SMS')[];
  batchMode: boolean;
}

const defaultRoles: RecipientRole[] = [
  {
    role: 'CFO',
    minTrustState: 'EXECUTIVE',
    severities: ['CRITICAL'],
    channels: ['EMAIL', 'SLACK', 'SMS'],
    batchMode: false
  },
  {
    role: 'BUDGET_DIRECTOR',
    minTrustState: 'CLIENT',
    severities: ['CRITICAL', 'WARNING'],
    channels: ['EMAIL', 'SLACK'],
    batchMode: false
  },
  {
    role: 'FINANCIAL_ANALYST',
    minTrustState: 'INTERNAL',
    severities: ['CRITICAL', 'WARNING', 'INFO'],
    channels: ['EMAIL'],
    batchMode: true
  },
  {
    role: 'PROCUREMENT_OFFICER',
    minTrustState: 'INTERNAL',
    severities: ['CRITICAL', 'WARNING'],
    channels: ['EMAIL', 'SLACK'],
    batchMode: false
  }
];
```

### Agency-Specific Overrides

```typescript
interface AgencyNotificationConfig {
  agencyCode: string;
  criticalThresholdMultiplier: number;  // Adjust sensitivity
  warningThresholdMultiplier: number;
  additionalRecipients: string[];
  excludedAnomalyTypes: string[];
  customChannels: {
    slackWebhook?: string;
    teamsWebhook?: string;
    smsGateway?: string;
  };
}
```

---

## Batching Strategy

### Daily Digest (WARNING + INFO)

**Sent at**: 6:00 AM local time

**Format**:
```
PRISM Daily Intelligence Summary - January 19, 2026

ATTENTION REQUIRED (2 items):
• WARNING: HHS spending 34% above baseline
• WARNING: VA vendor concentration at 45%

FOR YOUR AWARENESS (5 items):
• INFO: DOD Q2 forecast updated
• INFO: Treasury narrative promoted to EXECUTIVE
• INFO: 3 anomalies auto-dismissed (below threshold)
• INFO: Weekly aggregation complete
• INFO: New recipient added to distribution

📊 Full dashboard: prism.agency.gov/dashboard
```

### Weekly Summary (INFO only, unless unacknowledged)

**Sent at**: Monday 8:00 AM local time

**Format**:
```
PRISM Weekly Intelligence Summary - Week of January 13, 2026

PORTFOLIO HEALTH SCORE: 87/100 (Good)

KEY METRICS:
• Total Obligations: $47.2B (+23% YoY)
• Active Anomalies: 3 (0 critical, 2 warning, 1 info)
• Forecast Accuracy: 94.2%
• Trust State Activity: 12 promotions

UNRESOLVED ITEMS (carry-forward):
• WARNING: HHS spending anomaly (5 days open)

TOP RECOMMENDATIONS:
1. Review DISA vendor concentration
2. Investigate timing pattern at DOD
3. Update Q3 forecast assumptions

📄 Executive Summary PDF: [Download]
```

---

## Audit & Compliance

### Required Logging Fields

Every notification must log:

```typescript
interface NotificationAuditRecord {
  notificationId: string;
  timestamp: Date;

  // Content
  type: string;
  severity: string;
  sourceId: string;  // Anomaly ID, Narrative ID, etc.

  // Routing
  recipientId: string;
  recipientType: 'USER' | 'ROLE' | 'DISTRIBUTION_LIST';
  channel: string;
  trustStateRequired: string;

  // Delivery
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;

  // Response
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  actionTaken?: string;
}
```

### Compliance Reports

Monthly compliance report includes:

1. **Notification Volume by Severity**
2. **Mean Time to Acknowledge (MTTA)** by severity
3. **Escalation Rate** - % that required escalation
4. **False Positive Rate** - % marked as false positive
5. **Channel Effectiveness** - Acknowledgment rate by channel
6. **SLA Compliance** - % meeting response SLA

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Set up notification queue (Redis/SQS)
- [ ] Implement email sending via SES/SendGrid
- [ ] Create notification log table (see DDL)
- [ ] Build admin UI for recipient management

### Phase 2: Channel Integration
- [ ] Slack webhook integration
- [ ] Microsoft Teams webhook integration
- [ ] SMS gateway integration (Twilio)
- [ ] In-app notification center

### Phase 3: Intelligence Layer
- [ ] Implement batching scheduler
- [ ] Build escalation engine
- [ ] Create digest generation service
- [ ] Add notification preferences UI

### Phase 4: Governance
- [ ] Trust State filtering logic
- [ ] Role-based routing rules
- [ ] Audit log dashboard
- [ ] Compliance reporting

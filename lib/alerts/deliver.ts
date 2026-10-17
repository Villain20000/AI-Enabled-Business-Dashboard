/**
 * Alert notification delivery.
 *
 * Slack uses an incoming webhook. Email is sent to an operator-configured
 * relay endpoint (`ALERT_EMAIL_WEBHOOK_URL`) so the app is not tied to one
 * email vendor; the relay receives a simple JSON payload.
 *
 * @module lib/alerts/deliver
 */

export interface DeliveryResult {
  delivered: boolean;
  skipped?: boolean;
  error?: string;
}

export interface AlertMessage {
  orgName: string;
  kpi: string;
  condition: string;
  threshold: number;
  value: number;
  destination: string;
  channel: 'email' | 'slack';
}

function formatMessage(message: AlertMessage): string {
  return [
    `DataCore AI alert for ${message.orgName}`,
    `${message.kpi} is ${message.value} (condition: ${message.condition} ${message.threshold}).`,
    'Review the dashboard for details.',
  ].join('\n');
}

async function deliverSlack(message: AlertMessage): Promise<DeliveryResult> {
  // Only allow Slack incoming webhooks. Without this check an org admin could
  // use the alert runner as an SSRF proxy against internal services.
  if (!/^https:\/\/hooks\.slack\.com\//.test(message.destination)) {
    return { delivered: false, error: 'Slack destination must be a hooks.slack.com URL' };
  }

  try {
    const res = await fetch(message.destination, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: formatMessage(message) }),
    });
    if (!res.ok) {
      return { delivered: false, error: `Slack returned ${res.status}` };
    }
    return { delivered: true };
  } catch (err) {
    return { delivered: false, error: err instanceof Error ? err.message : 'Slack request failed' };
  }
}

async function deliverEmail(message: AlertMessage): Promise<DeliveryResult> {
  const endpoint = process.env.ALERT_EMAIL_WEBHOOK_URL;
  if (!endpoint) {
    return { delivered: false, skipped: true, error: 'ALERT_EMAIL_WEBHOOK_URL is not configured' };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: message.destination,
        subject: `DataCore AI alert: ${message.kpi}`,
        text: formatMessage(message),
        orgName: message.orgName,
        kpi: message.kpi,
        value: message.value,
        condition: message.condition,
        threshold: message.threshold,
      }),
    });
    if (!res.ok) {
      return { delivered: false, error: `Email relay returned ${res.status}` };
    }
    return { delivered: true };
  } catch (err) {
    return { delivered: false, error: err instanceof Error ? err.message : 'Email relay request failed' };
  }
}

export async function deliverAlert(message: AlertMessage): Promise<DeliveryResult> {
  if (message.channel === 'slack') return deliverSlack(message);
  return deliverEmail(message);
}

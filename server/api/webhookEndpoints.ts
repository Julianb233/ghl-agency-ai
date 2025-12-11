/**
 * Webhook Endpoints
 * Express routes for receiving inbound webhooks
 * These endpoints are public and authenticate via webhook token
 */

import { Router, Request, Response } from "express";
import { webhookReceiverService } from "../services/webhookReceiver.service";

export const webhookEndpointsRouter = Router();

/**
 * Inbound webhook receiver
 * POST /api/webhooks/inbound/:token
 *
 * This endpoint receives messages from:
 * - Twilio SMS webhooks
 * - Email forwarding services
 * - Custom webhook integrations (Zapier, Make, n8n, etc.)
 */
webhookEndpointsRouter.post("/inbound/:token", async (req: Request, res: Response) => {
  const { token } = req.params;
  const headers: Record<string, string> = {};

  // Extract relevant headers
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers[key.toLowerCase()] = value;
    }
  }

  try {
    const result = await webhookReceiverService.processWebhook(
      token,
      req.body,
      headers
    );

    if (!result.success) {
      // Return appropriate error status
      if (result.error === "Webhook not found") {
        return res.status(404).json({ success: false, error: result.error });
      }
      if (result.error === "Authentication failed") {
        return res.status(401).json({ success: false, error: result.error });
      }
      if (result.error === "Webhook is inactive") {
        return res.status(403).json({ success: false, error: result.error });
      }
      return res.status(400).json({ success: false, error: result.error });
    }

    // For Twilio webhooks, return TwiML response
    const contentType = headers["content-type"] || "";
    if (contentType.includes("application/x-www-form-urlencoded") && req.body.AccountSid) {
      // This is likely a Twilio webhook
      res.set("Content-Type", "text/xml");

      if (result.reply) {
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(result.reply)}</Message>
</Response>`);
      }

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`);
    }

    // Standard JSON response
    return res.json({
      success: true,
      messageId: result.messageId,
      taskId: result.taskId,
      conversationId: result.conversationId,
      reply: result.reply,
    });
  } catch (error) {
    console.error("Webhook endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Webhook health check / verification
 * GET /api/webhooks/inbound/:token
 *
 * Used by webhook providers to verify the endpoint is active
 */
webhookEndpointsRouter.get("/inbound/:token", async (req: Request, res: Response) => {
  const { token } = req.params;

  // Simple verification - just check if token format is valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(token)) {
    return res.status(404).json({ success: false, error: "Invalid webhook token" });
  }

  // Return success for verification
  return res.json({
    success: true,
    message: "Webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Twilio webhook status callback
 * POST /api/webhooks/twilio/status/:token
 *
 * Receives delivery status updates from Twilio
 */
webhookEndpointsRouter.post("/twilio/status/:token", async (req: Request, res: Response) => {
  const { token } = req.params;
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

  console.log(`Twilio status update for ${MessageSid}: ${MessageStatus}`);

  // TODO: Update outbound message delivery status

  return res.status(200).send();
});

/**
 * Email webhook receiver (for services like SendGrid, Mailgun, etc.)
 * POST /api/webhooks/email/:token
 */
webhookEndpointsRouter.post("/email/:token", async (req: Request, res: Response) => {
  const { token } = req.params;
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers[key.toLowerCase()] = value;
    }
  }

  try {
    // Transform email payload to standard format
    const emailPayload = {
      messageId: req.body.messageId || req.body["Message-Id"],
      from: req.body.from || req.body.sender || req.body.envelope?.from,
      fromName: req.body.fromName || req.body.from_name,
      to: req.body.to || req.body.recipient || req.body.envelope?.to,
      subject: req.body.subject || req.body.Subject,
      body: req.body.body || req.body.text || req.body["body-plain"],
      bodyHtml: req.body.bodyHtml || req.body.html || req.body["body-html"],
      attachments: req.body.attachments,
    };

    const result = await webhookReceiverService.processWebhook(
      token,
      emailPayload,
      headers
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      messageId: result.messageId,
      taskId: result.taskId,
    });
  } catch (error) {
    console.error("Email webhook error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * Helper function to escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

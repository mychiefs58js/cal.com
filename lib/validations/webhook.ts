import { z } from "zod";

import { WebhookTriggerEvents } from "@calcom/prisma/client";
import { _WebhookModel as Webhook } from "@calcom/prisma/zod";

export const WEBHOOK_TRIGGER_EVENTS = [
  WebhookTriggerEvents.BOOKING_CANCELLED,
  WebhookTriggerEvents.BOOKING_CREATED,
  WebhookTriggerEvents.BOOKING_RESCHEDULED,
] as ["BOOKING_CANCELLED", "BOOKING_CREATED", "BOOKING_RESCHEDULED"];

const schemaWebhookBaseBodyParams = Webhook.pick({
  id: true,
  userId: true,
  eventTypeId: true,
  eventTriggers: true,
  active: true,
  subscriberUrl: true,
  payloadTemplate: true,
}).partial();

export const schemaWebhookCreateParams = z
  .object({
    id: z.string(),
    subscriberUrl: z.string().url(),
    eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array(),
    active: z.boolean(),
    payloadTemplate: z.string().optional().nullable(),
    eventTypeId: z.number().optional(),
    appId: z.string().optional().nullable(),
  })
  .strict();

export const schemaWebhookCreateBodyParams = schemaWebhookBaseBodyParams.merge(schemaWebhookCreateParams);

export const schemaWebhookEditBodyParams = schemaWebhookBaseBodyParams.merge(
  z.object({
    payloadTemplate: z.string().optional(),
    eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
    subscriberUrl: z.string().optional(),
  })
);

export const schemaWebhookReadPublic = Webhook.pick({
  id: true,
  userId: true,
  eventTypeId: true,
  payloadTemplate: true,
  eventTriggers: true,
  // eventType: true,
  // app: true,
  appId: true,
});

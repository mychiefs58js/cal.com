import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { WebhookResponse, WebhooksResponse } from "@lib/types";
import { schemaWebhookBodyParams, schemaWebhookPublic } from "@lib/validations/webhook";

async function createOrlistAllWebhooks(
  { method, body, userId }: NextApiRequest,
  res: NextApiResponse<WebhooksResponse | WebhookResponse>
) {
  if (method === "GET") {
    /**
     * @swagger
     * /hooks:
     *   get:
     *     summary: Find all webhooks
     *     tags:
     *     - hooks
     *     externalDocs:
     *        url: https://docs.cal.com/webhooks
     *     responses:
     *       200:
     *         description: OK
     *       401:
     *        description: Authorization information is missing or invalid.
     *       404:
     *         description: No webhooks were found
     */
    const data = await prisma.webhooks.findMany({ where: { userId } });
    const webhooks = data.map((webhook) => schemaWebhookPublic.parse(webhook));
    if (webhooks) res.status(200).json({ webhooks });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Webhooks were found",
          error,
        });
  } else if (method === "POST") {
    /**
     * @swagger
     * /hooks:
     *   post:
     *     summary: Creates a new webhook
     *     tags:
     *     - webhooks
     *     externalDocs:
     *        url: https://docs.cal.com/webhooks
     *     responses:
     *       201:
     *         description: OK, webhook created
     *       400:
     *        description: Bad request. webhook body is invalid.
     *       401:
     *        description: Authorization information is missing or invalid.
     */
    const safe = schemaWebhookBodyParams.safeParse(body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.webhook.create({ data: { ...safe.data, userId } });
    const webhook = schemaWebhookPublic.parse(data);

    if (data) res.status(201).json({ webhook, message: "Webhook created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new webhook",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllWebhooks);

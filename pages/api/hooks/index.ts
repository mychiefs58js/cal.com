import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { WebhookResponse, WebhooksResponse } from "@lib/types";
import { schemaWebhookCreateBodyParams } from "@lib/validations/webhook";

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
     *     operationId: listWebhooks
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
    const webhooks = await prisma.webhook
      .findMany({ where: { userId } })
      .catch((error) => console.log(error));
    if (!webhooks) {
      console.log();
      res.status(404).json({ message: "No webhooks were found" });
    } else res.status(200).json({ webhooks });
  } else if (method === "POST") {
    /**
     * @swagger
     * /hooks:
     *   post:
     *     summary: Creates a new webhook
     *     operationId: addWebhook
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
    const safe = schemaWebhookCreateBodyParams.safeParse(body);
    if (!safe.success) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }
    if (safe.data.eventTypeId) {
      const team = await prisma.team.findFirst({
        where: {
          eventTypes: {
            some: {
              id: safe.data.eventTypeId,
            },
          },
        },
        include: {
          members: true,
        },
      });

      // Team should be available and the user should be a member of the team
      if (!team?.members.some((membership) => membership.userId === userId)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }
    }
    const data = await prisma.webhook.create({ data: { id: uuidv4(), ...safe.data, userId } });
    if (data) res.status(201).json({ webhook: data, message: "Webhook created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new webhook",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllWebhooks);

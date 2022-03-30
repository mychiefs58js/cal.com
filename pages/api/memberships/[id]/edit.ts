import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Membership } from "@calcom/prisma/client";

import { schemaMembership, withValidMembership } from "@lib/validations/membership";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Membership;
  message?: string;
  error?: unknown;
};

export async function editMembership(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryIdParseInt.safeParse(query);
  const safeBody = await schemaMembership.safeParse(body);

  if (method === "PATCH" && safeQuery.success && safeBody.success) {
    const data = await prisma.membership.update({
      where: { id: safeQuery.data.id },
      data: safeBody.data,
    });
    if (data) res.status(200).json({ data });
    else
      res
        .status(404)
        .json({ message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`, error });

    // Reject any other HTTP method than POST
  } else res.status(405).json({ message: "Only PATCH Method allowed for updating memberships" });
}

export default withValidQueryIdTransformParseInt(withValidMembership(editMembership));

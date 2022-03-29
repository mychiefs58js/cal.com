import prisma from "@calcom/prisma";

import { ApiKey } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaApiKey, withValidApiKey } from "@lib/validations/apiKey";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

type ResponseData = {
  data?: ApiKey;
  message?: string;
  error?: unknown;
};

export async function editApiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryIdAsString.safeParse(query);
  const safeBody = await schemaApiKey.safeParse(body);

  if (safeQuery.success && safeBody.success) {
      const data = await prisma.apiKey.update({
        where: { id: safeQuery.data.id },
        data: safeBody.data,
      })
    if (data) res.status(200).json({ data });
    else (error: unknown) => res.status(404).json({ message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`, error })
  }
}

export default withMiddleware("patchOnly","addRequestId")(
  withValidQueryIdString(
    withValidApiKey(
      editApiKey)
  )
);

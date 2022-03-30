import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { EventTypeCustomInput } from "@calcom/prisma/client";

type ResponseData = {
  data?: EventTypeCustomInput[];
  error?: unknown;
};

export default async function eventTypeCustomInput(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.eventTypeCustomInput.findMany();
  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}

import prisma from "@calcom/prisma";

import { User } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: User[];
  error?: unknown;
};

export default async function user(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.user.findMany();
  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}

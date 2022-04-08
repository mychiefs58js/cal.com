import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { SelectedCalendarResponse, SelectedCalendarsResponse } from "@lib/types";
import {
  schemaSelectedCalendarBodyParams,
  schemaSelectedCalendarPublic,
  withValidSelectedCalendar,
} from "@lib/validations/selected-calendar";

/**
 * @swagger
 * /v1/selected-calendars:
 *   get:
 *     summary: Get all selected calendars
 *     tags:
 *     - selected-calendars
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No selected calendars were found
 *   post:
 *     summary: Creates a new selected calendar
 *     tags:
 *     - selected-calendars
 *     responses:
 *       201:
 *         description: OK, selected calendar created
 *         model: SelectedCalendar
 *       400:
 *        description: Bad request. SelectedCalendar body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createOrlistAllSelectedCalendars(
  req: NextApiRequest,
  res: NextApiResponse<SelectedCalendarsResponse | SelectedCalendarResponse>
) {
  const { method } = req;
  if (method === "GET") {
    const selectedCalendars = await prisma.selectedCalendar.findMany();
    const data = selectedCalendars.map((selectedCalendar) =>
      schemaSelectedCalendarPublic.parse(selectedCalendar)
    );
    if (data) res.status(200).json({ data });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No SelectedCalendars were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaSelectedCalendarBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");

    const selectedCalendar = await prisma.selectedCalendar.create({ data: safe.data });
    const data = schemaSelectedCalendarPublic.parse(selectedCalendar);

    if (data) res.status(201).json({ data, message: "SelectedCalendar created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new selectedCalendar",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(
  withValidSelectedCalendar(createOrlistAllSelectedCalendars)
);

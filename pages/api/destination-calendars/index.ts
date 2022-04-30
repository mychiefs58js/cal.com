import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { DestinationCalendarResponse, DestinationCalendarsResponse } from "@lib/types";
import {
  schemaDestinationCalendarCreateBodyParams,
  schemaDestinationCalendarReadPublic,
} from "@lib/validations/destination-calendar";

async function createOrlistAllDestinationCalendars(
  { method, body, userId }: NextApiRequest,
  res: NextApiResponse<DestinationCalendarsResponse | DestinationCalendarResponse>
) {
  if (method === "GET") {
    /**
     * @swagger
     * /destination-calendars:
     *   get:
     *     summary: Find all destination calendars
     *     tags:
     *     - destination-calendars
     *     responses:
     *       200:
     *         description: OK
     *       401:
     *        description: Authorization information is missing or invalid.
     *       404:
     *         description: No destination calendars were found
     */
    const data = await prisma.destinationCalendar.findMany({ where: { userId } });
    const destination_calendars = data.map((destinationCalendar) =>
      schemaDestinationCalendarReadPublic.parse(destinationCalendar)
    );
    if (data) res.status(200).json({ destination_calendars });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No DestinationCalendars were found",
          error,
        });
  } else if (method === "POST") {
    /**
     * @swagger
     * /destination-calendars:
     *   post:
     *     summary: Creates a new destination calendar
     *     tags:
     *     - destination-calendars
     *     responses:
     *       201:
     *         description: OK, destination calendar created
     *       400:
     *        description: Bad request. DestinationCalendar body is invalid.
     *       401:
     *        description: Authorization information is missing or invalid.
     */
    const safe = schemaDestinationCalendarCreateBodyParams.safeParse(body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.destinationCalendar.create({ data: { ...safe.data, userId } });
    const destination_calendar = schemaDestinationCalendarReadPublic.parse(data);

    if (destination_calendar)
      res.status(201).json({ destination_calendar, message: "DestinationCalendar created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new destinationCalendar",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllDestinationCalendars);

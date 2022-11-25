import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaAttendeeCreateBodyParams, schemaAttendeeReadPublic } from "~/lib/validations/attendee";

/**
 * @swagger
 * /attendees:
 *   post:
 *     operationId: addAttendee
 *     summary: Creates a new attendee
 *     requestBody:
 *       description: Create a new attendee related to one of your bookings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - name
 *               - email
 *               - timeZone
 *             properties:
 *               bookingId:
 *                 type: number
 *                 example: 1
 *               email:
 *                 type: string
 *                 example: email@example.com
 *               name:
 *                 type: string
 *                 example: John Doe
 *               timeZone:
 *                 type: string
 *                 example: Europe/London
 *     tags:
 *     - attendees
 *     responses:
 *       201:
 *         description: OK, attendee created
 *       400:
 *        description: Bad request. Attendee body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const body = schemaAttendeeCreateBodyParams.parse(req.body);

  if (!isAdmin) {
    const userBooking = await prisma.booking.findFirst({
      where: { userId, id: body.bookingId },
      select: { id: true },
    });
    // Here we make sure to only return attendee's of the user's own bookings.
    if (!userBooking) throw new HttpError({ statusCode: 403, message: "Forbidden" });
  }

  const data = await prisma.attendee.create({
    data: {
      email: body.email,
      name: body.name,
      timeZone: body.timeZone,
      booking: { connect: { id: body.bookingId } },
    },
  });

  return {
    attendee: schemaAttendeeReadPublic.parse(data),
    message: "Attendee created successfully",
  };
}

export default defaultResponder(postHandler);

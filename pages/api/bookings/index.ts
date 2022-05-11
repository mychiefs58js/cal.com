import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { BookingResponse, BookingsResponse } from "@lib/types";
import { schemaBookingCreateBodyParams, schemaBookingReadPublic } from "@lib/validations/booking";

async function createOrlistAllBookings(
  { method, body, userId }: NextApiRequest,
  res: NextApiResponse<BookingsResponse | BookingResponse>
) {
  console.log("userIduserId", userId);
  if (method === "GET") {
    /**
     * @swagger
     * /bookings:
     *   get:
     *     summary: Find all bookings
     *     operationId: listBookings
     *     tags:
     *     - bookings
     *     responses:
     *       200:
     *         description: OK
     *       401:
     *        description: Authorization information is missing or invalid.
     *       404:
     *         description: No bookings were found
     */
    const data = await prisma.booking.findMany({ where: { userId } });
    const bookings = data.map((booking) => schemaBookingReadPublic.parse(booking));
    if (bookings) res.status(200).json({ bookings });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Bookings were found",
          error,
        });
  } else if (method === "POST") {
    /**
     * @swagger
     * /bookings:
     *   post:
     *     summary: Creates a new booking
     *     operationId: addBooking
     *     requestBody:
     *       description: Edit an existing booking related to one of your event-types
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *                 example: 15min
     *               startTime:
     *                 type: string
     *                 example: 1970-01-01T17:00:00.000Z
     *               endTime:
     *                 type: string
     *                 example: 1970-01-01T17:00:00.000Z
     *     tags:
     *     - bookings
     *     responses:
     *       201:
     *         description: OK, booking created
     *       400:
     *        description: Bad request. Booking body is invalid.
     *       401:
     *        description: Authorization information is missing or invalid.
     */
    const safe = schemaBookingCreateBodyParams.safeParse(body);
    if (!safe.success) {
      console.log(safe.error);
      res.status(400).json({ message: "Bad request. Booking body is invalid." });
      return;
      // throw new Error("Invalid request body");
    }
    safe.data.userId = userId;
    const data = await prisma.booking.create({ data: { ...safe.data } });
    const booking = schemaBookingReadPublic.parse(data);

    if (booking) res.status(201).json({ booking, message: "Booking created successfully" });
    else
      (error: Error) => {
        console.log(error);
        res.status(400).json({
          message: "Could not create new booking",
          error,
        });
      };
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllBookings);

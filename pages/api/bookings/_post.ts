import type { NextApiRequest } from "next";

import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { defaultResponder } from "@calcom/lib/server";

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Creates a new booking
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     operationId: addBooking
 *     requestBody:
 *       description: Create a new booking related to one of your event-types
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventTypeId
 *               - start
 *               - end
 *               - name
 *               - email
 *               - timeZone
 *               - language
 *               - metadata
 *               - customInputs
 *               - location
 *             properties:
 *               eventTypeId:
 *                 type: integer
 *                 description: 'ID of the event type to book'
 *               start:
 *                 type: string
 *                 format: date-time
 *                 description: 'Start time of the Event'
 *               end:
 *                 type: string
 *                 format: date-time
 *                 description: 'End time of the Event'
 *               name:
 *                 type: string
 *                 description: 'Name of the Attendee'
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 'Email ID of the Attendee'
 *               timeZone:
 *                 type: string
 *                 description: 'TimeZone of the Attendee'
 *               language:
 *                 type: string
 *                 description: 'Language of the Attendee'
 *               metadata:
 *                 type: object
 *                 properties: {}
 *                 description: 'Any metadata associated with the booking'
 *               customInputs:
 *                 type: array
 *                 items: {}
 *               location:
 *                 type: string
 *                 description: 'Meeting location'
 *               title:
 *                 type: string
 *                 description: 'Booking event title'
 *               recurringEventId:
 *                 type: integer
 *                 description: 'Recurring event ID if the event is recurring'
 *               description:
 *                 type: string
 *                 description: 'Event description'
 *               status:
 *                 type: string
 *                 description: 'Acceptable values one of ["ACCEPTED", "PENDING", "CANCELLED", "REJECTED"]'
 *               seatsPerTimeSlot:
 *                 type: integer
 *                 description: 'The number of seats for each time slot'
 *               seatsShowAttendees:
 *                 type: boolean
 *                 description: 'Share Attendee information in seats'
 *               smsReminderNumber:
 *                 type: number
 *                 description: 'SMS reminder number'
 *            examples:
 *              New Booking example:
 *                value:
 *                  {
 *                     "eventTypeId": 1,
 *                     "start": "2023-05-01T14:00:00Z",
 *                     "end": "2023-05-01T15:00:00Z",
 *                     "name": "John Doe",
 *                     "email": "john.doe@example.com",
 *                     "timeZone": "America/New_York",
 *                     "language": "en-US",
 *                     "metadata": {},
 *                     "customInputs": [],
 *                     "location": "Conference Room A"
 *                  }
 *
 *     tags:
 *       - bookings
 *     responses:
 *       201:
 *         description: Booking(s) created successfully.
 *       400:
 *         description: |
 *           Bad request
 *           <table>
 *             <tr>
 *               <td>Message</td>
 *               <td>Cause</td>
 *             </tr>
 *             <tr>
 *               <td>Booking body is invalid</td>
 *               <td>Missing property on booking entity.</td>
 *             </tr>
 *             <tr>
 *               <td>Invalid eventTypeId</td>
 *               <td>The provided eventTypeId does not exist.</td>
 *             </tr>
 *             <tr>
 *               <td>Missing recurringCount</td>
 *               <td>The eventType is recurring, and no recurringCount was passed.</td>
 *             </tr>
 *             <tr>
 *               <td>Invalid recurringCount</td>
 *               <td>The provided recurringCount is greater than the eventType recurring config</td>
 *             </tr>
 *           </table>
 *       401:
 *         description: Authorization information is missing or invalid.
 */
async function handler(req: NextApiRequest) {
  const { userId, isAdmin } = req;
  if (isAdmin) req.userId = req.body.userId || userId;
  const booking = await handleNewBooking(req);
  return booking;
}

export default defaultResponder(handler);

import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { CalendarEvent, getBusyCalendarTimes } from "@lib/calendarClient";
import { v5 as uuidv5 } from "uuid";
import short from "short-uuid";
import { getBusyVideoTimes } from "@lib/videoClient";
import EventAttendeeMail from "../../../lib/emails/EventAttendeeMail";
import { getEventName } from "@lib/event";
import { LocationType } from "@lib/location";
import merge from "lodash.merge";
import dayjs from "dayjs";
import logger from "../../../lib/logger";
import EventManager, { EventResult } from "@lib/events/EventManager";
import { User } from "@prisma/client";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import dayjsBusinessDays from "dayjs-business-days";

dayjs.extend(dayjsBusinessDays);
dayjs.extend(utc);
dayjs.extend(timezone);

const translator = short();
const log = logger.getChildLogger({ prefix: ["[api] book:user"] });

function isAvailable(busyTimes, time, length) {
  // Check for conflicts
  let t = true;

  if (Array.isArray(busyTimes) && busyTimes.length > 0) {
    busyTimes.forEach((busyTime) => {
      const startTime = dayjs(busyTime.start);
      const endTime = dayjs(busyTime.end);

      // Check if start times are the same
      if (dayjs(time).format("HH:mm") == startTime.format("HH:mm")) {
        t = false;
      }

      // Check if time is between start and end times
      if (dayjs(time).isBetween(startTime, endTime)) {
        t = false;
      }

      // Check if slot end time is between start and end time
      if (dayjs(time).add(length, "minutes").isBetween(startTime, endTime)) {
        t = false;
      }

      // Check if startTime is between slot
      if (startTime.isBetween(dayjs(time), dayjs(time).add(length, "minutes"))) {
        t = false;
      }
    });
  }

  return t;
}

function isOutOfBounds(
  time: dayjs.ConfigType,
  { periodType, periodDays, periodCountCalendarDays, periodStartDate, periodEndDate, timeZone }
): boolean {
  const date = dayjs(time);

  switch (periodType) {
    case "rolling": {
      const periodRollingEndDay = periodCountCalendarDays
        ? dayjs().tz(timeZone).add(periodDays, "days").endOf("day")
        : dayjs().tz(timeZone).businessDaysAdd(periodDays, "days").endOf("day");
      return date.endOf("day").isAfter(periodRollingEndDay);
    }

    case "range": {
      const periodRangeStartDay = dayjs(periodStartDate).tz(timeZone).endOf("day");
      const periodRangeEndDay = dayjs(periodEndDate).tz(timeZone).endOf("day");
      return date.endOf("day").isBefore(periodRangeStartDay) || date.endOf("day").isAfter(periodRangeEndDay);
    }

    case "unlimited":
    default:
      return false;
  }
}

interface GetLocationRequestFromIntegrationRequest {
  location: string;
}

const getLocationRequestFromIntegration = ({ location }: GetLocationRequestFromIntegrationRequest) => {
  if (location === LocationType.GoogleMeet.valueOf()) {
    const requestId = uuidv5(location, uuidv5.URL);

    return {
      conferenceData: {
        createRequest: {
          requestId: requestId,
        },
      },
      location,
    };
  } else if (location === LocationType.Zoom.valueOf()) {
    const requestId = uuidv5(location, uuidv5.URL);

    return {
      conferenceData: {
        createRequest: {
          requestId: requestId,
        },
      },
      location,
    };
  }

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { user } = req.query;
  log.debug(`Booking ${user} started`);

  try {
    const isTimeInPast = (time) => {
      return dayjs(time).isBefore(new Date(), "day");
    };

    if (isTimeInPast(req.body.start)) {
      const error = {
        errorCode: "BookingDateInPast",
        message: "Attempting to create a meeting in the past.",
      };

      log.error(`Booking ${user} failed`, error);
      return res.status(400).json(error);
    }

    let currentUser: User = await prisma.user.findFirst({
      where: {
        username: user,
      },
      select: {
        id: true,
        credentials: true,
        timeZone: true,
        email: true,
        name: true,
      },
    });

    const selectedCalendars = await prisma.selectedCalendar.findMany({
      where: {
        userId: currentUser.id,
      },
    });

    const hasCalendarIntegrations =
      currentUser.credentials.filter((cred) => cred.type.endsWith("_calendar")).length > 0;
    const hasVideoIntegrations =
      currentUser.credentials.filter((cred) => cred.type.endsWith("_video")).length > 0;

    const calendarAvailability = await getBusyCalendarTimes(
      currentUser.credentials,
      dayjs(req.body.start).startOf("day").utc().format(),
      dayjs(req.body.end).endOf("day").utc().format(),
      selectedCalendars
    );
    const videoAvailability = await getBusyVideoTimes(currentUser.credentials);
    let commonAvailability = [];

    if (hasCalendarIntegrations && hasVideoIntegrations) {
      commonAvailability = calendarAvailability.filter((availability) =>
        videoAvailability.includes(availability)
      );
    } else if (hasVideoIntegrations) {
      commonAvailability = videoAvailability;
    } else if (hasCalendarIntegrations) {
      commonAvailability = calendarAvailability;
    }

    // Now, get the newly stored credentials (new refresh token for example).
    currentUser = await prisma.user.findFirst({
      where: {
        username: user,
      },
      select: {
        id: true,
        credentials: true,
        timeZone: true,
        email: true,
        name: true,
      },
    });

    // Initialize EventManager with credentials
    const eventManager = new EventManager(currentUser.credentials);
    const rescheduleUid = req.body.rescheduleUid;

    const selectedEventType = await prisma.eventType.findFirst({
      where: {
        userId: currentUser.id,
        id: req.body.eventTypeId,
      },
      select: {
        eventName: true,
        title: true,
        length: true,
        periodType: true,
        periodDays: true,
        periodStartDate: true,
        periodEndDate: true,
        periodCountCalendarDays: true,
      },
    });

    const rawLocation = req.body.location;

    let evt: CalendarEvent = {
      type: selectedEventType.title,
      title: getEventName(req.body.name, selectedEventType.title, selectedEventType.eventName),
      description: req.body.notes,
      startTime: req.body.start,
      endTime: req.body.end,
      organizer: { email: currentUser.email, name: currentUser.name, timeZone: currentUser.timeZone },
      attendees: [{ email: req.body.email, name: req.body.name, timeZone: req.body.timeZone }],
    };

    // If phone or inPerson use raw location
    // set evt.location to req.body.location
    if (!rawLocation?.includes("integration")) {
      evt.location = rawLocation;
    }

    // If location is set to an integration location
    // Build proper transforms for evt object
    // Extend evt object with those transformations
    if (rawLocation?.includes("integration")) {
      const maybeLocationRequestObject = getLocationRequestFromIntegration({
        location: rawLocation,
      });

      evt = merge(evt, maybeLocationRequestObject);
    }

    const eventType = await prisma.eventType.findFirst({
      where: {
        userId: currentUser.id,
        title: evt.type,
      },
      select: {
        id: true,
      },
    });

    let isAvailableToBeBooked = true;

    try {
      isAvailableToBeBooked = isAvailable(commonAvailability, req.body.start, selectedEventType.length);
    } catch {
      log.debug({
        message: "Unable set isAvailableToBeBooked. Using true. ",
      });
    }

    if (!isAvailableToBeBooked) {
      const error = {
        errorCode: "BookingUserUnAvailable",
        message: `${currentUser.name} is unavailable at this time.`,
      };

      log.debug(`Booking ${user} failed`, error);
      return res.status(400).json(error);
    }

    let timeOutOfBounds = false;

    try {
      timeOutOfBounds = isOutOfBounds(req.body.start, {
        periodType: selectedEventType.periodType,
        periodDays: selectedEventType.periodDays,
        periodEndDate: selectedEventType.periodEndDate,
        periodStartDate: selectedEventType.periodStartDate,
        periodCountCalendarDays: selectedEventType.periodCountCalendarDays,
        timeZone: currentUser.timeZone,
      });
    } catch {
      log.debug({
        message: "Unable set timeOutOfBounds. Using false. ",
      });
    }

    if (timeOutOfBounds) {
      const error = {
        errorCode: "BookingUserUnAvailable",
        message: `${currentUser.name} is unavailable at this time.`,
      };

      log.debug(`Booking ${user} failed`, error);
      return res.status(400).json(error);
    }

    let results: Array<EventResult> = [];
    let referencesToCreate = [];

    if (rescheduleUid) {
      // Reschedule event
      const booking = await prisma.booking.findFirst({
        where: {
          uid: rescheduleUid,
        },
        select: {
          id: true,
          references: {
            select: {
              id: true,
              type: true,
              uid: true,
            },
          },
        },
      });

      // Use EventManager to conditionally use all needed integrations.
      results = await eventManager.update(evt, booking);

      if (results.length > 0 && results.every((res) => !res.success)) {
        const error = {
          errorCode: "BookingReschedulingMeetingFailed",
          message: "Booking Rescheduling failed",
        };

        log.error(`Booking ${user} failed`, error, results);
        return res.status(500).json(error);
      }

      // Clone elements
      referencesToCreate = [...booking.references];

      // Now we can delete the old booking and its references.
      const bookingReferenceDeletes = prisma.bookingReference.deleteMany({
        where: {
          bookingId: booking.id,
        },
      });
      const attendeeDeletes = prisma.attendee.deleteMany({
        where: {
          bookingId: booking.id,
        },
      });
      const bookingDeletes = prisma.booking.delete({
        where: {
          uid: rescheduleUid,
        },
      });

      await Promise.all([bookingReferenceDeletes, attendeeDeletes, bookingDeletes]);
    } else {
      // Use EventManager to conditionally use all needed integrations.
      results = await eventManager.create(evt);

      if (results.length > 0 && results.every((res) => !res.success)) {
        const error = {
          errorCode: "BookingCreatingMeetingFailed",
          message: "Booking failed",
        };

        log.error(`Booking ${user} failed`, error, results);
        return res.status(500).json(error);
      }

      referencesToCreate = results.map((result) => {
        return {
          type: result.type,
          uid: result.createdEvent.id.toString(),
        };
      });
    }

    const hashUID =
      results.length > 0 ? results[0].uid : translator.fromUUID(uuidv5(JSON.stringify(evt), uuidv5.URL));
    // TODO Should just be set to the true case as soon as we have a "bare email" integration class.
    // UID generation should happen in the integration itself, not here.
    if (results.length === 0) {
      // Legacy as well, as soon as we have a separate email integration class. Just used
      // to send an email even if there is no integration at all.
      try {
        const mail = new EventAttendeeMail(evt, hashUID);
        await mail.sendEmail();
      } catch (e) {
        log.error("Sending legacy event mail failed", e);
        log.error(`Booking ${user} failed`);
        res.status(500).json({ message: "Booking failed" });
        return;
      }
    }

    try {
      await prisma.booking.create({
        data: {
          uid: hashUID,
          userId: currentUser.id,
          references: {
            create: referencesToCreate,
          },
          eventTypeId: eventType.id,
          title: evt.title,
          description: evt.description,
          startTime: evt.startTime,
          endTime: evt.endTime,
          attendees: {
            create: evt.attendees,
          },
        },
      });
    } catch (e) {
      log.error(`Booking ${user} failed`, "Error when saving booking to db", e);
      res.status(500).json({ message: "Booking already exists" });
      return;
    }

    log.debug(`Booking ${user} completed`);
    return res.status(204).json({ message: "Booking completed" });
  } catch (reason) {
    log.error(`Booking ${user} failed`, reason);
    return res.status(500).json({ message: "Booking failed for some unknown reason" });
  }
}

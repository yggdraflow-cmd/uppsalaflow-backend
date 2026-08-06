import { AppointmentStatus } from "@prisma/client";

export type AppointmentDisplayStatus =
  | AppointmentStatus
  | "PENDING_UPDATE";

type GetAppointmentDisplayStatusInput = {
  date: Date | string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  now?: Date;
};

const terminalStatuses = new Set<AppointmentStatus>([
  AppointmentStatus.FINISHED,
  AppointmentStatus.CANCELED,
  AppointmentStatus.NO_SHOW,
]);

function getDateOnly(date: Date | string) {
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }

  return date.slice(0, 10);
}

function getSaoPauloDateTime(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

export function getAppointmentDisplayStatus({
  date,
  startTime,
  endTime,
  status,
  now = new Date(),
}: GetAppointmentDisplayStatusInput): AppointmentDisplayStatus {
  if (terminalStatuses.has(status)) {
    return status;
  }

  const appointmentDate = getDateOnly(date);
  const current = getSaoPauloDateTime(now);

  const appointmentEnded =
    current.date > appointmentDate ||
    (current.date === appointmentDate && current.time >= endTime);

  if (appointmentEnded) {
    return "PENDING_UPDATE";
  }

  const appointmentIsHappening =
    current.date === appointmentDate &&
    current.time >= startTime &&
    current.time < endTime;

  if (appointmentIsHappening) {
    return AppointmentStatus.IN_PROGRESS;
  }

  return status;
}

function getDateOnly(date: Date | string) {
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }

  return date.split("T")[0];
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

export function getSaoPauloDateTime(now = new Date()) {
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

export function isAppointmentStartInPast(
  date: Date | string,
  startTime: string,
  now = new Date()
) {
  const appointmentDate = getDateOnly(date);
  const current = getSaoPauloDateTime(now);

  if (appointmentDate < current.date) {
    return true;
  }

  if (appointmentDate > current.date) {
    return false;
  }

  return timeToMinutes(startTime) <= timeToMinutes(current.time);
}

import type { AppLocale } from "@/lib/i18n/locales";

type NotificationLike = {
  title: string;
  body: string;
};

const titleTranslations: Record<string, { en: string; es: string }> = {
  "Account created and teacher assigned": {
    en: "Account created and teacher assigned",
    es: "Cuenta creada y docente asignado",
  },
  "Cuenta creada y docente asignado": {
    en: "Account created and teacher assigned",
    es: "Cuenta creada y docente asignado",
  },
  "Teacher account created": {
    en: "Teacher account created",
    es: "Cuenta docente creada",
  },
  "Cuenta docente creada": {
    en: "Teacher account created",
    es: "Cuenta docente creada",
  },
  "Teacher assignment updated": {
    en: "Teacher assignment updated",
    es: "Docente asignado actualizado",
  },
  "Docente asignado actualizado": {
    en: "Teacher assignment updated",
    es: "Docente asignado actualizado",
  },
  "New message": {
    en: "New message",
    es: "Nuevo mensaje",
  },
  "Nuevo mensaje": {
    en: "New message",
    es: "Nuevo mensaje",
  },
  "New reschedule request": {
    en: "New reschedule request",
    es: "Nueva solicitud de reagendación",
  },
  "Nueva solicitud de reagendación": {
    en: "New reschedule request",
    es: "Nueva solicitud de reagendación",
  },
  "Class change approved": {
    en: "Class change approved",
    es: "Cambio de clase aprobado",
  },
  "Cambio de clase aprobado": {
    en: "Class change approved",
    es: "Cambio de clase aprobado",
  },
  "Class change rejected": {
    en: "Class change rejected",
    es: "Cambio de clase rechazado",
  },
  "Cambio de clase rechazado": {
    en: "Class change rejected",
    es: "Cambio de clase rechazado",
  },
  "New weekly video": {
    en: "New weekly video",
    es: "Nuevo video semanal",
  },
  "Nuevo video semanal": {
    en: "New weekly video",
    es: "Nuevo video semanal",
  },
  "Your video was reviewed": {
    en: "Your video was reviewed",
    es: "Tu video fue revisado",
  },
  "Tu video fue revisado": {
    en: "Your video was reviewed",
    es: "Tu video fue revisado",
  },
  "Class completed": {
    en: "Class completed",
    es: "Clase completada",
  },
  "Clase completada": {
    en: "Class completed",
    es: "Clase completada",
  },
  "Class marked as no-show": {
    en: "Class marked as no-show",
    es: "Clase marcada como ausencia",
  },
  "Class marked as absent": {
    en: "Class marked as absent",
    es: "Clase marcada como ausencia",
  },
  "Clase marcada como ausencia": {
    en: "Class marked as absent",
    es: "Clase marcada como ausencia",
  },
  "Class cancelled": {
    en: "Class cancelled",
    es: "Clase cancelada",
  },
  "Clase cancelada": {
    en: "Class cancelled",
    es: "Clase cancelada",
  },
  "Class needs rescheduling": {
    en: "Class needs rescheduling",
    es: "Clase pendiente de reagendar",
  },
  "Clase pendiente de reagendar": {
    en: "Class needs rescheduling",
    es: "Clase pendiente de reagendar",
  },
  "New recurring classes": {
    en: "New recurring classes",
    es: "Nuevas clases recurrentes",
  },
  "Nuevas clases recurrentes": {
    en: "New recurring classes",
    es: "Nuevas clases recurrentes",
  },
  "Recurring series paused": {
    en: "Recurring series paused",
    es: "Serie recurrente pausada",
  },
  "Serie recurrente pausada": {
    en: "Recurring series paused",
    es: "Serie recurrente pausada",
  },
  "Recurring series deleted": {
    en: "Recurring series deleted",
    es: "Serie recurrente eliminada",
  },
  "Serie recurrente eliminada": {
    en: "Recurring series deleted",
    es: "Serie recurrente eliminada",
  },
  "New lesson note": {
    en: "New lesson note",
    es: "Nueva nota de clase",
  },
  "Nueva nota de clase": {
    en: "New lesson note",
    es: "Nueva nota de clase",
  },
  "Your progress report is ready": {
    en: "Your progress report is ready",
    es: "Tu reporte de progreso está listo",
  },
  "Tu reporte de progreso está listo": {
    en: "Your progress report is ready",
    es: "Tu reporte de progreso está listo",
  },
  "New class booked": {
    en: "New class booked",
    es: "Nueva clase agendada",
  },
  "Nueva clase agendada": {
    en: "New class booked",
    es: "Nueva clase agendada",
  },
  "New class on your schedule": {
    en: "New class on your schedule",
    es: "Nueva clase en tu agenda",
  },
  "Nueva clase en tu agenda": {
    en: "New class on your schedule",
    es: "Nueva clase en tu agenda",
  },
  "Class request approved": {
    en: "Class request approved",
    es: "Solicitud de clase aprobada",
  },
  "Solicitud de clase aprobada": {
    en: "Class request approved",
    es: "Solicitud de clase aprobada",
  },
  "Class request rejected": {
    en: "Class request rejected",
    es: "Solicitud de clase rechazada",
  },
  "Solicitud de clase rechazada": {
    en: "Class request rejected",
    es: "Solicitud de clase rechazada",
  },
  "Class approved on schedule": {
    en: "Class approved on schedule",
    es: "Clase aprobada en agenda",
  },
  "Clase aprobada en agenda": {
    en: "Class approved on schedule",
    es: "Clase aprobada en agenda",
  },
  "New class request": {
    en: "New class request",
    es: "Nueva solicitud de clase",
  },
  "Nueva solicitud de clase": {
    en: "New class request",
    es: "Nueva solicitud de clase",
  },
  "Pending class request": {
    en: "Pending class request",
    es: "Solicitud de clase pendiente",
  },
  "Solicitud de clase pendiente": {
    en: "Pending class request",
    es: "Solicitud de clase pendiente",
  },
  "Reminder: your class is tomorrow": {
    en: "Reminder: your class is tomorrow",
    es: "Recordatorio: tienes clase mañana",
  },
  "Recordatorio: tienes clase mañana": {
    en: "Reminder: your class is tomorrow",
    es: "Recordatorio: tienes clase mañana",
  },
  "Reminder: your class starts soon": {
    en: "Reminder: your class starts soon",
    es: "Recordatorio: tu clase empieza pronto",
  },
  "Recordatorio: tu clase empieza pronto": {
    en: "Reminder: your class starts soon",
    es: "Recordatorio: tu clase empieza pronto",
  },
};

const exactBodyTranslations: Record<string, { en: string; es: string }> = {
  "Your teacher profile is now active in Harmonizing.": {
    en: "Your teacher profile is now active in Harmonizing.",
    es: "Tu perfil docente ya está activo en Harmonizing.",
  },
  "Tu perfil docente ya está activo en Harmonizing.": {
    en: "Your teacher profile is now active in Harmonizing.",
    es: "Tu perfil docente ya está activo en Harmonizing.",
  },
  "A student proposed a new time.": {
    en: "A student proposed a new time.",
    es: "Un estudiante propuso un nuevo horario.",
  },
  "Un estudiante propuso un nuevo horario.": {
    en: "A student proposed a new time.",
    es: "Un estudiante propuso un nuevo horario.",
  },
  "Your new time is confirmed.": {
    en: "Your new time is confirmed.",
    es: "Tu nuevo horario está confirmado.",
  },
  "Tu nuevo horario está confirmado.": {
    en: "Your new time is confirmed.",
    es: "Tu nuevo horario está confirmado.",
  },
  "We kept your original time.": {
    en: "We kept your original time.",
    es: "Mantuvimos tu horario original.",
  },
  "Mantuvimos tu horario original.": {
    en: "We kept your original time.",
    es: "Mantuvimos tu horario original.",
  },
  "You now have feedback from your teacher.": {
    en: "You now have feedback from your teacher.",
    es: "Ya tienes comentarios de tu docente.",
  },
  "Ya tienes comentarios de tu docente.": {
    en: "You now have feedback from your teacher.",
    es: "Ya tienes comentarios de tu docente.",
  },
  "Your teacher added progress notes.": {
    en: "Your teacher added progress notes.",
    es: "Tu docente agregó notas de progreso.",
  },
  "Tu docente agregó notas de progreso.": {
    en: "Your teacher added progress notes.",
    es: "Tu docente agregó notas de progreso.",
  },
  "Contact your teacher to reschedule.": {
    en: "Contact your teacher to reschedule.",
    es: "Contacta a tu docente para reagendar.",
  },
  "Contacta a tu docente para reagendar.": {
    en: "Contact your teacher to reschedule.",
    es: "Contacta a tu docente para reagendar.",
  },
  "Your teacher added a lesson note and new practice guidance.": {
    en: "Your teacher added a lesson note and new practice guidance.",
    es: "Tu docente agregó una nota de clase y nuevas indicaciones de práctica.",
  },
  "Tu docente agregó una nota de clase y nuevas indicaciones de práctica.": {
    en: "Your teacher added a lesson note and new practice guidance.",
    es: "Tu docente agregó una nota de clase y nuevas indicaciones de práctica.",
  },
  "Your teacher recorded the absence. Contact the academy if you need support.": {
    en: "Your teacher recorded the absence. Contact the academy if you need support.",
    es: "Tu docente registró la ausencia. Contacta a la academia si necesitas apoyo.",
  },
  "Tu docente registró la ausencia. Contacta a la academia si necesitas apoyo.": {
    en: "Your teacher recorded the absence. Contact the academy if you need support.",
    es: "Tu docente registró la ausencia. Contacta a la academia si necesitas apoyo.",
  },
  "Your teacher updated a class as cancelled.": {
    en: "Your teacher updated a class as cancelled.",
    es: "Tu docente actualizó el estado de una clase como cancelada.",
  },
  "Tu docente actualizó el estado de una clase como cancelada.": {
    en: "Your teacher updated a class as cancelled.",
    es: "Tu docente actualizó el estado de una clase como cancelada.",
  },
  "Your teacher marked a class as needing rescheduling.": {
    en: "Your teacher marked a class as needing rescheduling.",
    es: "Tu docente marcó una clase como pendiente de reagendar.",
  },
  "Tu docente marcó una clase como pendiente de reagendar.": {
    en: "Your teacher marked a class as needing rescheduling.",
    es: "Tu docente marcó una clase como pendiente de reagendar.",
  },
  "Your teacher stopped the upcoming classes in this series.": {
    en: "Your teacher stopped the upcoming classes in this series.",
    es: "Tu docente detuvo las próximas clases de esta serie.",
  },
  "Tu docente detuvo las próximas clases de esta serie.": {
    en: "Your teacher stopped the upcoming classes in this series.",
    es: "Tu docente detuvo las próximas clases de esta serie.",
  },
  "Your teacher deleted a pending class series.": {
    en: "Your teacher deleted a pending class series.",
    es: "Tu docente eliminó una serie de clases pendiente.",
  },
  "Tu docente eliminó una serie de clases pendiente.": {
    en: "Your teacher deleted a pending class series.",
    es: "Tu docente eliminó una serie de clases pendiente.",
  },
  "Your teacher updated your progress.": {
    en: "Your teacher updated your progress.",
    es: "Tu docente actualizó tu progreso.",
  },
  "Tu docente actualizó tu progreso.": {
    en: "Your teacher updated your progress.",
    es: "Tu docente actualizó tu progreso.",
  },
  "You can now review the monthly summary, grade, and next focus areas.": {
    en: "You can now review the monthly summary, grade, and next focus areas.",
    es: "Ya puedes revisar el resumen mensual, calificación y próximos enfoques.",
  },
  "Ya puedes revisar el resumen mensual, calificación y próximos enfoques.": {
    en: "You can now review the monthly summary, grade, and next focus areas.",
    es: "Ya puedes revisar el resumen mensual, calificación y próximos enfoques.",
  },
  "Your academy booked a one-time class.": {
    en: "Your academy booked a one-time class.",
    es: "Tu academia agendó una clase individual.",
  },
  "Tu academia agendó una clase individual.": {
    en: "Your academy booked a one-time class.",
    es: "Tu academia agendó una clase individual.",
  },
  "Your new class is confirmed.": {
    en: "Your new class is confirmed.",
    es: "Tu nueva clase quedó confirmada.",
  },
  "Tu nueva clase quedó confirmada.": {
    en: "Your new class is confirmed.",
    es: "Tu nueva clase quedó confirmada.",
  },
  "Your teacher kept the current schedule.": {
    en: "Your teacher kept the current schedule.",
    es: "Tu docente mantuvo la agenda actual.",
  },
  "Tu docente mantuvo la agenda actual.": {
    en: "Your teacher kept the current schedule.",
    es: "Tu docente mantuvo la agenda actual.",
  },
};

export function localizeNotificationCopy(notification: NotificationLike, locale: AppLocale): NotificationLike {
  return {
    title: titleTranslations[notification.title]?.[locale] ?? notification.title,
    body: localizeBody(notification.body, locale),
  };
}

function localizeBody(body: string, locale: AppLocale) {
  const exact = exactBodyTranslations[body]?.[locale];
  if (exact) return exact;

  const accountCreated = matchEither(
    body,
    /^Your Harmonizing account is active\. Assigned teacher: (.+)\.$/,
    /^Tu cuenta de Harmonizing está activa\. Docente asignado: (.+)\.$/,
  );
  if (accountCreated) {
    return locale === "es"
      ? `Tu cuenta de Harmonizing está activa. Docente asignado: ${accountCreated}.`
      : `Your Harmonizing account is active. Assigned teacher: ${accountCreated}.`;
  }

  const assignedTeacher = matchEither(
    body,
    /^Your assigned teacher is now (.+)\.$/,
    /^Tu docente asignado ahora es (.+)\.$/,
  );
  if (assignedTeacher) {
    return locale === "es"
      ? `Tu docente asignado ahora es ${assignedTeacher}.`
      : `Your assigned teacher is now ${assignedTeacher}.`;
  }

  const uploadedVideo = matchEither(
    body,
    /^(.+) uploaded a new practice video\.$/,
    /^(.+) subió un nuevo video de práctica\.$/,
  );
  if (uploadedVideo) {
    return locale === "es"
      ? `${uploadedVideo} subió un nuevo video de práctica.`
      : `${uploadedVideo} uploaded a new practice video.`;
  }

  const recurringClasses = matchEither(
    body,
    /^Your teacher scheduled (.+) class\(es\) in a new series\.$/,
    /^Tu docente programó (.+) clase\(s\) en una nueva serie\.$/,
  );
  if (recurringClasses) {
    return locale === "es"
      ? `Tu docente programó ${recurringClasses} clase(s) en una nueva serie.`
      : `Your teacher scheduled ${recurringClasses} class(es) in a new series.`;
  }

  const classWithStudent = matchEither(
    body,
    /^A class with (.+) was booked\.$/,
    /^Se agendó una clase con (.+)\.$/,
  );
  if (classWithStudent) {
    return locale === "es"
      ? `Se agendó una clase con ${classWithStudent}.`
      : `A class with ${classWithStudent} was booked.`;
  }

  const classConfirmed = matchEither(
    body,
    /^Class confirmed with (.+)\.$/,
    /^Clase confirmada con (.+)\.$/,
  );
  if (classConfirmed) {
    return locale === "es"
      ? `Clase confirmada con ${classConfirmed}.`
      : `Class confirmed with ${classConfirmed}.`;
  }

  const oneTimeRequest = matchEither(
    body,
    /^(.+) requested a one-time class\.$/,
    /^(.+) solicitó una clase individual\.$/,
  );
  if (oneTimeRequest) {
    return locale === "es"
      ? `${oneTimeRequest} solicitó una clase individual.`
      : `${oneTimeRequest} requested a one-time class.`;
  }

  const classRequest = matchEither(
    body,
    /^(.+) requested a class\.$/,
    /^(.+) solicitó una clase\.$/,
  );
  if (classRequest) {
    return locale === "es"
      ? `${classRequest} solicitó una clase.`
      : `${classRequest} requested a class.`;
  }

  const classReminder = matchEither(
    body,
    /^Your class is scheduled for (.+)\.$/,
    /^Tu clase está programada para (.+)\.$/,
  );
  if (classReminder) {
    return locale === "es"
      ? `Tu clase está programada para ${classReminder}.`
      : `Your class is scheduled for ${classReminder}.`;
  }

  return body;
}

function matchEither(value: string, first: RegExp, second: RegExp) {
  return first.exec(value)?.[1] ?? second.exec(value)?.[1] ?? null;
}

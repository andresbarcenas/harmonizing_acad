export const DEFAULT_CONSENT_VERSION = "privacy-media-consent-v1";

export const DEFAULT_CONSENT_TITLE_EN = "Privacy, Media, and Electronic Signature Consent";
export const DEFAULT_CONSENT_TITLE_ES = "Consentimiento de privacidad, medios y firma electrónica";

export const DEFAULT_CONSENT_BODY_EN = [
  "Harmonizing Academy provides online and in-person music education services. To operate the academy portal, coordinate classes, and support student progress, Harmonizing Academy collects and stores account information, class schedules, teacher assignments, messages, notifications, billing plan details, lesson notes, practice assignments, practice logs, repertoire information, progress reports, and uploaded files.",
  "Practice videos, images, audio, song sheets, profile images, written notes, and teacher feedback may include a student's image, voice, musical performance, or personal learning information. These materials are used for teaching, review, progress tracking, class preparation, student support, and academy administration.",
  "Harmonizing Academy does not sell student practice videos or learning records. Access is limited to the student's account, assigned teachers, and authorized administrators according to their roles in the academy portal. Some service providers, such as hosting, database, file storage, and email delivery providers, may process information only as needed to operate the service.",
  "The parent or legal guardian signing this consent confirms that they are authorized to consent for the student account, including collection and use of student information and practice media for academy operations. The signer also acknowledges that the academy may send electronic records, notices, and a PDF copy of this signed consent by email.",
  "The signer may contact Harmonizing Academy to request help reviewing account information, correcting inaccurate information, requesting deletion where legally and operationally possible, withdrawing consent for future collection, or requesting a paper copy of this consent. Withdrawal may limit or stop access to features that require video, communication, progress tracking, or account records.",
  "By typing the full legal name below and submitting this form, the signer agrees that the typed name and generated signature preview are an electronic signature for this consent record. The signer confirms they can access and keep electronic records, including the emailed PDF copy.",
].join("\n\n");

export const DEFAULT_CONSENT_BODY_ES = [
  "Harmonizing Academy ofrece servicios de educación musical en línea y presenciales. Para operar el portal de la academia, coordinar clases y apoyar el progreso del estudiante, Harmonizing Academy recopila y guarda información de cuenta, horarios de clase, asignaciones docentes, mensajes, notificaciones, detalles del plan de facturación, notas de clase, tareas de práctica, registros de práctica, repertorio, reportes de progreso y archivos subidos.",
  "Los videos de práctica, imágenes, audio, partituras, fotos de perfil, notas escritas y comentarios docentes pueden incluir la imagen, voz, interpretación musical o información personal de aprendizaje del estudiante. Estos materiales se usan para enseñanza, revisión, seguimiento del progreso, preparación de clases, apoyo al estudiante y administración de la academia.",
  "Harmonizing Academy no vende videos de práctica ni registros de aprendizaje del estudiante. El acceso se limita a la cuenta del estudiante, docentes asignados y administradores autorizados según sus roles dentro del portal. Algunos proveedores de servicio, como hosting, base de datos, almacenamiento de archivos y entrega de emails, pueden procesar información solo cuando sea necesario para operar el servicio.",
  "La madre, padre o tutor legal que firma este consentimiento confirma que tiene autorización para consentir en nombre de la cuenta del estudiante, incluyendo la recopilación y uso de información del estudiante y medios de práctica para la operación de la academia. La persona firmante también reconoce que la academia puede enviar registros electrónicos, avisos y una copia PDF de este consentimiento firmado por email.",
  "La persona firmante puede contactar a Harmonizing Academy para solicitar ayuda revisando información de la cuenta, corrigiendo información inexacta, solicitando eliminación cuando sea legal y operativamente posible, retirando el consentimiento para recopilaciones futuras o solicitando una copia impresa de este consentimiento. Retirar el consentimiento puede limitar o detener el acceso a funciones que requieren video, comunicación, seguimiento de progreso o registros de cuenta.",
  "Al escribir el nombre legal completo abajo y enviar este formulario, la persona firmante acepta que el nombre escrito y la vista de firma generada son una firma electrónica para este registro de consentimiento. La persona firmante confirma que puede acceder y conservar registros electrónicos, incluyendo la copia PDF enviada por email.",
].join("\n\n");

export function defaultConsentDocumentData() {
  return {
    version: DEFAULT_CONSENT_VERSION,
    titleEn: DEFAULT_CONSENT_TITLE_EN,
    titleEs: DEFAULT_CONSENT_TITLE_ES,
    bodyEn: DEFAULT_CONSENT_BODY_EN,
    bodyEs: DEFAULT_CONSENT_BODY_ES,
    active: true,
  };
}

export const skillInstruments = ["GENERAL", "PIANO", "VOICE"] as const;

export type SkillInstrument = (typeof skillInstruments)[number];

const defaultSkillCategoryRows = [
  ["GENERAL", "Rhythm", "Pulso interno, subdivisión y estabilidad rítmica.", "Ritmo"],
  ["GENERAL", "Ear training", "Escucha activa, afinación relativa y reconocimiento musical.", "Entrenamiento auditivo"],
  ["GENERAL", "Music theory", "Lenguaje musical, armonía básica y comprensión de estructura.", "Teoría musical"],
  ["GENERAL", "Practice discipline", "Hábitos de estudio, constancia y preparación semanal.", "Disciplina de práctica"],
  ["PIANO", "Timing / metronome", "Uso del metrónomo y precisión de tempo.", "Tiempo / metrónomo"],
  ["PIANO", "Note reading", "Lectura de notas y reconocimiento en el teclado.", "Lectura de notas"],
  ["PIANO", "Sight reading", "Lectura a primera vista.", "Lectura a primera vista"],
  ["PIANO", "Hand coordination", "Coordinación entre manos y control simultáneo.", "Coordinación de manos"],
  ["PIANO", "Left/right hand independence", "Independencia entre mano izquierda y derecha.", "Independencia mano izquierda/derecha"],
  ["PIANO", "Scales", "Escalas, digitación y regularidad técnica.", "Escalas"],
  ["PIANO", "Chords", "Acordes, inversiones y progresiones.", "Acordes"],
  ["PIANO", "Technique", "Control técnico, relajación y articulación.", "Técnica"],
  ["PIANO", "Dynamics", "Control de volumen, contraste y matices.", "Dinámica"],
  ["PIANO", "Expression", "Fraseo, intención musical y sensibilidad.", "Expresión"],
  ["PIANO", "Posture", "Postura corporal, manos y ergonomía.", "Postura"],
  ["PIANO", "Repertoire/song mastery", "Dominio de canciones y piezas asignadas.", "Dominio de repertorio/canción"],
  ["VOICE", "Pitch accuracy", "Afinación y precisión melódica.", "Afinación"],
  ["VOICE", "Breath control", "Respiración, soporte y control del aire.", "Control de respiración"],
  ["VOICE", "Vocal tone", "Color, claridad y estabilidad del sonido.", "Tono vocal"],
  ["VOICE", "Range", "Extensión vocal cómoda y saludable.", "Rango vocal"],
  ["VOICE", "Support", "Apoyo diafragmático y sostén de frases.", "Apoyo"],
  ["VOICE", "Diction", "Claridad de pronunciación e intención textual.", "Dicción"],
  ["VOICE", "Performance confidence", "Seguridad escénica y presencia.", "Confianza al presentar"],
  ["VOICE", "Warmup discipline", "Rutina de calentamiento y cuidado vocal.", "Disciplina de calentamiento"],
  ["VOICE", "Song interpretation", "Interpretación, emoción y narrativa.", "Interpretación de canción"],
  ["VOICE", "Stage presence", "Comunicación escénica y confianza corporal.", "Presencia escénica"],
] as const satisfies ReadonlyArray<readonly [SkillInstrument, string, string, string]>;

export const defaultSkillCategories = defaultSkillCategoryRows.map(([instrument, name, description], index) => ({
  instrument,
  name,
  description,
  sortOrder: index + 1,
}));

const spanishDefaultSkillNames = new Map(
  defaultSkillCategoryRows.map(([, name, , spanishName]) => [name.toLowerCase(), spanishName]),
);

export function getSkillDisplayName(name: string, locale?: string | null) {
  if (locale !== "es") return name;
  return spanishDefaultSkillNames.get(name.trim().toLowerCase()) ?? name;
}

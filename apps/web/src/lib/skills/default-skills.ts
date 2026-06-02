export const skillInstruments = ["GENERAL", "PIANO", "VOICE"] as const;

export type SkillInstrument = (typeof skillInstruments)[number];

const defaultSkillCategoryRows = [
  ["GENERAL", "Rhythm", "Pulso interno, subdivisión y estabilidad rítmica."],
  ["GENERAL", "Ear training", "Escucha activa, afinación relativa y reconocimiento musical."],
  ["GENERAL", "Music theory", "Lenguaje musical, armonía básica y comprensión de estructura."],
  ["GENERAL", "Practice discipline", "Hábitos de estudio, constancia y preparación semanal."],
  ["PIANO", "Timing / metronome", "Uso del metrónomo y precisión de tempo."],
  ["PIANO", "Note reading", "Lectura de notas y reconocimiento en el teclado."],
  ["PIANO", "Sight reading", "Lectura a primera vista."],
  ["PIANO", "Hand coordination", "Coordinación entre manos y control simultáneo."],
  ["PIANO", "Left/right hand independence", "Independencia entre mano izquierda y derecha."],
  ["PIANO", "Scales", "Escalas, digitación y regularidad técnica."],
  ["PIANO", "Chords", "Acordes, inversiones y progresiones."],
  ["PIANO", "Technique", "Control técnico, relajación y articulación."],
  ["PIANO", "Dynamics", "Control de volumen, contraste y matices."],
  ["PIANO", "Expression", "Fraseo, intención musical y sensibilidad."],
  ["PIANO", "Posture", "Postura corporal, manos y ergonomía."],
  ["PIANO", "Repertoire/song mastery", "Dominio de canciones y piezas asignadas."],
  ["VOICE", "Pitch accuracy", "Afinación y precisión melódica."],
  ["VOICE", "Breath control", "Respiración, soporte y control del aire."],
  ["VOICE", "Vocal tone", "Color, claridad y estabilidad del sonido."],
  ["VOICE", "Range", "Extensión vocal cómoda y saludable."],
  ["VOICE", "Support", "Apoyo diafragmático y sostén de frases."],
  ["VOICE", "Diction", "Claridad de pronunciación e intención textual."],
  ["VOICE", "Performance confidence", "Seguridad escénica y presencia."],
  ["VOICE", "Warmup discipline", "Rutina de calentamiento y cuidado vocal."],
  ["VOICE", "Song interpretation", "Interpretación, emoción y narrativa."],
  ["VOICE", "Stage presence", "Comunicación escénica y confianza corporal."],
] as const satisfies ReadonlyArray<readonly [SkillInstrument, string, string]>;

export const defaultSkillCategories = defaultSkillCategoryRows.map(([instrument, name, description], index) => ({
  instrument,
  name,
  description,
  sortOrder: index + 1,
}));

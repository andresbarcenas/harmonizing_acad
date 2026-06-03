# Resumen Ejecutivo: Implementación De Wompi Para Pagos

## Resumen Para La Dueña

La recomendación es implementar **Wompi como método principal de pago en línea** para las facturas de Harmonizing Academy, especialmente porque el negocio opera desde Colombia.

Esto permitiría que familias en **Colombia, Estados Unidos y Europa** paguen directamente desde la factura, sin depender de procesos manuales como Xoom, depósitos o transferencias difíciles de rastrear.

La idea no es reemplazar de inmediato todos los métodos actuales, sino agregar una opción más profesional, segura y fácil de administrar:

- La factura se genera desde Harmonizing.
- La familia recibe la factura con un botón de pago.
- Wompi procesa el pago.
- Harmonizing registra el estado del pago, la referencia y el monto.
- La app no guarda tarjetas, cuentas bancarias ni datos financieros sensibles.

## Cómo Funcionaría

### Clientes En Colombia

Los clientes en Colombia podrían pagar usando los medios disponibles en Wompi, como:

- Tarjetas débito o crédito.
- PSE, si está habilitado.
- Nequi, Bancolombia u otros métodos disponibles según el plan configurado.
- Link de pago compartido desde la factura, correo o WhatsApp.

Para clientes colombianos, esto sería una mejora frente a transferencias manuales porque el pago quedaría más ordenado y conectado con la factura.

### Clientes En Estados Unidos

Actualmente algunos clientes en Estados Unidos usan Xoom para enviar dinero directamente. Ese proceso funciona, pero tiene varias desventajas:

- Es manual.
- Puede ser lento.
- Es más difícil reconciliar el pago con una factura específica.
- La familia tiene que salir del flujo normal de la app.
- El negocio necesita confirmar manualmente cuándo llegó el dinero.

Con Wompi, los clientes en Estados Unidos podrían pagar con tarjeta internacional desde un link de pago. El cliente pagaría en línea y su banco haría la conversión de moneda correspondiente si aplica.

### Clientes En Europa

Para clientes en Europa, el flujo sería similar al de Estados Unidos:

- La familia recibe la factura.
- Abre el link de pago.
- Paga con tarjeta internacional.
- El banco del cliente maneja la conversión de moneda.
- Harmonizing registra el pago asociado a la factura.

Esto permitiría manejar clientes internacionales sin crear procesos diferentes por país.

## Beneficio Principal

El beneficio más importante es pasar de un proceso manual a un proceso más ordenado y rastreable.

Con Wompi, Harmonizing podría:

- Reducir el uso de Xoom para clientes internacionales.
- Evitar confirmaciones manuales innecesarias.
- Tener mejor trazabilidad entre factura y pago.
- Mejorar la experiencia de las familias.
- Ver más rápido qué facturas están pendientes, pagadas o vencidas.
- Mantener la información financiera sensible fuera de la app.

Aunque Wompi cobra una comisión por transacción, el ahorro en tiempo administrativo, reducción de errores y mejor experiencia del cliente probablemente justifica el costo.

## Costos Estimados De Wompi

Según las tarifas públicas revisadas de Wompi Colombia, el Plan Avanzado muestra una tarifa aproximada de:

**2,65% + $700 COP + IVA por transacción exitosa.**

Wompi también indica que el IVA se calcula sobre la comisión generada por la transacción.

> Nota importante: estas tarifas deben confirmarse directamente con Wompi antes de salir a producción, porque pueden cambiar según el plan, el medio de pago, la negociación comercial o el tipo de cuenta.

### Ejemplos Aproximados

Los siguientes ejemplos usan esta fórmula estimada:

`Comisión = (valor de factura * 2,65% + $700 COP) * 1,19`

| Valor De Factura | Comisión Estimada | Neto Aproximado Recibido | Costo Efectivo Aproximado |
|---:|---:|---:|---:|
| $141.668 COP | $5.301 COP | $136.367 COP | 3,74% |
| $283.336 COP | $9.768 COP | $273.568 COP | 3,45% |
| $566.672 COP | $18.703 COP | $547.969 COP | 3,30% |
| $245.000 COP | $8.559 COP | $236.441 COP | 3,49% |
| $490.000 COP | $16.285 COP | $473.715 COP | 3,32% |

### Consideración Para Clientes Internacionales

Para clientes en Estados Unidos o Europa, puede existir un costo adicional cobrado por el banco del cliente, por ejemplo:

- Comisión por transacción internacional.
- Conversión de moneda.
- Diferencia en la tasa de cambio aplicada por el banco.

Estos cargos normalmente no los controla Harmonizing ni Wompi; dependen del banco o tarjeta del cliente.

## Recomendación De Implementación

### Fase 1: Link De Pago En Facturas

Agregar un botón de **Pagar ahora** en las facturas de Harmonizing.

En esta fase:

- El admin genera la factura en Harmonizing.
- El sistema crea o guarda un link de pago Wompi.
- La familia ve el botón de pago en la factura.
- El correo de factura incluye el link de pago.
- El admin puede seguir registrando pagos manuales si es necesario.

Esta fase reduce rápidamente la dependencia de Xoom y transferencias manuales.

### Fase 2: Seguimiento Del Estado Del Pago

Guardar en Harmonizing información segura del pago:

- Proveedor: Wompi.
- Referencia del pago.
- Estado del pago.
- Monto.
- Fecha.
- Link de pago.

La app no debe guardar datos de tarjetas, cuentas bancarias, CVV, credenciales bancarias ni información sensible del medio de pago.

### Fase 3: Automatización Con Webhooks

Conectar webhooks de Wompi para que la factura se actualice automáticamente cuando el pago sea aprobado.

Esto permitiría:

- Marcar facturas como pagadas automáticamente.
- Crear un registro en el historial de pagos.
- Reducir errores manuales.
- Tener mejor control administrativo.

## Recomendación De Seguridad

La implementación debe seguir un modelo seguro:

- Usar links de pago o checkout hospedado por Wompi.
- No procesar tarjetas directamente dentro de Harmonizing.
- No guardar números de tarjeta, CVV, cuentas bancarias ni credenciales financieras.
- Verificar la firma de los webhooks antes de cambiar el estado de una factura.
- Mantener los comprobantes y facturas protegidos detrás del login.
- Permitir que padres y estudiantes solo vean facturas de sus propios estudiantes vinculados.

Este enfoque mantiene a Harmonizing como sistema de facturación y seguimiento, pero deja el procesamiento financiero sensible en manos del proveedor de pagos.

## Conclusión

Wompi es una buena opción para mejorar el proceso de cobro de Harmonizing porque se alinea con la realidad del negocio: una academia operando desde Colombia con clientes locales e internacionales.

La recomendación es usar Wompi como método principal de pago en línea y mantener transferencias manuales solo como respaldo.

Para clientes en Estados Unidos, esto podría reemplazar gradualmente Xoom con una experiencia más clara:

- Reciben factura.
- Pagan con tarjeta.
- Harmonizing ve el estado del pago.
- La factura queda mejor documentada.

Aunque el costo estimado suele estar alrededor de **3,3% a 3,8%** según el monto de la factura, el beneficio en organización, trazabilidad, experiencia del cliente y reducción de trabajo manual probablemente justifica la inversión.

## Fuentes Consultadas

- [Planes y tarifas de Wompi Colombia](https://wompi.co/es/co/planes-tarifas/)
- [Plan Avanzado Agregador de Wompi](https://wompi.co/es/co/planes-tarifas/plan-avanzado-agregador)
- [Soporte Wompi: planes y tarifas](https://soporte.wompi.co/hc/es-419/articles/360020957133--Cu%C3%A1les-son-los-planes-y-tarifas-que-maneja-la-plataforma-Wompi)
- [Documentación Wompi: links de pago](https://docs.wompi.co/docs/colombia/links-de-pago/)
- [Documentación Wompi: métodos de pago](https://docs.wompi.co/docs/colombia/metodos-de-pago/)

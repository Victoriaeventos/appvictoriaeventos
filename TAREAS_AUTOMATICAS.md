# 📋 Sistema de Tareas Automáticas por Tipo de Evento

## 🎯 ¿Cómo funciona?

Cuando un **Planner** crea un nuevo evento, el sistema **genera automáticamente tareas predefinidas** según el tipo de evento, con fechas calculadas basándose en la fecha de celebración.

### Datos necesarios al crear un evento:
- **Título del evento**
- **Fecha de contratación** (cuando empezó el proyecto)
- **Fecha del evento** (día de la celebración)
- **Tipo de evento** (Boda / Comunión / Corporativo / Otro)

---

## 💍 BODAS (43 tareas automáticas)

### 12-9 meses antes
- ✅ Buscar lugar de la ceremonia y celebración
- ✅ Ceremonia civil - Inf. papeles, permisos
- ✅ Iniciar expediente matrimonial R.C.
- ✅ Definir tema de boda
- ✅ Buscar fotógrafo y video
- ✅ Primera lista de invitados
- ✅ Elegir espacio y cerrar fecha de boda

### 9-6 meses antes
- ✅ Planear luna de miel
- ✅ Empezar selección de catering
- ✅ Escoger fotógrafo de la boda
- ✅ Establecer presupuesto definitivo
- ✅ Elegir trajes de novios
- ✅ Definir tipo de banquete y cronograma
- ✅ Ver con Veronica proyecto decorativo y proveedores
- ✅ Empezar a mirar invitaciones (ideas)
- ✅ Buscar posibles alojamientos para invitados

### 6-3 meses antes
- ✅ Dejar definida la decoración de la boda
- ✅ Elegir damas de honor y testigos
- ✅ Seguimiento expediente matrimonial
- ✅ Encargar diseño papelería de boda
- ✅ Elegir detalles para los invitados
- ✅ Organizar transporte para invitados
- ✅ Buscar oficiante de ceremonia
- ✅ Enviar invitaciones
- ✅ Cerrar luna de miel
- ✅ Elegir anillos de boda
- ✅ Prueba de menú con catering cerrado
- ✅ Cerrar alojamientos para invitados

### 2 meses antes
- ✅ Elegir canciones de la boda
- ✅ Preparar entrega de regalos a personas especiales
- ✅ Papeleo listo y revisado
- ✅ Definir lecturas de la ceremonia
- ✅ Realizar sesión pre boda (fotos)

### 1 mes antes
- ✅ Guión de la ceremonia con el oficiante
- ✅ Cerrar lista definitiva de invitados
- ✅ Distribución de mesas
- ✅ Repasar con Victoria Eventos el TIMING completo (3 semanas antes)

### 1 semana antes
- ✅ Repaso de montajes y desmontajes con proveedores

### Días finales
- ✅ Ensayo de ceremonia (2 días antes)
- ✅ Desayunar tranquilos y prepararse (día de la boda)
- ✅ Peluquería y últimos retoques (día de la boda)

---

## 🎂 COMUNIONES (12 tareas automáticas)

### 6-4 meses antes
- ✅ Elegir lugar de la celebración
- ✅ Reservar fotógrafo
- ✅ Elegir traje/vestido del niño/a
- ✅ Contratar catering

### 3-2 meses antes
- ✅ Diseñar invitaciones
- ✅ Elegir decoración y detalles
- ✅ Enviar invitaciones
- ✅ Organizar recordatorios para invitados

### Semanas finales
- ✅ Prueba de menú (6 semanas antes)
- ✅ Confirmar asistencias (4 semanas antes)
- ✅ Última prueba de vestuario (2 semanas antes)
- ✅ Confirmación con proveedores (1 semana antes)

---

## 💼 EVENTOS CORPORATIVOS (12 tareas automáticas)

### 4-3 meses antes
- ✅ Definir objetivos y tipo de evento corporativo
- ✅ Reservar lugar del evento
- ✅ Contratar catering corporativo
- ✅ Organizar equipamiento técnico (AV, sonido)

### 2 meses antes
- ✅ Diseñar programa y agenda del evento
- ✅ Contratar speakers/ponentes si aplica
- ✅ Enviar invitaciones corporativas

### Semanas finales
- ✅ Organizar material corporativo (6 semanas antes)
- ✅ Confirmar asistencias (4 semanas antes)
- ✅ Prueba técnica en el lugar (2 semanas antes)
- ✅ Reunión final con proveedores (1 semana antes)
- ✅ Confirmar logística y timing (3 días antes)

---

## 🔧 Cómo Personalizar las Tareas

### Archivo: `/app/backend/server.py`

Busca las secciones:
- `TASK_TEMPLATES_BODA` (línea ~40)
- `TASK_TEMPLATES_COMUNION`
- `TASK_TEMPLATES_CORPORATIVO`

### Ejemplo de estructura:

```python
{
    "title": "Nombre de la tarea",
    "category": "Categoría",
    "months_before": 6,  # O usa weeks_before o days_before
    "responsible": "Planner"  # O "Pareja"
}
```

### Añadir nueva tarea a bodas:

```python
TASK_TEMPLATES_BODA.append({
    "title": "Contratar seguro para el evento",
    "category": "Legal",
    "months_before": 4,
    "responsible": "Planner"
})
```

### Después de modificar:
```bash
sudo supervisorctl restart backend
```

---

## ✨ Características Clave

✅ **Fecha de contratación registrada**: Sabes cuándo empezó el proyecto
✅ **Tareas específicas por tipo**: Cada evento tiene su checklist optimizado
✅ **43 tareas para bodas**: Lista completa profesional de Victoria Eventos
✅ **12 tareas para comuniones**: Adaptado a celebraciones familiares
✅ **12 tareas para corporativos**: Enfocado en eventos empresariales
✅ **Fechas calculadas automáticamente**: Según la fecha del evento
✅ **Categorías organizadas**: Proveedores, Catering, Decoración, Legal, etc.
✅ **Responsables asignados**: Planner o Pareja

---

## 🎉 Flujo de Trabajo

1. **Planner crea evento**
   - Ingresa título
   - **Fecha de contratación** (hoy o cuando firmaron)
   - **Fecha del evento** (día de la celebración)
   - Selecciona tipo: Boda / Comunión / Corporativo

2. **Sistema calcula fechas**
   - Basándose en la fecha del evento
   - Resta meses/semanas/días según cada tarea

3. **Tareas creadas automáticamente**
   - 43 para bodas
   - 12 para comuniones
   - 12 para corporativos

4. **Gestión de tareas**
   - Planner y Pareja marcan como completadas
   - Pueden editar fechas si necesario
   - Pueden añadir tareas adicionales manualmente

---

## 📝 Ejemplo Real

**Evento:** Boda de Ana y Carlos
**Fecha de contratación:** 5 de diciembre 2024
**Fecha de la boda:** 15 de junio 2025
**Tipo:** Boda

**Tareas generadas automáticamente:**
- "Buscar lugar de ceremonia" → 15 junio 2024 (12 meses antes)
- "Elegir trajes" → 15 diciembre 2024 (7 meses antes)
- "Enviar invitaciones" → 15 marzo 2025 (3 meses antes)
- "Ensayo de ceremonia" → 13 junio 2025 (2 días antes)
- "Desayunar tranquilos" → 15 junio 2025 (día de la boda)

---

## 💡 Ventajas

✅ **Ahorra 1+ hora** por evento (no crear 40+ tareas manualmente)
✅ **Nunca olvidas pasos importantes** (checklist profesional completo)
✅ **Adaptado al tipo de evento** (no las mismas tareas para todo)
✅ **Registro histórico** (fecha de contratación guardada)
✅ **Fechas inteligentes** (calculadas automáticamente)
✅ **Flexible** (editable y personalizable)

---

¿Necesitas añadir más tareas o cambiar las existentes? Edita las plantillas en `/app/backend/server.py` 🎊

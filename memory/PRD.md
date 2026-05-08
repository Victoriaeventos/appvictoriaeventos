# Victoria Eventos - PRD

## Problem Statement
Professional CRM + Planner system for wedding planning company "Victoria Eventos" (Spain). Two roles: Planner/Couple.

## Tech Stack
- Frontend: React + TailwindCSS + Shadcn/UI + jsPDF
- Backend: FastAPI + Motor (MongoDB async)
- Auth: JWT (email/password)
- 3rd Party: OpenAI gpt-image-1 via emergentintegrations
- Drag & Drop: @hello-pangea/dnd

## Implemented Features

### FASE 1: Control Diario (COMPLETE)
- Centro de Mando Dashboard (6 sections)
- Auto-priority system (alta/media/baja)
- 6 task states + filters
- "¿Qué hago hoy?" top 3

### FASE 2: CRM + Planner (COMPLETE)
- Invitados tab hidden (data preserved)
- Centro Documental: 11 categories, file statuses, origins, version tracking, filters
- Task relations: linked to suppliers, budget, files + "Próximo paso"
- Dashboard: separated bloqueos cliente/proveedor + archivos pendientes
- Smart Weekly Summary: 3 prioridades, 3 críticas, bloqueos, pagos, archivos, proveedores
- Auto follow-up task creation (POST /api/automations/run-followups)

### FASE 3: Tareas Automáticas por Servicios (COMPLETE - Feb 2026)
- PLANTILLAS_TAREAS: 62 task templates across 5 services (Asesoría, Coordinación, Decoración, Cartelería, Proveedores)
- offset_pct formula: fecha_limite = fecha_contrato + offset_pct * (fecha_evento - fecha_contrato)
- New task fields: servicio, fase, origen, disparador, offset_pct
- Endpoints: POST /api/events/{id}/generate-tasks, POST /api/events/{id}/recalculate-dates
- TasksModule: 8 filters, service color tags, phase badges, Auto badge, chronological grouping

### Kanban View (COMPLETE - Feb 2026)
- Drag-and-drop Kanban board with 6 columns (Pendiente → Completada)
- Service filter (Todos/Asesoría/Coordinación/Decoración/Cartelería/Proveedores)
- Lista/Kanban toggle
- @hello-pangea/dnd library

### Tab Restructuring (COMPLETE - Feb 2026)
- Removed tabs: Timeline, Presupuesto, Galería
- 6 final tabs: Resumen, Tareas, Proveedores, Notas, Archivos, Semanal
- Overview: Added progress bar + countdown + quick stats
- Proveedores: Merged Budget (totals + items + payments) + Suppliers
- Semanal: Added "Dossier para el Cliente" PDF generation (jsPDF)

### Fase 2 Task Templates (COMPLETE - Feb 2026)
- 91 task templates total across 6 services (87 unique + post-evento tasks)
- offset_pct now uses 0-103 scale (0=contract day, 100=event day, >100=post-event)
- `entregable` field: 59 tasks have deliverables, shown in purple on task cards
- `descripcion` field populated for all tasks
- Post-evento tasks (offset_pct>=100) show "Post-evento" badge instead of "Vencida"
- Client tasks pending >5 days auto-appear in dashboard "Bloqueos por cliente"
- Responsable values: "Victoria Eventos", "Cliente", "Ambos"

### Fase 1 Servicios Update (COMPLETE - Feb 2026)
- 6 services: Asesoría personalizada, Coordinación del evento, Proyecto de decoración, Decoración y Diseño (NEW), Diseño de cartelería y papelería, Gestión de proveedores
- Updated colors: Dorado, Verde, Morado, Naranja, Coral, Azul
- Service filter added to List view (same as Kanban)
- `entregable` field added to task model (for Phase 2)
- New DB field: `service_decoracion_diseno`

### Core (Previously Complete)
- JWT Auth, Event CRUD, Auto-task generation
- Budget, Suppliers, Notes (share), Files
- "Cómo Funciona" tutorial

## Tab Structure (6 tabs)
1. Resumen: Event info, services, progress bar, countdown, quick stats
2. Tareas: List/Kanban views, 8 filters, service tags, auto tasks
3. Proveedores: Budget totals + items + payments + Suppliers list
4. Notas: Internal notes with sharing
5. Archivos: Document hub with categories/statuses
6. Semanal: Weekly summary + PDF dossier for client

## Key Endpoints
- POST/GET /api/auth/register, /api/auth/login
- GET /api/dashboard/command-center, /api/dashboard/stats, /api/reminders
- POST /api/automations/run-followups
- POST /api/events/{id}/generate-tasks
- POST /api/events/{id}/recalculate-dates
- CRUD /api/events, /api/tasks, /api/budget, /api/suppliers, /api/notes
- CRUD /api/files + PUT /api/files/{id}

## Architecture
```
frontend/src/
├── pages/ (Login, Register, PlannerDashboard, CoupleDashboard, EventDetail, HowItWorks)
├── components/modules/ (Overview, Tasks, KanbanView, Suppliers, Notes, Files, WeeklySummary)
```

## Backlog
- P1: Roles y permisos detallados
- P2: Panel de métricas mensual con gráficos de progreso por evento
- P2: Notificaciones email (SendGrid)
- P2: Push notifications
- Refactoring: Break server.py (~1800 lines) into routes/ and models/ folders

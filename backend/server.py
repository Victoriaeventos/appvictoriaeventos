from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'victoria_eventos_db')]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'victoria-eventos-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= PROVEEDORES PREDEFINIDOS =============

PROVEEDORES_FIJOS = [
    {"name": "Wedding Planner", "service_type": "Coordinación", "contact": ""},
    {"name": "Fotógrafo Profesional", "service_type": "Fotografía", "contact": ""},
    {"name": "Videógrafo", "service_type": "Video", "contact": ""},
    {"name": "Catering", "service_type": "Catering", "contact": ""},
    {"name": "Floristería", "service_type": "Decoración Floral", "contact": ""},
    {"name": "Decoración", "service_type": "Decoración", "contact": ""},
    {"name": "DJ / Música", "service_type": "Entretenimiento", "contact": ""},
    {"name": "Oficiante de Ceremonia", "service_type": "Ceremonia", "contact": ""},
    {"name": "Vestido de Novia", "service_type": "Vestimenta", "contact": ""},
    {"name": "Traje de Novio", "service_type": "Vestimenta", "contact": ""},
    {"name": "Joyería", "service_type": "Accesorios", "contact": ""},
    {"name": "Animación Adultos", "service_type": "Entretenimiento", "contact": ""},
    {"name": "Animación Niños", "service_type": "Entretenimiento", "contact": ""},
    {"name": "Transporte Novios", "service_type": "Transporte", "contact": ""},
    {"name": "Transporte Invitados", "service_type": "Transporte", "contact": ""},
    {"name": "Hotel / Alojamiento", "service_type": "Alojamiento", "contact": ""},
    {"name": "Diseñador Gráfico", "service_type": "Papelería", "contact": ""},
    {"name": "Pastelería / Tarta", "service_type": "Catering", "contact": ""},
    {"name": "Peluquería y Maquillaje", "service_type": "Estética", "contact": ""},
]

# ============= PLANTILLAS DE TAREAS POR SERVICIO (FASE 3) =============

PLANTILLAS_TAREAS = {
    "asesoria": [
        {"title": "Envío mensaje de bienvenida oficial y acceso al portal", "descripcion": "Mensaje personalizado de bienvenida al cliente tras la firma.", "entregable": "Mensaje de bienvenida + acceso al portal", "fase": "Bienvenida e inicio", "categoria": "Comunicación", "offset_pct": 0, "responsable": "Victoria Eventos", "disparador": "Contrato firmado"},
        {"title": "Envío del cuestionario profundo de asesoría", "descripcion": "30-40 preguntas: historia de la pareja, qué quieren transmitir, presupuesto real.", "entregable": "Cuestionario de asesoría profunda", "fase": "Bienvenida e inicio", "categoria": "Comunicación", "offset_pct": 5, "responsable": "Cliente", "disparador": "Bienvenida enviada"},
        {"title": "Sesión de sueños — Reunión inicial de asesoría", "descripcion": "La reunión más importante. Se repasa el cuestionario y se descubre la esencia de la boda.", "entregable": "Notas de la sesión + mapa de esencia", "fase": "Bienvenida e inicio", "categoria": "Reunión", "offset_pct": 8, "responsable": "Victoria Eventos", "disparador": "Cuestionario devuelto"},
        {"title": "Elaboración del dossier de concepto y visión", "descripcion": "Documento 15-20 páginas: concepto narrativo, paleta, referencias visuales, estilo.", "entregable": "Dossier de concepto (PDF 15-20 páginas)", "fase": "Concepto creativo", "categoria": "Diseño", "offset_pct": 15, "responsable": "Victoria Eventos", "disparador": "Sesión de sueños realizada"},
        {"title": "Reunión de presentación del concepto", "descripcion": "Se presenta el dossier explicando cada decisión creativa.", "entregable": None, "fase": "Concepto creativo", "categoria": "Reunión", "offset_pct": 20, "responsable": "Victoria Eventos", "disparador": "Dossier listo"},
        {"title": "Ajustes y aprobación del concepto definitivo", "descripcion": "Se incorporan cambios y se cierra el concepto aprobado.", "entregable": "Concepto definitivo aprobado y firmado", "fase": "Concepto creativo", "categoria": "Aprobación", "offset_pct": 23, "responsable": "Cliente", "disparador": "Presentación realizada"},
        {"title": "Calendario de decisiones personalizado", "descripcion": "Documento con todo lo que hay que decidir y cuándo. Cadencia de reuniones.", "entregable": "Calendario de decisiones personalizado", "fase": "Planificación", "categoria": "Planificación", "offset_pct": 28, "responsable": "Victoria Eventos", "disparador": "Concepto aprobado"},
        {"title": "Reunión de seguimiento #1", "descripcion": "Revisión de avances, decisiones y estado emocional de la pareja.", "entregable": "Acta de reunión con acuerdos", "fase": "Planificación", "categoria": "Reunión", "offset_pct": 33, "responsable": "Victoria Eventos", "disparador": "33% del proceso"},
        {"title": "Acompañamiento a visitas clave con proveedores", "descripcion": "Acompaña a citas importantes: finca, catering, fotógrafo.", "entregable": None, "fase": "Desarrollo y decisiones", "categoria": "Acompañamiento", "offset_pct": 40, "responsable": "Ambos", "disparador": "Visita agendada"},
        {"title": "Asesoramiento de presupuesto y negociación", "descripcion": "Revisión del presupuesto global. Negociación con proveedores.", "entregable": "Tabla de presupuesto actualizada", "fase": "Desarrollo y decisiones", "categoria": "Presupuesto", "offset_pct": 50, "responsable": "Victoria Eventos", "disparador": "Nuevo proveedor incorporado"},
        {"title": "Check-in emocional a mitad del proceso", "descripcion": "Reunión no técnica: estado emocional, estrés, cambios de idea.", "entregable": "Resumen de decisiones tomadas", "fase": "Desarrollo y decisiones", "categoria": "Reunión", "offset_pct": 55, "responsable": "Victoria Eventos", "disparador": "50-60% del proceso"},
        {"title": "Reunión de seguimiento #2", "descripcion": "Revisión de proveedores, presupuesto y decisiones pendientes.", "entregable": "Acta de reunión con acuerdos", "fase": "Desarrollo y decisiones", "categoria": "Reunión", "offset_pct": 65, "responsable": "Victoria Eventos", "disparador": "65% del proceso"},
        {"title": "Revisión Todo listo — checklist final", "descripcion": "Repasar estado de proveedores, decisiones, pagos y documentación.", "entregable": "Checklist Todo listo", "fase": "Recta final", "categoria": "Control", "offset_pct": 82, "responsable": "Victoria Eventos", "disparador": "18% antes del evento"},
        {"title": "Dosier final para la pareja", "descripcion": "Manual de la boda: contactos, horarios, pagos, guión del día.", "entregable": "Dosier final completo (PDF)", "fase": "Recta final", "categoria": "Informe", "offset_pct": 90, "responsable": "Victoria Eventos", "disparador": "10% antes del evento"},
        {"title": "Reunión pre-evento — repaso y calma emocional", "descripcion": "Última reunión. Resolución de nervios, confirmación de horarios.", "entregable": None, "fase": "Recta final", "categoria": "Reunión", "offset_pct": 94, "responsable": "Victoria Eventos", "disparador": "1 semana antes"},
        {"title": "Contacto personal post-evento", "descripcion": "Mensaje o llamada 2-3 días después para felicitar.", "entregable": None, "fase": "Post-evento", "categoria": "Comunicación", "offset_pct": 101, "responsable": "Victoria Eventos", "disparador": "2-3 días después"},
        {"title": "Cierre de expediente y solicitud de valoración", "descripcion": "Encuesta de satisfacción. Solicitud de reseña. Cierre del expediente.", "entregable": "Encuesta de satisfacción + cierre", "fase": "Post-evento", "categoria": "Cierre", "offset_pct": 103, "responsable": "Cliente", "disparador": "1 semana después"},
    ],
    "coordinacion": [
        {"title": "Envío de bienvenida y cuestionario de coordinación", "descripcion": "Mensaje de bienvenida y cuestionario: estructura del día, sorpresas, personas clave.", "entregable": "Ficha de briefing de coordinación", "fase": "Inicio y planificación", "categoria": "Comunicación", "offset_pct": 0, "responsable": "Victoria Eventos", "disparador": "Contrato firmado"},
        {"title": "Reunión de coordinación y briefing del día", "descripcion": "Definir estructura del día, momentos clave, sorpresas y necesidades.", "entregable": None, "fase": "Inicio y planificación", "categoria": "Reunión", "offset_pct": 5, "responsable": "Victoria Eventos", "disparador": "Cuestionario devuelto"},
        {"title": "Elaboración del guión del día / minutado", "descripcion": "Documento maestro con todos los tiempos del evento.", "entregable": "Guión del día v1 (borrador)", "fase": "Inicio y planificación", "categoria": "Planificación", "offset_pct": 10, "responsable": "Victoria Eventos", "disparador": "Reunión realizada"},
        {"title": "Visita técnica al espacio del evento", "descripcion": "Visita presencial: accesos, tomas de corriente, zonas de montaje, parking.", "entregable": "Informe de visita técnica", "fase": "Inicio y planificación", "categoria": "Logística", "offset_pct": 15, "responsable": "Victoria Eventos", "disparador": "Guión borrador listo"},
        {"title": "Revisión logística con la finca o espacio", "descripcion": "Confirmar horarios de acceso para montaje, normas del venue.", "entregable": "Acta de revisión con la finca", "fase": "Preparación", "categoria": "Logística", "offset_pct": 30, "responsable": "Victoria Eventos", "disparador": "30% del proceso"},
        {"title": "Coordinación con cada proveedor confirmado", "descripcion": "Contacto individual: tiempos, accesos y necesidades.", "entregable": "Email de coordinación a cada proveedor", "fase": "Preparación", "categoria": "Coordinación", "offset_pct": 60, "responsable": "Victoria Eventos", "disparador": "Proveedores confirmados"},
        {"title": "Guión definitivo — versión final", "descripcion": "Versión definitiva con tiempos confirmados, nombres, teléfonos y plan B.", "entregable": "Guión definitivo del día (PDF)", "fase": "Preparación", "categoria": "Planificación", "offset_pct": 80, "responsable": "Victoria Eventos", "disparador": "20% antes del evento"},
        {"title": "Envío del guión a todos los proveedores", "descripcion": "Cada proveedor recibe su parte del guión con horarios y contacto.", "entregable": "Confirmación de recepción", "fase": "Preparación", "categoria": "Coordinación", "offset_pct": 81, "responsable": "Victoria Eventos", "disparador": "Guión aprobado"},
        {"title": "Reunión final con la pareja — repaso del día", "descripcion": "Repaso del minutado: momentos, sorpresas, discursos, invitados.", "entregable": None, "fase": "Semana previa", "categoria": "Reunión", "offset_pct": 88, "responsable": "Victoria Eventos", "disparador": "12% antes del evento"},
        {"title": "Ensayo de ceremonia (si aplica)", "descripcion": "Protocolo de entrada, posiciones y tiempos con el oficiante.", "entregable": None, "fase": "Semana previa", "categoria": "Ceremonia", "offset_pct": 92, "responsable": "Victoria Eventos", "disparador": "8% antes del evento"},
        {"title": "Llamada de confirmación a todos los proveedores", "descripcion": "Confirmación definitiva: asistencia y horario.", "entregable": "Checklist de confirmaciones — todos OK", "fase": "Semana previa", "categoria": "Coordinación", "offset_pct": 95, "responsable": "Victoria Eventos", "disparador": "3-5 días antes"},
        {"title": "Coordinación presencial — Día del evento", "descripcion": "Presencia física desde montaje hasta el final.", "entregable": None, "fase": "Día del evento", "categoria": "Ejecución", "offset_pct": 99, "responsable": "Victoria Eventos", "disparador": "Fecha del evento"},
        {"title": "Informe post-evento y cierre de expediente", "descripcion": "Resumen del día, incidencias y valoración de proveedores.", "entregable": "Informe post-evento (PDF)", "fase": "Post-evento", "categoria": "Cierre", "offset_pct": 101, "responsable": "Victoria Eventos", "disparador": "3 días después"},
    ],
    "decoracion": [
        {"title": "Reunión de briefing de decoración", "descripcion": "Espacios a decorar, referencias, elementos imprescindibles, presupuesto.", "entregable": "Ficha de briefing de decoración", "fase": "Concepto decorativo", "categoria": "Reunión", "offset_pct": 4, "responsable": "Victoria Eventos", "disparador": "Primeros 10 días"},
        {"title": "Elaboración del mood board y paleta de color", "descripcion": "Tablero profesional: paleta cromática, texturas, flores, mobiliario, iluminación.", "entregable": "Mood board + paleta de color (PDF)", "fase": "Concepto decorativo", "categoria": "Diseño", "offset_pct": 9, "responsable": "Victoria Eventos", "disparador": "Briefing completado"},
        {"title": "Presentación de la propuesta decorativa", "descripcion": "Se presenta el mood board y concepto completo.", "entregable": None, "fase": "Concepto decorativo", "categoria": "Reunión", "offset_pct": 17, "responsable": "Victoria Eventos", "disparador": "Mood board listo"},
        {"title": "Validación y aprobación del concepto decorativo", "descripcion": "La pareja aprueba la dirección del proyecto.", "entregable": "Concept board aprobado y firmado", "fase": "Concepto decorativo", "categoria": "Aprobación", "offset_pct": 22, "responsable": "Cliente", "disparador": "Presentación realizada"},
        {"title": "Diseño detallado de cada espacio", "descripcion": "Plano de planta, centros de mesa, altar, mesa dulce, photocall.", "entregable": "Planos de distribución + fichas por espacio", "fase": "Diseño y desarrollo", "categoria": "Diseño", "offset_pct": 28, "responsable": "Victoria Eventos", "disparador": "Concept aprobado"},
        {"title": "Presentación del diseño completo a la pareja", "descripcion": "Presentación visual de todos los espacios.", "entregable": None, "fase": "Diseño y desarrollo", "categoria": "Reunión", "offset_pct": 39, "responsable": "Victoria Eventos", "disparador": "Diseño finalizado"},
        {"title": "Ajustes y versión final del proyecto", "descripcion": "Incorporación de cambios. Cierre del proyecto definitivo.", "entregable": "Proyecto de decoración definitivo", "fase": "Diseño y desarrollo", "categoria": "Diseño", "offset_pct": 44, "responsable": "Victoria Eventos", "disparador": "Feedback recibido"},
        {"title": "Solicitud de presupuestos a proveedores de decoración", "descripcion": "Precios a floristería, mobiliario, iluminación, telas.", "entregable": "Comparativa de presupuestos", "fase": "Producción", "categoria": "Presupuesto", "offset_pct": 52, "responsable": "Victoria Eventos", "disparador": "Proyecto aprobado"},
        {"title": "Presentación y cierre del presupuesto de decoración", "descripcion": "Presentación desglosada. Aprobación económica.", "entregable": "Presupuesto aprobado y firmado", "fase": "Producción", "categoria": "Aprobación", "offset_pct": 58, "responsable": "Cliente", "disparador": "Presupuestos recibidos"},
        {"title": "Confirmación y pedido de materiales", "descripcion": "Pedidos de flores, mobiliario, iluminación.", "entregable": "Confirmación escrita de cada pedido", "fase": "Producción", "categoria": "Compras", "offset_pct": 63, "responsable": "Victoria Eventos", "disparador": "Presupuesto aprobado"},
        {"title": "Seguimiento del estado de los pedidos", "descripcion": "Verificación de disponibilidad de materiales.", "entregable": None, "fase": "Producción", "categoria": "Control", "offset_pct": 75, "responsable": "Victoria Eventos", "disparador": "25% antes del evento"},
        {"title": "Recepción y revisión de materiales", "descripcion": "Comprobación física: cantidad, calidad, color, estado.", "entregable": "Checklist de recepción de materiales", "fase": "Producción", "categoria": "Control", "offset_pct": 82, "responsable": "Victoria Eventos", "disparador": "18% antes del evento"},
        {"title": "Coordinación del montaje de decoración", "descripcion": "Dirección y supervisión del montaje por espacios.", "entregable": None, "fase": "Ejecución", "categoria": "Montaje", "offset_pct": 97, "responsable": "Victoria Eventos", "disparador": "Día anterior o mañana"},
        {"title": "Revisión final antes de la llegada de invitados", "descripcion": "Recorrido completo, corrección de detalles.", "entregable": "Fotos del montaje terminado", "fase": "Ejecución", "categoria": "Control", "offset_pct": 98, "responsable": "Victoria Eventos", "disparador": "1-2 horas antes"},
        {"title": "Supervisión durante el evento", "descripcion": "Presencia para reponer y mantener la decoración.", "entregable": None, "fase": "Ejecución", "categoria": "Ejecución", "offset_pct": 99, "responsable": "Victoria Eventos", "disparador": "Fecha del evento"},
        {"title": "Desmontaje y recogida post-evento", "descripcion": "Supervisión del desmontaje. Recogida. Devolución del espacio.", "entregable": None, "fase": "Post-evento", "categoria": "Logística", "offset_pct": 101, "responsable": "Victoria Eventos", "disparador": "Día siguiente"},
    ],
    "decoracion_diseno": [
        {"title": "Creación de ficha de cliente y briefing del evento", "descripcion": "Información: tipo de celebración, espacio, personas, estilo, presupuesto.", "entregable": "Ficha de cliente + briefing de decoración", "fase": "Inicio", "categoria": "Comunicación", "offset_pct": 0, "responsable": "Victoria Eventos", "disparador": "Contrato firmado"},
        {"title": "Visita técnica al espacio del evento", "descripcion": "Visita presencial: dimensiones, tomas de corriente, accesos, normas.", "entregable": "Informe de visita técnica con fotos y medidas", "fase": "Inicio", "categoria": "Logística", "offset_pct": 8, "responsable": "Victoria Eventos", "disparador": "Briefing completado"},
        {"title": "Desarrollo del concepto decorativo y mood board", "descripcion": "Propuesta visual: paleta de color, mood board con elementos principales.", "entregable": "Mood board + concepto decorativo (PDF)", "fase": "Propuesta", "categoria": "Diseño", "offset_pct": 18, "responsable": "Victoria Eventos", "disparador": "Visita realizada"},
        {"title": "Presentación y validación de la propuesta", "descripcion": "Se presenta el concepto: qué se decora, cómo queda, qué materiales.", "entregable": "Propuesta aprobada y firmada", "fase": "Propuesta", "categoria": "Aprobación", "offset_pct": 25, "responsable": "Cliente", "disparador": "Propuesta enviada"},
        {"title": "Elaboración del presupuesto detallado", "descripcion": "Presupuesto desglosado: flores, mobiliario, iluminación, transporte, montaje.", "entregable": "Presupuesto desglosado (PDF)", "fase": "Presupuesto", "categoria": "Presupuesto", "offset_pct": 30, "responsable": "Victoria Eventos", "disparador": "Propuesta aprobada"},
        {"title": "Confirmación del servicio y cobro de señal", "descripcion": "Aprobación del presupuesto y pago de señal. Se inicia producción.", "entregable": "Factura de señal + confirmación", "fase": "Presupuesto", "categoria": "Aprobación", "offset_pct": 35, "responsable": "Cliente", "disparador": "Presupuesto enviado"},
        {"title": "Definición y pedido de materiales decorativos", "descripcion": "Lista definitiva y pedidos: flores, mobiliario, velas, telas, especiales.", "entregable": "Listado de materiales confirmado", "fase": "Producción", "categoria": "Compras", "offset_pct": 50, "responsable": "Victoria Eventos", "disparador": "Señal recibida"},
        {"title": "Gestión y seguimiento de proveedores y stock", "descripcion": "Control de pedidos confirmados y en plazo.", "entregable": None, "fase": "Producción", "categoria": "Control", "offset_pct": 70, "responsable": "Victoria Eventos", "disparador": "30% antes del evento"},
        {"title": "Confirmación de logística: horarios, acceso y personal", "descripcion": "Coordinación con venue de horarios de montaje y normas.", "entregable": "Ficha de logística del montaje", "fase": "Coordinación", "categoria": "Logística", "offset_pct": 80, "responsable": "Victoria Eventos", "disparador": "20% antes del evento"},
        {"title": "Preparación del material en almacén", "descripcion": "Revisión de flores, carga, organización y checklist.", "entregable": "Checklist de material preparado y cargado", "fase": "Coordinación", "categoria": "Logística", "offset_pct": 90, "responsable": "Victoria Eventos", "disparador": "Día anterior"},
        {"title": "Montaje de la decoración en el espacio", "descripcion": "Ejecución del montaje completo según concepto aprobado.", "entregable": None, "fase": "Evento", "categoria": "Montaje", "offset_pct": 98, "responsable": "Victoria Eventos", "disparador": "Fecha del evento"},
        {"title": "Supervisión y revisión final antes del evento", "descripcion": "Recorrido completo. Corrección de imperfecciones.", "entregable": "Fotos del montaje terminado (portfolio)", "fase": "Evento", "categoria": "Control", "offset_pct": 99, "responsable": "Victoria Eventos", "disparador": "1-2 horas antes"},
        {"title": "Desmontaje y recogida del material", "descripcion": "Retirada de elementos. Devolución del espacio.", "entregable": None, "fase": "Post-evento", "categoria": "Logística", "offset_pct": 101, "responsable": "Victoria Eventos", "disparador": "Fin del evento o día siguiente"},
        {"title": "Cierre del proyecto y factura final", "descripcion": "Factura final. Pagos. Encuesta. Archivo del expediente.", "entregable": "Factura final + encuesta breve", "fase": "Post-evento", "categoria": "Cierre", "offset_pct": 103, "responsable": "Victoria Eventos", "disparador": "3-5 días después"},
    ],
    "carteleria": [
        {"title": "Reunión de briefing de papelería e identidad visual", "descripcion": "Definición de piezas: invitaciones, menús, seating plan, señalética.", "entregable": "Listado de piezas aprobado con cantidades", "fase": "Briefing de diseño", "categoria": "Reunión", "offset_pct": 5, "responsable": "Victoria Eventos", "disparador": "Primeros 10 días"},
        {"title": "Envío de cuestionario de estilo visual", "descripcion": "La pareja comparte: referencias, colores, tipografías, estilo.", "entregable": "Cuestionario de estilo visual completado", "fase": "Briefing de diseño", "categoria": "Comunicación", "offset_pct": 7, "responsable": "Cliente", "disparador": "Reunión briefing realizada"},
        {"title": "Recopilación de textos e información", "descripcion": "Nombres, fecha, hora, lugar, código de vestimenta, datos RSVP, menú.", "entregable": "Documento de textos revisado y aprobado", "fase": "Briefing de diseño", "categoria": "Comunicación", "offset_pct": 9, "responsable": "Cliente", "disparador": "Cuestionario recibido"},
        {"title": "Primera propuesta de identidad visual e invitación", "descripcion": "Diseño de invitación: monograma, tipografía, composición, paleta.", "entregable": "Primera propuesta (2-3 opciones en PDF)", "fase": "Diseño de invitaciones", "categoria": "Diseño", "offset_pct": 14, "responsable": "Victoria Eventos", "disparador": "Textos recibidos"},
        {"title": "Revisión y feedback del cliente — ronda 1", "descripcion": "El cliente revisa: qué le gusta, qué cambiaría.", "entregable": None, "fase": "Diseño de invitaciones", "categoria": "Aprobación", "offset_pct": 23, "responsable": "Cliente", "disparador": "Propuesta enviada"},
        {"title": "Segunda propuesta con ajustes", "descripcion": "Se incorporan cambios del feedback.", "entregable": "Segunda propuesta de diseño (PDF)", "fase": "Diseño de invitaciones", "categoria": "Diseño", "offset_pct": 29, "responsable": "Victoria Eventos", "disparador": "Feedback recibido"},
        {"title": "Aprobación final del diseño de invitaciones", "descripcion": "Visto bueno definitivo. Archivo para imprenta.", "entregable": "Diseño de invitación aprobado y firmado", "fase": "Diseño de invitaciones", "categoria": "Aprobación", "offset_pct": 36, "responsable": "Cliente", "disparador": "Segunda propuesta entregada"},
        {"title": "Preparación de archivos y envío a imprenta", "descripcion": "Maquetación alta resolución, perfiles de color.", "entregable": "Archivos en alta resolución preparados", "fase": "Producción de invitaciones", "categoria": "Producción", "offset_pct": 41, "responsable": "Victoria Eventos", "disparador": "Diseño aprobado"},
        {"title": "Recepción y control de calidad — invitaciones", "descripcion": "Revisión de color, corte, acabados y textos.", "entregable": "Confirmación de calidad OK", "fase": "Producción de invitaciones", "categoria": "Control", "offset_pct": 50, "responsable": "Victoria Eventos", "disparador": "Plazo de imprenta"},
        {"title": "Diseño de la cartelería del día", "descripcion": "Seating plan, señalética, menús, etiquetas, número de mesa.", "entregable": "Pack completo de cartelería (PDF)", "fase": "Cartelería del día", "categoria": "Diseño", "offset_pct": 55, "responsable": "Victoria Eventos", "disparador": "35% antes del evento"},
        {"title": "Aprobación de la cartelería del día", "descripcion": "Cliente verifica nombres del seating, textos del menú.", "entregable": "Cartelería del día aprobada y firmada", "fase": "Cartelería del día", "categoria": "Aprobación", "offset_pct": 64, "responsable": "Cliente", "disparador": "Cartelería lista"},
        {"title": "Envío a imprenta — cartelería del día", "descripcion": "Archivos y especificaciones técnicas.", "entregable": "Confirmación de pedido de imprenta", "fase": "Cartelería del día", "categoria": "Producción", "offset_pct": 69, "responsable": "Victoria Eventos", "disparador": "Cartelería aprobada"},
        {"title": "Recepción y verificación de cartelería del día", "descripcion": "Control de calidad completo. Preparación para entrega.", "entregable": "Checklist de recepción de cartelería", "fase": "Entrega y supervisión", "categoria": "Control", "offset_pct": 88, "responsable": "Victoria Eventos", "disparador": "12% antes del evento"},
        {"title": "Entrega de cartelería a coordinación", "descripcion": "Entrega física con instrucciones de colocación.", "entregable": "Guía de colocación por espacios", "fase": "Entrega y supervisión", "categoria": "Logística", "offset_pct": 89, "responsable": "Victoria Eventos", "disparador": "Cartelería verificada"},
        {"title": "Supervisión de la colocación el día del evento", "descripcion": "Verificación de que todo está correctamente colocado.", "entregable": "Fotos de verificación", "fase": "Entrega y supervisión", "categoria": "Control", "offset_pct": 99, "responsable": "Victoria Eventos", "disparador": "Durante el montaje"},
    ],
    "proveedores": [
        {"title": "Elaboración del mapa de proveedores necesarios", "descripcion": "Listado completo de proveedores priorizados por urgencia.", "entregable": "Mapa de proveedores con categorías y prioridades", "fase": "Mapeo y búsqueda", "categoria": "Planificación", "offset_pct": 0, "responsable": "Victoria Eventos", "disparador": "Contrato firmado"},
        {"title": "Solicitud urgente: finca y catering", "descripcion": "Contacto con fincas y caterings: disponibilidad, aforo, presupuesto.", "entregable": "Tabla comparativa finca y catering", "fase": "Mapeo y búsqueda", "categoria": "Búsqueda", "offset_pct": 7, "responsable": "Victoria Eventos", "disparador": "Mapa aprobado"},
        {"title": "Solicitud de presupuestos: fotografía y vídeo", "descripcion": "Contacto con 3-5 fotógrafos/videógrafos.", "entregable": "Tabla comparativa foto y vídeo", "fase": "Mapeo y búsqueda", "categoria": "Búsqueda", "offset_pct": 8, "responsable": "Victoria Eventos", "disparador": "Mapa aprobado"},
        {"title": "Solicitud de presupuestos: música", "descripcion": "Grupos en directo, DJ, cuartetos.", "entregable": "Tabla comparativa opciones musicales", "fase": "Mapeo y búsqueda", "categoria": "Búsqueda", "offset_pct": 9, "responsable": "Victoria Eventos", "disparador": "Mapa aprobado"},
        {"title": "Solicitud de presupuestos: resto de proveedores", "descripcion": "Transporte, peluquería, animación, photobooth.", "entregable": "Tabla comparativa resto proveedores", "fase": "Mapeo y búsqueda", "categoria": "Búsqueda", "offset_pct": 10, "responsable": "Victoria Eventos", "disparador": "Completar en 10 días"},
        {"title": "Presentación de opciones con recomendación argumentada", "descripcion": "Para cada categoría: 2-3 opciones con precio, pros/contras.", "entregable": "Dossier de selección con recomendaciones", "fase": "Selección", "categoria": "Propuestas", "offset_pct": 18, "responsable": "Victoria Eventos", "disparador": "Presupuestos recibidos"},
        {"title": "Acompañamiento en visitas o catas clave", "descripcion": "Acompaña a visita finca, cata catering, reunión fotógrafo.", "entregable": None, "fase": "Selección", "categoria": "Acompañamiento", "offset_pct": 22, "responsable": "Ambos", "disparador": "Visita o cata agendada"},
        {"title": "Confirmación de proveedores seleccionados", "descripcion": "El cliente decide. Se procede con contratos.", "entregable": "Listado de proveedores confirmados", "fase": "Selección", "categoria": "Aprobación", "offset_pct": 25, "responsable": "Cliente", "disparador": "Presentación y visitas realizadas"},
        {"title": "Gestión y revisión de contratos", "descripcion": "Revisión de condiciones y cláusulas. Negociación.", "entregable": "Contratos revisados y firmados", "fase": "Contratación", "categoria": "Legal", "offset_pct": 29, "responsable": "Victoria Eventos", "disparador": "Selección confirmada"},
        {"title": "Control de pagos y señales", "descripcion": "Registro de señales: importes, fechas, formas de pago.", "entregable": "Tabla de pagos y vencimientos", "fase": "Contratación", "categoria": "Pagos", "offset_pct": 40, "responsable": "Victoria Eventos", "disparador": "Contrato firmado"},
        {"title": "Reconfirmación de disponibilidad a mitad", "descripcion": "Contacto con todos para reconfirmar disponibilidad.", "entregable": None, "fase": "Seguimiento", "categoria": "Control", "offset_pct": 55, "responsable": "Victoria Eventos", "disparador": "50% del proceso"},
        {"title": "Confirmación final de disponibilidad", "descripcion": "Segunda confirmación definitiva por escrito.", "entregable": "Tabla de confirmaciones de todos", "fase": "Seguimiento", "categoria": "Control", "offset_pct": 72, "responsable": "Victoria Eventos", "disparador": "28% antes del evento"},
        {"title": "Envío de briefing personalizado a cada proveedor", "descripcion": "Dirección, hora, espacio, contacto de coordinadora.", "entregable": "Briefing enviado a cada proveedor", "fase": "Seguimiento", "categoria": "Coordinación", "offset_pct": 82, "responsable": "Victoria Eventos", "disparador": "18% antes del evento"},
        {"title": "Llamada de confirmación final — semana antes", "descripcion": "Contacto directo: todo preparado, sin imprevistos.", "entregable": "Checklist confirmaciones finales — todos OK", "fase": "Seguimiento", "categoria": "Coordinación", "offset_pct": 90, "responsable": "Victoria Eventos", "disparador": "10% antes del evento"},
        {"title": "Gestión de pagos finales y facturas", "descripcion": "Revisión facturas, pagos pendientes.", "entregable": "Cierre económico con todos los proveedores", "fase": "Post-evento", "categoria": "Pagos", "offset_pct": 102, "responsable": "Victoria Eventos", "disparador": "3-5 días después"},
        {"title": "Valoración interna de cada proveedor", "descripcion": "Evaluación: puntualidad, calidad, actitud.", "entregable": "Fichas de valoración actualizadas", "fase": "Post-evento", "categoria": "Cierre", "offset_pct": 103, "responsable": "Victoria Eventos", "disparador": "1 semana después"},
    ],
}

# Mapping de servicio a clave del evento
SERVICE_KEY_MAP = {
    "asesoria": "service_asesoria",
    "coordinacion": "service_coordinacion",
    "decoracion": "service_decoracion",
    "decoracion_diseno": "service_decoracion_diseno",
    "carteleria": "service_carteleria",
    "proveedores": "service_proveedores",
}

SERVICE_LABELS = {
    "asesoria": "Asesoría personalizada",
    "coordinacion": "Coordinación del evento",
    "decoracion": "Proyecto de decoración",
    "decoracion_diseno": "Decoración y Diseño",
    "carteleria": "Diseño de cartelería y papelería",
    "proveedores": "Gestión de proveedores",
}

def calcular_fecha_limite(fecha_contrato: datetime, fecha_evento: datetime, offset_pct: float) -> str:
    """Calcula fecha_limite = fecha_contrato + (offset_pct/100) * (fecha_evento - fecha_contrato)"""
    total_days = (fecha_evento - fecha_contrato).days
    offset_days = int(total_days * offset_pct / 100)
    result = fecha_contrato + timedelta(days=offset_days)
    return result.strftime('%Y-%m-%d')


async def generar_tareas_automaticas(event_id: str, fecha_evento_str: str, fecha_contrato_str: str, services: dict) -> int:
    """Genera tareas automáticas basadas en los servicios contratados usando offset_pct"""
    fecha_contrato = datetime.fromisoformat(fecha_contrato_str) if fecha_contrato_str else datetime.now(timezone.utc)
    fecha_evento = datetime.fromisoformat(fecha_evento_str)

    tasks_to_insert = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for servicio_key, plantillas in PLANTILLAS_TAREAS.items():
        event_field = SERVICE_KEY_MAP.get(servicio_key)
        if not event_field or not services.get(event_field, False):
            continue

        for tpl in plantillas:
            due_date = calcular_fecha_limite(fecha_contrato, fecha_evento, tpl["offset_pct"])

            task = {
                'id': str(uuid.uuid4()),
                'event_id': event_id,
                'title': tpl['title'],
                'description': tpl.get('descripcion', ''),
                'category': tpl['categoria'],
                'due_date': due_date,
                'responsible': tpl['responsable'],
                'status': 'pendiente',
                'priority': 'baja',
                'notes': '',
                'service': '',
                'task_type': '',
                'next_step': '',
                'requires_approval': tpl['categoria'] == 'Aprobación',
                'related_supplier_id': None,
                'related_budget_id': None,
                'related_file_id': None,
                'related_note_id': None,
                'is_auto_followup': False,
                'servicio': servicio_key,
                'fase': tpl['fase'],
                'origen': 'automatica',
                'disparador': tpl['disparador'],
                'offset_pct': tpl['offset_pct'],
                'entregable': tpl.get('entregable'),
                'status_changed_at': now_iso,
                'created_at': now_iso,
            }
            tasks_to_insert.append(task)

    if tasks_to_insert:
        await db.tasks.insert_many(tasks_to_insert)

    return len(tasks_to_insert)

# ============= MODELS =============

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str  # 'planner' or 'pareja'

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    user: User
    token: str

class EventBase(BaseModel):
    title: str
    date: str
    contract_date: Optional[str] = None
    event_type: str  # 'boda', 'comunion', 'corporativo', 'otro'
    status: str = "pending"
    # Información del cliente
    ceremony_type: str = "civil"  # civil o religiosa
    location: str = ""
    client_phone: str = ""
    client_email: str = ""
    # Servicios contratados
    service_asesoria: bool = False
    service_coordinacion: bool = False
    service_decoracion: bool = False
    service_decoracion_diseno: bool = False
    service_proveedores: bool = False
    service_carteleria: bool = False

class EventCreate(EventBase):
    couple_id: Optional[str] = None

class Event(EventBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    planner_id: str
    couple_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskBase(BaseModel):
    title: str
    category: str
    due_date: str
    responsible: str
    status: str = "pendiente"  # pendiente, en_proceso, esperando_cliente, esperando_proveedor, aprobacion_pendiente, completada
    priority: str = "baja"  # alta, media, baja
    notes: str = ""
    status_changed_at: Optional[str] = None  # Track when status changed for auto-priority
    description: str = ""
    service: str = ""
    task_type: str = ""
    next_step: str = ""
    requires_approval: bool = False
    related_supplier_id: Optional[str] = None
    related_budget_id: Optional[str] = None
    related_file_id: Optional[str] = None
    related_note_id: Optional[str] = None
    is_auto_followup: bool = False
    # Phase 3 fields
    servicio: str = ""  # asesoria, coordinacion, decoracion, decoracion_diseno, carteleria, proveedores
    fase: str = ""  # Inicio, Planificación, Seguimiento, etc.
    origen: str = "manual"  # manual, automatica
    disparador: str = ""  # Trigger description
    offset_pct: Optional[float] = None  # 0.0 to 1.0
    entregable: Optional[str] = None  # Deliverable document/result

class TaskCreate(TaskBase):
    event_id: str

class Task(TaskBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GuestBase(BaseModel):
    name: str
    rsvp: str = "pending"  # confirmed, pending, declined
    companions_count: int = 0
    allergies: str = ""

class GuestCreate(GuestBase):
    event_id: str

class Guest(GuestBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierBase(BaseModel):
    name: str
    service_type: str
    contact: str
    booking_status: str = "pending"  # pending, confirmed, cancelled
    notes: str = ""
    price: float = 0.0
    advance_payment: float = 0.0  # Dinero a cuenta

class SupplierCreate(SupplierBase):
    event_id: str

class Supplier(SupplierBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BudgetItemBase(BaseModel):
    category: str
    description: str
    estimated_amount: float
    paid_amount: float = 0.0
    status: str = "pending"  # pending, paid, partial

class BudgetItemCreate(BudgetItemBase):
    event_id: str

class BudgetItem(BudgetItemBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentBase(BaseModel):
    budget_item_id: str
    amount: float
    payment_date: str
    notes: str = ""

class PaymentCreate(PaymentBase):
    event_id: str

class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NoteBase(BaseModel):
    content: str

class NoteCreate(NoteBase):
    event_id: str

class Note(NoteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    author_id: str
    author_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GalleryBase(BaseModel):
    generated_prompt: str

class GalleryCreate(GalleryBase):
    event_id: str

class Gallery(GalleryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    image_base64: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DecorDecisionBase(BaseModel):
    item_name: str
    status: str = "to_decide"  # to_decide, chosen, ordered
    notes: str = ""

class DecorDecisionCreate(DecorDecisionBase):
    event_id: str

class DecorDecision(DecorDecisionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FileBase(BaseModel):
    file_name: str
    file_type: str = "otros"  # documentacion_cliente, listado_invitados, confirmaciones, menus_alergias, seating_plan, proyecto_decoracion, carteleria, contratos, facturas, proveedores, otros
    file_base64: str
    notes: str = ""
    category: str = "otros"
    description: str = ""
    service_related: str = ""
    version: int = 1
    file_status: str = "pendiente_revision"  # pendiente_revision, aprobado, final
    origin: str = "manual"  # email, manual, pendiente_revisar

class FileCreate(FileBase):
    event_id: str

class File(FileBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        email = payload.get("email")
        role = payload.get("role")
        if user_id is None or email is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return {"id": user_id, "email": email, "role": role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Create user
    hashed_password = hash_password(user.password)
    user_obj = User(email=user.email, name=user.name, role=user.role)
    
    doc = user_obj.model_dump()
    doc['password_hash'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    # Create token
    token = create_access_token(user_obj.id, user_obj.email, user_obj.role)
    
    return UserResponse(user=user_obj, token=token)

@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    if not verify_password(credentials.password, user_doc.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    # Convert datetime
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user_obj = User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    token = create_access_token(user_obj.id, user_obj.email, user_obj.role)
    
    return UserResponse(user=user_obj, token=token)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# ============= EVENT ROUTES =============

@api_router.post("/events", response_model=Event)
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "planner":
        raise HTTPException(status_code=403, detail="Solo los planners pueden crear eventos")
    
    event_obj = Event(
        **event.model_dump(),
        planner_id=current_user["id"]
    )
    
    doc = event_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.events.insert_one(doc)
    
    # Generar tareas automáticas por servicios contratados
    try:
        services = {
            'service_asesoria': event_obj.service_asesoria,
            'service_coordinacion': event_obj.service_coordinacion,
            'service_decoracion': event_obj.service_decoracion,
            'service_decoracion_diseno': event_obj.service_decoracion_diseno,
            'service_proveedores': event_obj.service_proveedores,
            'service_carteleria': event_obj.service_carteleria,
        }
        has_services = any(services.values())
        if has_services:
            tasks_created = await generar_tareas_automaticas(
                event_obj.id,
                event_obj.date,
                event_obj.contract_date or datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                services
            )
            logger.info(f"Creadas {tasks_created} tareas automáticas para evento {event_obj.id}")
        else:
            logger.info(f"No hay servicios contratados para evento {event_obj.id}, no se generan tareas automáticas")
    except Exception as e:
        logger.error(f"Error al crear tareas automáticas: {str(e)}")
    
    return event_obj

def calculate_priority(task: dict) -> str:
    """Auto-calculate task priority based on rules"""
    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    today_date = datetime.now(timezone.utc).date()
    due_date_str = task.get("due_date", "9999-12-31")
    status = task.get("status", "pendiente")
    
    if status in ("completada", "completed"):
        return "baja"
    
    # Overdue → ALTA
    if due_date_str < today_str:
        return "alta"
    
    # Waiting states > 3 days → ALTA
    if status in ("esperando_cliente", "esperando_proveedor"):
        changed_at = task.get("status_changed_at")
        if changed_at:
            try:
                changed_date = datetime.fromisoformat(changed_at).date()
                if (today_date - changed_date).days >= 3:
                    return "alta"
            except (ValueError, TypeError):
                pass
        return "media"
    
    # Next 3 days → MEDIA
    try:
        due = datetime.strptime(due_date_str, "%Y-%m-%d").date()
        days_left = (due - today_date).days
        if days_left <= 3:
            return "media"
    except ValueError:
        pass
    
    return "baja"

@api_router.get("/dashboard/command-center")
async def get_command_center(current_user: dict = Depends(get_current_user)):
    planner_id = current_user["id"]
    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    today_date = datetime.now(timezone.utc).date()
    three_days = (today_date + timedelta(days=3)).strftime('%Y-%m-%d')
    
    events = await db.events.find({"planner_id": planner_id}, {"_id": 0}).to_list(1000)
    event_ids = [e["id"] for e in events]
    event_map = {e["id"]: e.get("title", "Evento") for e in events}
    
    # All incomplete tasks
    all_tasks = await db.tasks.find(
        {"event_id": {"$in": event_ids}, "status": {"$nin": ["completada", "completed"]}},
        {"_id": 0}
    ).to_list(10000)
    
    # Enrich tasks with event name and auto-priority
    for t in all_tasks:
        t["event_title"] = event_map.get(t.get("event_id"), "Evento")
        t["priority"] = calculate_priority(t)
    
    # === HOY TENGO QUE HACER ESTO ===
    overdue = [t for t in all_tasks if t["due_date"] < today_str]
    today_tasks = [t for t in all_tasks if t["due_date"] == today_str]
    upcoming_priority = [t for t in all_tasks if today_str < t["due_date"] <= three_days]
    
    hoy = overdue + today_tasks + upcoming_priority
    priority_order = {"alta": 0, "media": 1, "baja": 2}
    hoy.sort(key=lambda t: (priority_order.get(t["priority"], 3), t["due_date"]))
    
    # === BLOQUEOS separados por tipo ===
    bloqueos_cliente = [t for t in all_tasks if t.get("status") == "esperando_cliente"]
    bloqueos_proveedor = [t for t in all_tasks if t.get("status") == "esperando_proveedor"]
    
    # === BLOQUEOS POR CLIENTE: tareas con responsable "Cliente" pendientes > 5 días ===
    for t in all_tasks:
        if t.get("responsible") == "Cliente" and t.get("status") == "pendiente":
            changed_at = t.get("status_changed_at") or t.get("created_at")
            if changed_at:
                try:
                    if isinstance(changed_at, str):
                        changed_date = datetime.fromisoformat(changed_at).date()
                    else:
                        changed_date = changed_at.date() if hasattr(changed_at, 'date') else today_date
                    if (today_date - changed_date).days >= 5 and t not in bloqueos_cliente:
                        bloqueos_cliente.append(t)
                except (ValueError, TypeError):
                    pass
    
    # === APROBACIONES PENDIENTES ===
    aprobaciones = [t for t in all_tasks if t.get("status") == "aprobacion_pendiente"]
    
    # === PAGOS A REVISAR ===
    all_budget = await db.budget_items.find(
        {"event_id": {"$in": event_ids}},
        {"_id": 0}
    ).to_list(10000)
    
    pagos_revisar = []
    for b in all_budget:
        estimated = float(b.get("estimated_amount", 0) or 0)
        paid = float(b.get("paid_amount", 0) or 0)
        remaining = estimated - paid
        if remaining > 0:
            pagos_revisar.append({
                "id": b.get("id"),
                "category": b.get("category", ""),
                "description": b.get("description", ""),
                "estimated_amount": estimated,
                "paid_amount": paid,
                "remaining": remaining,
                "status": b.get("status", "pending"),
                "event_id": b.get("event_id"),
                "event_title": event_map.get(b.get("event_id"), "Evento")
            })
    pagos_revisar.sort(key=lambda p: p["remaining"], reverse=True)
    
    # === ARCHIVOS PENDIENTES DE REVISIÓN ===
    all_files = await db.files.find(
        {"event_id": {"$in": event_ids}, "file_status": "pendiente_revision"},
        {"_id": 0, "file_base64": 0}
    ).to_list(10000)
    archivos_pendientes = []
    for f in all_files:
        archivos_pendientes.append({
            "id": f.get("id"),
            "file_name": f.get("file_name"),
            "category": f.get("category", f.get("file_type", "")),
            "event_id": f.get("event_id"),
            "event_title": event_map.get(f.get("event_id"), "Evento"),
            "origin": f.get("origin", "manual"),
        })
    
    # === TAREAS CON RELACIONES (unused for now, calculated for future use) ===
    
    # === ¿QUÉ HAGO HOY? (top 3) ===
    que_hago = hoy[:3]
    
    return {
        "hoy": [_clean_task(t) for t in hoy[:6]],
        "bloqueos_cliente": [_clean_task(t) for t in bloqueos_cliente],
        "bloqueos_proveedor": [_clean_task(t) for t in bloqueos_proveedor],
        "aprobaciones": [_clean_task(t) for t in aprobaciones],
        "pagos_revisar": pagos_revisar[:6],
        "archivos_pendientes": archivos_pendientes[:6],
        "que_hago_hoy": [_clean_task(t) for t in que_hago],
    }

def _clean_task(t):
    """Return a clean dict for task response"""
    return {
        "id": t.get("id"),
        "title": t.get("title"),
        "category": t.get("category"),
        "due_date": t.get("due_date"),
        "responsible": t.get("responsible"),
        "status": t.get("status"),
        "priority": t.get("priority"),
        "notes": t.get("notes", ""),
        "description": t.get("description", ""),
        "next_step": t.get("next_step", ""),
        "related_supplier_id": t.get("related_supplier_id"),
        "related_budget_id": t.get("related_budget_id"),
        "related_file_id": t.get("related_file_id"),
        "event_id": t.get("event_id"),
        "event_title": t.get("event_title", ""),
        "servicio": t.get("servicio", ""),
        "fase": t.get("fase", ""),
        "origen": t.get("origen", "manual"),
        "disparador": t.get("disparador", ""),
        "offset_pct": t.get("offset_pct"),
        "entregable": t.get("entregable"),
    }

@api_router.post("/automations/run-followups")
async def run_followup_automations(current_user: dict = Depends(get_current_user)):
    """Auto-create follow-up tasks for blocked items waiting > 3 days"""
    planner_id = current_user["id"]
    today_date = datetime.now(timezone.utc).date()
    today_str = today_date.strftime('%Y-%m-%d')
    
    events = await db.events.find({"planner_id": planner_id}, {"_id": 0, "id": 1}).to_list(1000)
    event_ids = [e["id"] for e in events]
    
    waiting_tasks = await db.tasks.find({
        "event_id": {"$in": event_ids},
        "status": {"$in": ["esperando_cliente", "esperando_proveedor"]},
    }, {"_id": 0}).to_list(10000)
    
    created = 0
    for task in waiting_tasks:
        changed_at = task.get("status_changed_at")
        if not changed_at:
            continue
        try:
            changed_date = datetime.fromisoformat(changed_at).date()
        except (ValueError, TypeError):
            continue
        
        if (today_date - changed_date).days < 3:
            continue
        
        # Check if followup already exists
        existing = await db.tasks.find_one({
            "event_id": task["event_id"],
            "is_auto_followup": True,
            "related_note_id": task["id"],
            "status": {"$nin": ["completada", "completed"]}
        })
        if existing:
            continue
        
        target = "cliente" if task["status"] == "esperando_cliente" else "proveedor"
        followup = {
            "id": str(uuid.uuid4()),
            "event_id": task["event_id"],
            "title": f"Hacer seguimiento al {target}: {task['title']}",
            "category": "Seguimiento",
            "due_date": today_str,
            "responsible": task.get("responsible", "Planificador"),
            "status": "pendiente",
            "priority": "alta",
            "notes": f"Tarea original bloqueada desde {changed_at[:10]}",
            "next_step": f"Contactar al {target} para desbloquear",
            "is_auto_followup": True,
            "related_note_id": task["id"],
            "status_changed_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.tasks.insert_one(followup)
        created += 1
    
    return {"created": created, "message": f"Se crearon {created} tareas de seguimiento"}

@api_router.post("/events/{event_id}/generate-tasks")
async def generate_event_tasks(event_id: str, current_user: dict = Depends(get_current_user)):
    """Genera tareas automáticas basadas en los servicios contratados del evento"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    services = {
        'service_asesoria': event.get('service_asesoria', False),
        'service_coordinacion': event.get('service_coordinacion', False),
        'service_decoracion': event.get('service_decoracion', False),
        'service_decoracion_diseno': event.get('service_decoracion_diseno', False),
        'service_proveedores': event.get('service_proveedores', False),
        'service_carteleria': event.get('service_carteleria', False),
    }

    if not any(services.values()):
        return {"created": 0, "message": "No hay servicios contratados. Activa al menos un servicio."}

    # Eliminar SOLO tareas automáticas previas (no las manuales)
    deleted = await db.tasks.delete_many({"event_id": event_id, "origen": "automatica"})

    fecha_contrato = event.get('contract_date') or datetime.now(timezone.utc).strftime('%Y-%m-%d')
    fecha_evento = event.get('date')

    tasks_created = await generar_tareas_automaticas(event_id, fecha_evento, fecha_contrato, services)

    return {
        "created": tasks_created,
        "deleted_previous": deleted.deleted_count,
        "message": f"Se generaron {tasks_created} tareas automáticas ({deleted.deleted_count} anteriores eliminadas)"
    }

@api_router.post("/events/{event_id}/recalculate-dates")
async def recalculate_task_dates(event_id: str, current_user: dict = Depends(get_current_user)):
    """Recalcula las fechas de tareas automáticas cuando cambian las fechas del evento"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    fecha_contrato_str = event.get('contract_date') or datetime.now(timezone.utc).strftime('%Y-%m-%d')
    fecha_evento_str = event.get('date')
    fecha_contrato = datetime.fromisoformat(fecha_contrato_str)
    fecha_evento = datetime.fromisoformat(fecha_evento_str)

    # Solo recalcular tareas con origen 'automatica' y offset_pct
    auto_tasks = await db.tasks.find(
        {"event_id": event_id, "origen": "automatica", "offset_pct": {"$ne": None}},
        {"_id": 0}
    ).to_list(10000)

    updated = 0
    for task in auto_tasks:
        offset = task.get("offset_pct")
        if offset is not None:
            new_due = calcular_fecha_limite(fecha_contrato, fecha_evento, offset)
            await db.tasks.update_one(
                {"id": task["id"]},
                {"$set": {"due_date": new_due}}
            )
            updated += 1

    return {"updated": updated, "message": f"Se recalcularon {updated} fechas de tareas automáticas"}

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    planner_id = current_user["id"]
    
    # Get all planner events with full info
    events = await db.events.find({"planner_id": planner_id}, {"_id": 0}).to_list(1000)
    event_ids = [e["id"] for e in events]
    total_events = len(events)
    
    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    today_date = datetime.now(timezone.utc).date()
    upcoming_events = sum(1 for e in events if e.get("date", "") >= today_str)
    
    # Countdown to nearest event
    nearest_countdown = None
    nearest_event_title = None
    for e in events:
        try:
            event_date = datetime.strptime(e["date"], "%Y-%m-%d").date()
            days_left = (event_date - today_date).days
            if days_left >= 0 and (nearest_countdown is None or days_left < nearest_countdown):
                nearest_countdown = days_left
                nearest_event_title = e.get("title", "Evento")
        except (ValueError, KeyError):
            pass
    
    # Tasks stats
    all_tasks = await db.tasks.find({"event_id": {"$in": event_ids}}, {"_id": 0, "status": 1, "due_date": 1}).to_list(10000)
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.get("status") == "completed")
    pending_tasks = total_tasks - completed_tasks
    overdue_tasks = sum(1 for t in all_tasks if t.get("status") != "completed" and t.get("due_date", "9999") < today_str)
    
    # Upcoming payments (suppliers with pending status and price > 0)
    all_suppliers = await db.suppliers.find({"event_id": {"$in": event_ids}}, {"_id": 0}).to_list(10000)
    upcoming_payments = []
    for s in all_suppliers:
        price = float(s.get("price", 0) or 0)
        advance = float(s.get("advance_payment", 0) or 0)
        remaining = price - advance
        if remaining > 0 and s.get("booking_status") != "cancelled":
            upcoming_payments.append({
                "supplier_name": s.get("name", ""),
                "amount_remaining": remaining,
                "total_price": price,
                "event_id": s.get("event_id", "")
            })
    upcoming_payments.sort(key=lambda x: x["amount_remaining"], reverse=True)
    total_pending_payments = sum(p["amount_remaining"] for p in upcoming_payments)
    
    return {
        "total_events": total_events,
        "upcoming_events": upcoming_events,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "overdue_tasks": overdue_tasks,
        "nearest_countdown": nearest_countdown,
        "nearest_event_title": nearest_event_title,
        "total_pending_payments": total_pending_payments,
        "upcoming_payments": upcoming_payments[:5],
    }

@api_router.get("/reminders")
async def get_reminders(current_user: dict = Depends(get_current_user)):
    planner_id = current_user["id"]
    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    today_date = datetime.now(timezone.utc).date()
    
    events = await db.events.find({"planner_id": planner_id}, {"_id": 0}).to_list(1000)
    event_ids = [e["id"] for e in events]
    event_map = {e["id"]: e for e in events}
    
    reminders = []
    
    # Event countdowns
    for e in events:
        try:
            event_date = datetime.strptime(e["date"], "%Y-%m-%d").date()
            days_left = (event_date - today_date).days
            title = e.get("title", "Evento")
            if days_left == 0:
                reminders.append({"type": "urgent", "icon": "clock", "message": f"{title}: ¡Es hoy!", "event_id": e["id"], "days": 0})
            elif 0 < days_left <= 7:
                reminders.append({"type": "urgent", "icon": "clock", "message": f"{title}: Faltan {days_left} días", "event_id": e["id"], "days": days_left})
            elif 7 < days_left <= 30:
                reminders.append({"type": "warning", "icon": "clock", "message": f"{title}: Faltan {days_left} días", "event_id": e["id"], "days": days_left})
            elif 30 < days_left <= 90:
                reminders.append({"type": "info", "icon": "calendar", "message": f"{title}: Faltan {days_left} días", "event_id": e["id"], "days": days_left})
        except (ValueError, KeyError):
            pass
    
    # Overdue tasks
    all_tasks = await db.tasks.find({"event_id": {"$in": event_ids}, "status": {"$nin": ["completed", "completada"]}}, {"_id": 0}).to_list(10000)
    overdue_tasks = [t for t in all_tasks if t.get("due_date", "9999") < today_str]
    tasks_due_soon = [t for t in all_tasks if today_str <= t.get("due_date", "9999") <= (today_date + timedelta(days=7)).strftime('%Y-%m-%d')]
    
    if overdue_tasks:
        grouped_overdue = {}
        for t in overdue_tasks:
            eid = t["event_id"]
            if eid not in grouped_overdue:
                grouped_overdue[eid] = 0
            grouped_overdue[eid] += 1
        for eid, count in grouped_overdue.items():
            ev_title = event_map.get(eid, {}).get("title", "Evento")
            reminders.append({"type": "urgent", "icon": "alert", "message": f"{ev_title}: {count} tarea(s) vencida(s)", "event_id": eid, "days": -1})
    
    if tasks_due_soon:
        grouped_soon = {}
        for t in tasks_due_soon:
            eid = t["event_id"]
            if eid not in grouped_soon:
                grouped_soon[eid] = 0
            grouped_soon[eid] += 1
        for eid, count in grouped_soon.items():
            ev_title = event_map.get(eid, {}).get("title", "Evento")
            reminders.append({"type": "warning", "icon": "task", "message": f"{ev_title}: {count} tarea(s) esta semana", "event_id": eid, "days": 7})
    
    # Pending supplier confirmations
    all_suppliers = await db.suppliers.find({"event_id": {"$in": event_ids}, "booking_status": "pending"}, {"_id": 0}).to_list(10000)
    if all_suppliers:
        grouped_suppliers = {}
        for s in all_suppliers:
            eid = s["event_id"]
            if eid not in grouped_suppliers:
                grouped_suppliers[eid] = 0
            grouped_suppliers[eid] += 1
        for eid, count in grouped_suppliers.items():
            ev_title = event_map.get(eid, {}).get("title", "Evento")
            reminders.append({"type": "info", "icon": "supplier", "message": f"{ev_title}: {count} proveedor(es) pendiente(s) de confirmar", "event_id": eid, "days": 30})
    
    # Sort: urgent first, then warning, then info
    priority = {"urgent": 0, "warning": 1, "info": 2}
    reminders.sort(key=lambda r: (priority.get(r["type"], 3), r.get("days", 999)))
    
    return reminders

@api_router.get("/events", response_model=List[Event])
async def get_events(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "planner":
        events = await db.events.find({"planner_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    else:
        events = await db.events.find({"couple_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    for event in events:
        if isinstance(event['created_at'], str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
    
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    # Check access
    if current_user["role"] == "pareja" and event.get("couple_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a este evento")
    
    if isinstance(event['created_at'], str):
        event['created_at'] = datetime.fromisoformat(event['created_at'])
    
    return Event(**event)

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event_update: EventCreate, current_user: dict = Depends(get_current_user)):
    existing_event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not existing_event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    if current_user["role"] != "planner":
        raise HTTPException(status_code=403, detail="Solo los planners pueden editar eventos")
    
    update_data = event_update.model_dump()
    
    # Detect date changes for recalculation notification
    old_date = existing_event.get("date")
    old_contract = existing_event.get("contract_date")
    
    await db.events.update_one({"id": event_id}, {"$set": update_data})
    
    updated_event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if isinstance(updated_event['created_at'], str):
        updated_event['created_at'] = datetime.fromisoformat(updated_event['created_at'])
    
    # If dates changed, log it (frontend will prompt recalculation)
    if old_date != update_data.get("date") or old_contract != update_data.get("contract_date"):
        logger.info(f"Fechas del evento {event_id} han cambiado. Recálculo necesario.")
    
    response_event = Event(**updated_event)
    return response_event

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "planner":
        raise HTTPException(status_code=403, detail="Solo los planners pueden eliminar eventos")
    
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    return {"message": "Evento eliminado correctamente"}

# ============= TASK ROUTES =============

@api_router.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_obj = Task(**task.model_dump())
    
    doc = task_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.tasks.insert_one(doc)
    return task_obj

@api_router.get("/tasks/{event_id}", response_model=List[Task])
async def get_tasks(event_id: str, current_user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    
    for task in tasks:
        if isinstance(task['created_at'], str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
        # Auto-calculate priority
        task['priority'] = calculate_priority(task)
        # Normalize old status values
        if task.get('status') == 'pending':
            task['status'] = 'pendiente'
        elif task.get('status') == 'in_progress':
            task['status'] = 'en_proceso'
        elif task.get('status') == 'completed':
            task['status'] = 'completada'
        # Ensure Phase 3 fields exist
        task.setdefault('servicio', '')
        task.setdefault('fase', '')
        task.setdefault('origen', 'manual')
        task.setdefault('disparador', '')
        task.setdefault('offset_pct', None)
        task.setdefault('entregable', None)
    
    return tasks

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskCreate, current_user: dict = Depends(get_current_user)):
    update_data = task_update.model_dump()
    
    # Track status change time
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0, "status": 1})
    if existing and existing.get("status") != update_data.get("status"):
        update_data["status_changed_at"] = datetime.now(timezone.utc).isoformat()
    
    # Auto-calculate priority
    update_data["priority"] = calculate_priority(update_data)
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not updated_task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    if isinstance(updated_task['created_at'], str):
        updated_task['created_at'] = datetime.fromisoformat(updated_task['created_at'])
    
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    return {"message": "Tarea eliminada correctamente"}

# ============= GUEST ROUTES =============

@api_router.post("/guests", response_model=Guest)
async def create_guest(guest: GuestCreate, current_user: dict = Depends(get_current_user)):
    guest_obj = Guest(**guest.model_dump())
    
    doc = guest_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.guests.insert_one(doc)
    return guest_obj

@api_router.get("/guests/{event_id}", response_model=List[Guest])
async def get_guests(event_id: str, current_user: dict = Depends(get_current_user)):
    guests = await db.guests.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    
    for guest in guests:
        if isinstance(guest['created_at'], str):
            guest['created_at'] = datetime.fromisoformat(guest['created_at'])
    
    return guests

@api_router.put("/guests/{guest_id}", response_model=Guest)
async def update_guest(guest_id: str, guest_update: GuestCreate, current_user: dict = Depends(get_current_user)):
    update_data = guest_update.model_dump()
    await db.guests.update_one({"id": guest_id}, {"$set": update_data})
    
    updated_guest = await db.guests.find_one({"id": guest_id}, {"_id": 0})
    if not updated_guest:
        raise HTTPException(status_code=404, detail="Invitado no encontrado")
    
    if isinstance(updated_guest['created_at'], str):
        updated_guest['created_at'] = datetime.fromisoformat(updated_guest['created_at'])
    
    return Guest(**updated_guest)

@api_router.delete("/guests/{guest_id}")
async def delete_guest(guest_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.guests.delete_one({"id": guest_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invitado no encontrado")
    
    return {"message": "Invitado eliminado correctamente"}

# ============= SUPPLIER ROUTES =============

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(supplier: SupplierCreate, current_user: dict = Depends(get_current_user)):
    supplier_obj = Supplier(**supplier.model_dump())
    
    doc = supplier_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.suppliers.insert_one(doc)
    return supplier_obj

@api_router.get("/suppliers/{event_id}", response_model=List[Supplier])
async def get_suppliers(event_id: str, current_user: dict = Depends(get_current_user)):
    suppliers = await db.suppliers.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    
    for supplier in suppliers:
        if isinstance(supplier['created_at'], str):
            supplier['created_at'] = datetime.fromisoformat(supplier['created_at'])
    
    return suppliers

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, supplier_update: SupplierCreate, current_user: dict = Depends(get_current_user)):
    update_data = supplier_update.model_dump()
    await db.suppliers.update_one({"id": supplier_id}, {"$set": update_data})
    
    updated_supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not updated_supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    if isinstance(updated_supplier['created_at'], str):
        updated_supplier['created_at'] = datetime.fromisoformat(updated_supplier['created_at'])
    
    return Supplier(**updated_supplier)

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.suppliers.delete_one({"id": supplier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    return {"message": "Proveedor eliminado correctamente"}

@api_router.get("/suppliers/predefined/list")
async def get_predefined_suppliers(current_user: dict = Depends(get_current_user)):
    """Devuelve la lista de proveedores predefinidos"""
    return PROVEEDORES_FIJOS

# ============= BUDGET ROUTES =============

@api_router.post("/budget", response_model=BudgetItem)
async def create_budget_item(item: BudgetItemCreate, current_user: dict = Depends(get_current_user)):
    item_obj = BudgetItem(**item.model_dump())
    
    doc = item_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.budget_items.insert_one(doc)
    return item_obj

@api_router.get("/budget/{event_id}", response_model=List[BudgetItem])
async def get_budget_items(event_id: str, current_user: dict = Depends(get_current_user)):
    items = await db.budget_items.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    
    for item in items:
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    
    return items

@api_router.put("/budget/{item_id}", response_model=BudgetItem)
async def update_budget_item(item_id: str, item_update: BudgetItemCreate, current_user: dict = Depends(get_current_user)):
    update_data = item_update.model_dump()
    await db.budget_items.update_one({"id": item_id}, {"$set": update_data})
    
    updated_item = await db.budget_items.find_one({"id": item_id}, {"_id": 0})
    if not updated_item:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
    
    if isinstance(updated_item['created_at'], str):
        updated_item['created_at'] = datetime.fromisoformat(updated_item['created_at'])
    
    return BudgetItem(**updated_item)

@api_router.delete("/budget/{item_id}")
async def delete_budget_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.budget_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
    
    return {"message": "Partida eliminada correctamente"}

# ============= NOTE ROUTES =============

@api_router.post("/notes", response_model=Note)
async def create_note(note_create: NoteCreate, current_user: dict = Depends(get_current_user)):
    # Get user name
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    note_obj = Note(
        **note_create.model_dump(),
        author_id=current_user["id"],
        author_name=user.get("name", "Usuario")
    )
    
    doc = note_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.notes.insert_one(doc)
    return note_obj

@api_router.get("/notes/{event_id}", response_model=List[Note])
async def get_notes(event_id: str, current_user: dict = Depends(get_current_user)):
    notes = await db.notes.find({"event_id": event_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for note in notes:
        if isinstance(note['created_at'], str):
            note['created_at'] = datetime.fromisoformat(note['created_at'])
    
    return notes

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    
    if note.get("author_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Solo puedes eliminar tus propias notas")
    
    await db.notes.delete_one({"id": note_id})
    return {"message": "Nota eliminada correctamente"}

# ============= GALLERY ROUTES (OpenAI Image Generation) =============

@api_router.post("/gallery/generate", response_model=Gallery)
async def generate_gallery_image(gallery_create: GalleryCreate, current_user: dict = Depends(get_current_user)):
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY', '')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key no configurada")
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        images = await image_gen.generate_images(
            prompt=gallery_create.generated_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="No se pudo generar la imagen")
        
        image_base64 = base64.b64encode(images[0]).decode('utf-8')
        
        gallery_obj = Gallery(
            **gallery_create.model_dump(),
            image_base64=image_base64
        )
        
        doc = gallery_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.galleries.insert_one(doc)
        return gallery_obj
        
    except Exception as e:
        logging.error(f"Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al generar imagen: {str(e)}")

@api_router.get("/gallery/{event_id}", response_model=List[Gallery])
async def get_gallery_images(event_id: str, current_user: dict = Depends(get_current_user)):
    galleries = await db.galleries.find({"event_id": event_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for gallery in galleries:
        if isinstance(gallery['created_at'], str):
            gallery['created_at'] = datetime.fromisoformat(gallery['created_at'])
    
    return galleries

@api_router.delete("/gallery/{gallery_id}")
async def delete_gallery_image(gallery_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.galleries.delete_one({"id": gallery_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    
    return {"message": "Imagen eliminada correctamente"}

# ============= DECOR DECISION ROUTES =============

@api_router.post("/decor", response_model=DecorDecision)
async def create_decor_decision(decor: DecorDecisionCreate, current_user: dict = Depends(get_current_user)):
    decor_obj = DecorDecision(**decor.model_dump())
    
    doc = decor_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.decor_decisions.insert_one(doc)
    return decor_obj

@api_router.get("/decor/{event_id}", response_model=List[DecorDecision])
async def get_decor_decisions(event_id: str, current_user: dict = Depends(get_current_user)):
    decisions = await db.decor_decisions.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    
    for decision in decisions:
        if isinstance(decision['created_at'], str):
            decision['created_at'] = datetime.fromisoformat(decision['created_at'])
    
    return decisions

@api_router.put("/decor/{decor_id}", response_model=DecorDecision)
async def update_decor_decision(decor_id: str, decor_update: DecorDecisionCreate, current_user: dict = Depends(get_current_user)):
    update_data = decor_update.model_dump()
    await db.decor_decisions.update_one({"id": decor_id}, {"$set": update_data})
    
    updated_decor = await db.decor_decisions.find_one({"id": decor_id}, {"_id": 0})
    if not updated_decor:
        raise HTTPException(status_code=404, detail="Decisión no encontrada")
    
    if isinstance(updated_decor['created_at'], str):
        updated_decor['created_at'] = datetime.fromisoformat(updated_decor['created_at'])
    
    return DecorDecision(**updated_decor)

@api_router.delete("/decor/{decor_id}")
async def delete_decor_decision(decor_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.decor_decisions.delete_one({"id": decor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Decisión no encontrada")
    
    return {"message": "Decisión eliminada correctamente"}

# ============= PAYMENT ROUTES =============

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment: PaymentCreate, current_user: dict = Depends(get_current_user)):
    payment_obj = Payment(**payment.model_dump())
    
    doc = payment_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.payments.insert_one(doc)
    
    # Actualizar paid_amount del budget_item
    payments_for_item = await db.payments.find({"budget_item_id": payment.budget_item_id}, {"_id": 0}).to_list(1000)
    total_paid = sum([p.get('amount', 0) for p in payments_for_item])
    
    await db.budget_items.update_one(
        {"id": payment.budget_item_id},
        {"$set": {"paid_amount": total_paid}}
    )
    
    return payment_obj

@api_router.get("/payments/{event_id}", response_model=List[Payment])
async def get_payments(event_id: str, current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({"event_id": event_id}, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    
    for payment in payments:
        if isinstance(payment['created_at'], str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
    
    return payments

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    # Eliminar pago
    await db.payments.delete_one({"id": payment_id})
    
    # Recalcular paid_amount del budget_item
    payments_for_item = await db.payments.find({"budget_item_id": payment['budget_item_id']}, {"_id": 0}).to_list(1000)
    total_paid = sum([p.get('amount', 0) for p in payments_for_item])
    
    await db.budget_items.update_one(
        {"id": payment['budget_item_id']},
        {"$set": {"paid_amount": total_paid}}
    )
    
    return {"message": "Pago eliminado correctamente"}

# ============= FILE ROUTES =============

@api_router.post("/files", response_model=File)
async def create_file(file_data: FileCreate, current_user: dict = Depends(get_current_user)):
    file_obj = File(**file_data.model_dump())
    
    doc = file_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.files.insert_one(doc)
    return file_obj

@api_router.get("/files/{event_id}", response_model=List[File])
async def get_files(event_id: str, current_user: dict = Depends(get_current_user)):
    files = await db.files.find({"event_id": event_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for file in files:
        if isinstance(file['created_at'], str):
            file['created_at'] = datetime.fromisoformat(file['created_at'])
    
    return files

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.files.delete_one({"id": file_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    return {"message": "Archivo eliminado correctamente"}

@api_router.put("/files/{file_id}")
async def update_file(file_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    allowed = {"file_status", "category", "description", "notes", "origin", "version", "service_related", "file_type"}
    update_data = {k: v for k, v in updates.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay campos válidos para actualizar")
    await db.files.update_one({"id": file_id}, {"$set": update_data})
    updated = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return File(**updated)

# ============= STATS ROUTE =============

@api_router.get("/stats/{event_id}")
async def get_event_stats(event_id: str, current_user: dict = Depends(get_current_user)):
    # Guest stats
    guests = await db.guests.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    total_guests = len(guests)
    confirmed = len([g for g in guests if g.get('rsvp') == 'confirmed'])
    pending = len([g for g in guests if g.get('rsvp') == 'pending'])
    declined = len([g for g in guests if g.get('rsvp') == 'declined'])
    total_companions = sum([g.get('companions_count', 0) for g in guests if g.get('rsvp') == 'confirmed'])
    
    # Budget stats (budget_items + supplier costs)
    budget_items = await db.budget_items.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    budget_estimated = sum([float(item.get('estimated_amount', 0) or 0) for item in budget_items])
    budget_paid = sum([float(item.get('paid_amount', 0) or 0) for item in budget_items])
    
    suppliers = await db.suppliers.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    supplier_estimated = sum([float(s.get('price', 0) or 0) for s in suppliers])
    supplier_paid = sum([float(s.get('advance_payment', 0) or 0) for s in suppliers])
    
    total_estimated = budget_estimated + supplier_estimated
    total_paid = budget_paid + supplier_paid
    
    # Task stats (count both 'completed' and 'completada')
    tasks = await db.tasks.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.get('status') in ('completed', 'completada')])
    
    return {
        "guests": {
            "total": total_guests,
            "confirmed": confirmed,
            "pending": pending,
            "declined": declined,
            "total_companions": total_companions,
            "total_attendees": confirmed + total_companions
        },
        "budget": {
            "total_estimated": total_estimated,
            "total_paid": total_paid,
            "remaining": total_estimated - total_paid
        },
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "pending": total_tasks - completed_tasks,
            "completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        }
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
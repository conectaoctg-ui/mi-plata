// Roles y permisos (principio de mínimo privilegio).
// En modo local esta tabla controla la interfaz. En producción las MISMAS reglas
// deben aplicarse en el servidor (reglas de Firestore), porque el navegador se puede manipular.

export const ROLES = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  vendedor: 'Asesor comercial',
  tecnico: 'Técnico'
};

// acción -> roles que la pueden ejecutar
export const PERMISOS = {
  'catalogo.ver': ['admin', 'supervisor', 'vendedor', 'tecnico'],
  'catalogo.verCosto': ['admin', 'supervisor'],
  'catalogo.editar': ['admin'],
  'margen.calcular': ['admin', 'supervisor'],
  'conocimiento.ver': ['admin', 'supervisor', 'vendedor', 'tecnico'],
  'conocimiento.editar': ['admin'],
  'clientes.verPropios': ['admin', 'supervisor', 'vendedor'],
  'clientes.verTodos': ['admin', 'supervisor'],
  'clientes.editar': ['admin', 'supervisor', 'vendedor'],
  'clientes.eliminar': ['admin'],
  'financiacion.simular': ['admin', 'supervisor', 'vendedor'],
  'financiacion.configurar': ['admin'],
  'tecnico.verCasos': ['admin', 'supervisor', 'tecnico', 'vendedor'],
  'tecnico.crearCaso': ['admin', 'supervisor', 'tecnico', 'vendedor'],
  'tecnico.diagnosticar': ['admin', 'tecnico'],
  'tecnico.confirmarFalla': ['admin', 'tecnico'],
  'tecnico.entregar': ['admin', 'tecnico'],
  'academia.estudiar': ['admin', 'supervisor', 'vendedor', 'tecnico'],
  'academia.asignar': ['admin', 'supervisor'],
  'academia.validarCompetencia': ['admin', 'supervisor'],
  'academia.verProgresoEquipo': ['admin', 'supervisor'],
  'usuarios.gestionar': ['admin'],
  'auditoria.ver': ['admin'],
  'metricas.ver': ['admin', 'supervisor'],
  'datos.respaldo': ['admin']
};

export function can(user, accion) {
  if (!user || !user.activo) return false;
  const roles = PERMISOS[accion];
  if (!roles) return false; // acción desconocida: se niega por defecto
  return roles.includes(user.rol);
}

export class PermissionError extends Error {
  constructor(accion) {
    super('No tienes permiso para realizar esta acción.');
    this.name = 'PermissionError';
    this.accion = accion;
  }
}

export function assertCan(user, accion) {
  if (!can(user, accion)) throw new PermissionError(accion);
}

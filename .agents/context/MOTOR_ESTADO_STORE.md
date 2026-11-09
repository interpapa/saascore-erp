# 🧠 Motor de Estado Global & Sesión (`useERPStore.ts`)

> **Propósito:** Explicar cómo fluye el estado de sesión, el multi-tenant y la seguridad en el cliente (Zustand) y en el servidor (Server Actions & ActionActor).

---

## 1. Arquitectura del Store Cliente (`src/store/useERPStore.ts`)

Rendo ERP utiliza **Zustand** con persistencia en `localStorage` (clave: `Rendo-erp-storage`) y rehidratación asíncrona.

### Estado Principal (`ERPState`):
* **`session: SessionData | null`**:
  - `userEmail`: Correo del usuario autenticado.
  - `role`: Rol RBAC (`'owner' | 'manager' | 'seller' | 'technician' | 'superadmin'`).
  - `tenantId`: ID de la empresa activa.
  - `token`: Token de seguridad / JWT para llamadas firmadas.
  - `allowed_modules`: Módulos específicos asignados al empleado.
* **`currentTenant: Tenant | null`**:
  - `id`: UUID del tenant.
  - `name`: Nombre comercial.
  - `active_modules`: Array de módulos habilitados en la empresa.
  - `metadata`: Configuración del tenant (fiscal, logo, dock móvil, cuentas bancarias).
* **`hasHydrated: boolean`**: Bandera para evitar parpadeos en renderizados SSR.
* **`impersonatedTenant` / `originalTenant`**: Para soporte de Superadmin (cambio de empresa sin perder credenciales originales).

---

## 2. El Mecanismo de Seguridad en Servidor (`useActionActor` & `validateUserTenantAccess`)

Cualquier mutación crítica (guardar consulta, ajustar inventario, cobrar en caja) no confía ciegamente en los datos que envía el frontend.

### El Objeto `ActionActor`:
* Proporcionado por el hook `useActionActor()`:
  ```ts
  interface ActionActor {
    userId?: string;
    email: string;
    role: UserRole;
    tenantId: string;
    token?: string;
  }
  ```

### Validación en Servidor (`validateUserTenantAccess`):
* Todas las Server Actions en `src/app/actions/*` inician con:
  ```ts
  const auth = await validateUserTenantAccess(tenantId, actor);
  if (!auth.success) return { success: false, error: auth.error };
  ```
* Esto garantiza aislamiento criptográfico **Anti-IDOR**: un usuario de la Empresa A jamás puede leer o escribir registros de la Empresa B, incluso si adultera la URL o la petición HTTP.

# 🧠 Motor de Estado Global & Sesión (`useERPStore.ts`)

> **Propósito:** Explicar cómo fluye el estado de sesión, el multi-tenant y la seguridad en el cliente (Zustand) y en el servidor (Server Actions & ActionActor).

---

## 1. Arquitectura del Store Cliente (`src/store/useERPStore.ts`)

Rendo ERP utiliza **Zustand** con persistencia en `localStorage` (clave: `Rendo-erp-storage`) y rehidratación asíncrona.

* **Blindaje SSR / Node 22/24:** La función `createJSONStorage` evalúa `typeof window !== 'undefined' && window.localStorage`. En el servidor (Node) devuelve un adapter dummy inerte (`getItem: () => null, setItem: () => {}, removeItem: () => {}`), previniendo caídas con `ReferenceError: localStorage is not defined` durante el renderizado de Server Components.
* **Resolución de Tenant Dual (Server Action + Client Fallback):** Tanto `login/page.tsx` como `AuthProvider.tsx` intentan primero `getUserTenant` (Server Action saneada con `JSON.parse(JSON.stringify)` para cumplir el protocolo Flight RPC de React 19). Si la Server Action tiene latencia o falla, se ejecuta un fallback directo vía cliente Supabase consultando `user_tenants` y `tenants`, gracias a las políticas RLS añadidas en PostgreSQL.

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
* **`impersonatedTenant` / `originalTenant`**: Para soporte de Superadmin (cambio de empresa sin perder credenciales originales). Al detener la impersonación (`stopImpersonation`), si `originalTenant` no está definido, se conserva `currentTenant` como blindaje contra reseteo involuntario a `null`.
* **Priorización de Membresía (`getUserTenant`)**: Cuando un usuario posee múltiples asociaciones en `user_tenants` (ej. es `owner` de su propio negocio y `admin` secundario en otra empresa), el sistema prioriza inequívocamente la empresa donde ostenta el rol de `owner`.

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

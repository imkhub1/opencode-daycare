# SPEC 09 — Auth real: login, logout y protección de rutas

> **Estado:** approved · **Depende de:** SPEC 03 (login/activate visual), SPEC 08 (users table + enums) · **Fecha:** 2026-07-08
> **Objetivo:** Conectar el login visual con Supabase Auth (email + password), agregar logout funcional, y proteger todas las rutas excepto `/login` y `/activate` con proxy (Next.js 16) que redirija según el estado de sesión.

## Scope

**In:**

- Convertir el formulario de `app/(auth)/login/page.tsx` de placeholder visual a funcional: inputs controlados, submit que llama `supabase.auth.signInWithPassword()`, manejo de errores.
- Agregar botón de logout funcional en el sidebar (`components/shared/Sidebar.tsx`) que llame `supabase.auth.signOut()` y redirija a `/login`.
- Crear `proxy.ts` en la raíz del proyecto para protección de rutas (Next.js 16 renombra `middleware.ts` → `proxy.ts`):
  - Rutas públicas: `/login`, `/activate`
  - Todas las demás rutas requieren sesión activa.
  - Si no hay sesión en ruta protegida → redirect a `/login`.
  - Si hay sesión en `/login` o `/activate` → redirect a `/`.
- El proxy reutiliza `createClient` de `utils/supabase/middleware.ts` (ya existente) para refrescar la sesión.
- Manejo de errores de login visibles en la UI (mensaje debajo del botón o en un banner).
- Loading state en el botón de login mientras se autentica.

**Out of scope (para futuras specs):**

- Flujo de "¿Olvidaste tu contraseña?" (reset de password).
- Flujo de activación de cuenta en `/activate` (crear usuario con código de invitación).
- Redirección por rol (staff vs parent a diferentes dashboards).
- Botones "Personal" y "Familia" del login (se mantienen como decoración visual).
- Gestión de sesión avanzada (remember me, múltiples sesiones).
- OAuth / login social.

## Data model

No introduce nuevas estructuras de datos. Reutiliza:

- `auth.users` de Supabase Auth (manejado por Supabase).
- Tabla `users` (SPEC 08) con `role`, `status`, `daycare_id`.
- La sesión se maneja vía cookies HTTP (`sb-access-token`, etc.) gestionadas por `@supabase/ssr`.

## Implementation plan

1. **Login funcional en `app/(auth)/login/page.tsx`.** Convertir el formulario de placeholder a funcional:
   - Agregar `'use client'` al componente.
   - Inputs controlados con `useState` para `email` y `password`.
   - Agregar `onSubmit` al formulario que llame `supabase.auth.signInWithPassword({ email, password })`.
   - Manejar errores: mostrar mensaje de error debajo del botón si falla.
   - Agregar estado de loading: deshabilitar botón y mostrar "Iniciando sesión..." mientras autentica.
   - En éxito: redirigir a `/` con `window.location.href = '/'` (hard refresh para que el proxy refresque la sesión).
   - Mantener botones "Personal" y "Familia" como decoración visual sin función.
   - _Prueba: `npm run dev`, loguearse con `kevin@google.com` / `Abc123456@`, verificar redirección a `/`._

2. **Logout funcional en el sidebar.** Agregar handler de logout en `components/shared/Sidebar.tsx`:
   - El botón de logout (o ícono existente) debe llamar `supabase.auth.signOut()` y redirigir a `/login`.
   - Usar componente cliente o `use client` en la sección del sidebar que contiene el botón.
   - _Prueba: `npm run dev`, loguearse, hacer click en logout, verificar redirección a `/login`._

3. **Proxy de protección de rutas.** Crear `proxy.ts` en la raíz del proyecto (Next.js 16 renombra `middleware.ts` → `proxy.ts`):
   - Reutilizar `createClient` de `utils/supabase/middleware.ts` para obtener la sesión y refrescar cookies.
   - Definir rutas públicas: `/login`, `/activate`.
   - Si el pathname es público y hay sesión → redirect a `/`.
   - Si el pathname NO es público y no hay sesión → redirect a `/login`.
   - Configurar `matcher` para excluir assets estáticos: `/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico)$).*)`.
   - Exportar como `export async function proxy(request: NextRequest)`.
   - _Prueba: `npm run dev`, acceder a `/` sin sesión → redirect a `/login`. Loguearse y acceder a `/login` → redirect a `/`._

4. **Verificar y limpiar.** Ejecutar `npm run lint` y `npx tsc --noEmit`. Verificar que no haya errores en consola del navegador.

## Acceptance criteria

- [] El formulario de `/login` acepta email y password y llama a `supabase.auth.signInWithPassword()`.
- [] Credenciales correctas (`kevin@google.com` / `Abc123456@`) redirigen a `/` después del login.
- [] Credenciales incorrectas muestran un mensaje de error visible en la UI.
- [] El botón de login muestra estado de loading durante la autenticación.
- [] Los botones "Personal" y "Familia" se mantienen como decoración visual sin función.
- [] El botón de logout en el sidebar cierra la sesión y redirige a `/login`.
- [] Acceder a `/` sin sesión activa redirige automáticamente a `/login`.
- [] Acceder a `/login` con sesión activa redirige automáticamente a `/`.
- [] Acceder a `/activate` con sesión activa redirige automáticamente a `/`.
- [] El proxy existe en `proxy.ts` en la raíz del proyecto.
- [] `npm run lint` pasa sin errores.
- [] `npx tsc --noEmit` pasa sin errores.
- [] No hay errores en la consola del navegador al cargar las páginas.

## Decisions

- **Yes:** `'use client'` en login page para manejar estado del formulario y submit. Es un formulario interactivo que necesita `useState` y `useRouter`.
- **Yes:** `window.location.href = '/'` post-login en lugar de `router.push('/')`. Esto fuerza un hard refresh que asegura que el proxy detecte la nueva sesión y refresque las cookies. Evita problemas de estado stale.
- **Yes:** `proxy.ts` en la raíz del proyecto en lugar de `middleware.ts`. Next.js 16 renombró la convención de `middleware` a `proxy`. La funcionalidad es idéntica pero el nombre del archivo y la función exportada cambian.
- **Yes:** Rutas públicas definidas explícitamente (`/login`, `/activate`). Todo lo demás es privado por defecto.
- **Yes:** Reutilizar `createClient` de `utils/supabase/middleware.ts` existente. Ya tiene la lógica de cookies con `@supabase/ssr`.
- **Yes:** Mensaje de error inline debajo del botón de login. Simple, sin toast ni modal.
- **No:** Modificar los botones "Personal" y "Familia". El usuario confirmó que son decoración visual y no se necesitan funcionalmente.
- **No:** Flujo de activación en `/activate`. Va en spec separada.
- **No:** Redirección por rol. Por ahora todos van a `/` post-login.

## Risks

| Risk                                                                      | Mitigation                                                                                                                          |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `window.location.href` causa parpadeo visual post-login                   | Aceptable para MVP. Se puede optimizar después con `router.refresh()` si es necesario.                                              |
| El proxy puede entrar en redirect loop si la sesión es inválida           | `@supabase/ssr` maneja el refresh de tokens automáticamente. Si el token expiró, `getUser()` retorna null y se redirige a `/login`. |
| El sidebar es server component y no puede llamar `signOut()` directamente | Extraer el botón de logout a un componente cliente separado o agregar `'use client'` a la sección del sidebar que lo contiene.      |

## What is **not** in this spec

- Flujo de "¿Olvidaste tu contraseña?".
- Flujo de activación de cuenta en `/activate`.
- Redirección por rol (staff vs parent).
- Botones "Personal" y "Familia" funcionales.
- OAuth / login social.
- Gestión de sesión avanzada (remember me).

Cada uno de esos, si llega, va en su propia spec.
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Pass-through sin llamadas bloqueantes de red en el Edge.
  // La sesión y seguridad son gestionadas de forma reactiva y resiliente por AuthProvider en el cliente
  // y mediante Zero-Trust token validation en cada Server Action.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto recursos estáticos e imágenes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

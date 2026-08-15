import { MetadataRoute } from 'next';

/**
 * robots.ts — Next.js Dynamic Robots configuration
 * 
 * Protects ERP system privacy by explicitly blocking search engine indexation 
 * on all system routes and directories.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: [
        '/',
        '/caja',
        '/clientes',
        '/catalogo',
        '/compras',
        '/equipo',
        '/contabilidad',
        '/calendario',
        '/whatsapp',
        '/kanban',
        '/integraciones',
        '/configuracion',
        '/admin',
        '/apps',
      ],
    },
  };
}

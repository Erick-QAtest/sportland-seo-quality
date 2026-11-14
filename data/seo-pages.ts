
import { routes } from './routes';

// Contrato de datos para las páginas SEO
type SeoPage = {
  id: string;
  name: string;
  path: string;
  keyword: RegExp;
  expectedIndexability: 'indexable' | 'noindex';
};

// Catálogo de páginas a auditar
export const seoPages = [
  {
    id: 'SEO-001',
    name: 'SoftFoam',
    path: routes.softfoamArticle,
    keyword: /soft\s?foam/i,
    expectedIndexability: 'indexable',
  },
  {
    id: 'SEO-002',
    name: 'Hub de tecnologías',
    path: routes.technologiesHub,
    keyword: /tecnolog[ií]a/i,
    expectedIndexability: 'indexable',
  },
] as const satisfies readonly SeoPage[];

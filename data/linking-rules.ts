
import { routes } from './routes';

export const linkingRules = [
  {
    id: 'LINK-001',
    source: routes.softfoamArticle,
    target: routes.technologiesHub,
    type: 'informational',
  },
  {
    id: 'LINK-002',
    source: routes.softfoamArticle,
    target: routes.softfoamCollection,
    type: 'commercial',
  },
  {
    id: 'LINK-003',
    source: routes.technologiesHub,
    target: routes.softfoamArticle,
    type: 'editorial',
  },
] as const;


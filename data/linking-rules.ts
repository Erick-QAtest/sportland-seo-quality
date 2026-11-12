
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
] as const;

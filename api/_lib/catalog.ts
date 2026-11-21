import data from '../../src/data/catalog.json' with { type: 'json' };
import type { Catalog } from '../../shared/catalog.js';

export const catalog = data as unknown as Catalog;

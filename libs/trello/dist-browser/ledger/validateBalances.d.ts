import type { Account } from './types.js';
export default function ({ accts }: {
    accts: Account[];
}): {
    errors: string[] | null;
    accts: Account[];
};

export function assertTrelloCard(o) {
    if (!o)
        throw new Error('Card cannot be falsey');
    if (typeof o !== 'object')
        throw new Error('Card must be an object');
    if (typeof o.id !== 'string')
        throw new Error('Card must have id');
    if (typeof o.name !== 'string')
        throw new Error('Card must have name');
    if (typeof o.idBoard !== 'string')
        throw new Error('Card must have idBoard');
    if (typeof o.pos !== 'number')
        throw new Error('Card must have pos as a number');
    if (typeof o.closed !== 'boolean')
        throw new Error('Card must have closed as boolean');
    if (typeof o.dateLastActivity !== 'string')
        throw new Error('Card must have dateLastActivity');
    if (typeof o.desc !== 'string')
        throw new Error('Card must have desc');
    if (!Array.isArray(o.labels))
        throw new Error('Card must have array of labels, even if empty');
    for (const [index, l] of o.labels.entries()) {
        if (typeof l !== 'object')
            throw new Error(`Label ${index} is not an object, it is ${JSON.stringify(l)}`);
        if (typeof l['color'] !== 'string')
            throw new Error(`Label ${index} does not have a color key that is a string`);
    }
}
export function assertTrelloCards(o) {
    if (!o)
        throw new Error('Card list cannot be falsey');
    if (!Array.isArray(o))
        throw new Error('Card list must be an array');
    for (const i of o) {
        assertTrelloCard(i);
    }
}
export function assertTrelloList(o) {
    if (!o)
        throw new Error('List cannot be falsey');
    if (typeof o !== 'object')
        throw new Error('List must be an object');
    if (typeof o.id !== 'string')
        throw new Error('List must have id');
    if (typeof o.name !== 'string')
        throw new Error('List must have name');
    if (typeof o.idBoard !== 'string')
        throw new Error('List must have idBoard');
    if ('pos' in o && typeof o.pos !== 'number')
        throw new Error('pos of list must be a number if it is there');
    if ('cards' in o) {
        if (!o.cards)
            throw new Error('Cards should exist on list, even if list of cards is empty');
        if (!Array.isArray(o.cards))
            throw new Error('Cards list must be an array');
        for (const c of o.cards) {
            assertTrelloCard(c);
        }
    }
}
export function assertTrelloLists(o) {
    if (!o)
        throw new Error('Lists array cannot be falsey');
    if (!Array.isArray(o))
        throw new Error('Lists array must be an array');
    for (const i of o) {
        assertTrelloList(i);
    }
}
export function assertTrelloBoard(o) {
    if (!o)
        throw new Error('Board cannot be falsey');
    if (typeof o !== 'object')
        throw new Error('Board must be an object');
    if (typeof o.id !== 'string')
        throw new Error('Board must have id');
    if (typeof o.name !== 'string')
        throw new Error('Board must have name');
}
export function assertTrelloBoards(o) {
    if (!o)
        throw new Error('Board list cannot be falsey');
    if (!Array.isArray(o))
        throw new Error('Board list must be an array');
    for (const i of o) {
        assertTrelloBoard(i);
    }
}
export function assertTrelloOrg(o) {
    if (!o)
        throw new Error('Org cannot be falsey');
    if (typeof o !== 'object')
        throw new Error('Org must be an object');
    if (typeof o.id !== 'string')
        throw new Error('Org must have id');
    if (typeof o.name !== 'string')
        throw new Error('Org must have name');
}
export function assertTrelloOrgs(o) {
    if (!o)
        throw new Error('Org list cannot be falsey');
    if (!Array.isArray(o))
        throw new Error('Org list must be an array');
    for (const i of o) {
        assertTrelloOrg(i);
    }
}
//# sourceMappingURL=types.js.map
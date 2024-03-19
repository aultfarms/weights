import debug from 'debug';
const info = debug('af/trello#test/trello:info');
export default async function run(client, t) {
    info('testing trello universal');
    const testorg = 'Ault Farms - TESTING';
    info('It should be able to "connect" to the test org', testorg);
    await client.connect({ org: testorg });
    info('It should be able to get my boards after authorization');
    const result1 = await client.get('/members/me/boards', { fields: 'name,id,closed' });
    if (!Array.isArray(result1))
        throw new Error('Did not return an array of boards');
    if (result1.length < 1)
        throw new Error('Boards array was empty');
    info('It should be able to get a Livestock boardid for the test organization', testorg);
    const result2 = await client.findBoardidByName('Livestock');
    const livestockboardid = '640a0ecdf2fef5c0044cc4e9';
    if (result2 !== livestockboardid)
        throw new Error('Did not return ' + livestockboardid + ' as Livestock boardid, returned ' + result2 + ' instead');
    info('It should be able to get all the lists and cards for the livestock board');
    const result3 = await client.findListsAndCardsOnBoard({ boardid: livestockboardid, listnames: ['Treatments', 'Dead', 'Incoming', 'Out'] });
    if (!result3)
        throw new Error('Got falsey thing back from findListsAndCardsOnBoard');
    if (result3.length < 4)
        throw new Error('One of the requests lists did not come back');
    info('It should be able to saveNewCardAtBottomOfList');
    const genericboardid = await client.findBoardidByName('GenericTests');
    if (!genericboardid)
        throw new Error('ERROR: could not find the GenericTests board in test org');
    const genericboard = await client.findListsAndCardsOnBoard({ boardid: genericboardid, listnames: ['GenericList', 'GenericList2'] });
    const genericlist = genericboard.find(l => l.name === 'GenericList');
    const genericlist2 = genericboard.find(l => l.name === 'GenericList2');
    if (!genericlist)
        throw new Error('ERROR: could not find GenericList in GenericTests board');
    if (!genericlist2)
        throw new Error('ERROR: could not find GenericList2 in GenericTests board'); // for updateExistingCardNameAndMoveToBottomOfList
    const genericlistid = genericlist.id;
    let name = 'testbottom' + (new Date()).toString();
    let desc = name + 'desc';
    await client.saveNewCardAtBottomOfList({ name, desc, idList: genericlistid });
    const result4 = await client.findListsAndCardsOnBoard({ boardid: genericboardid, listnames: ['GenericList'] });
    const listafter = result4.find(l => l.name === 'GenericList');
    if (!listafter)
        throw new Error('Could not retrieve GenericList after putting new card');
    const lastcard = listafter.cards?.slice(-1)?.[0];
    if (!lastcard)
        throw new Error('There is no last card in GenericList after saveNewCardAtBottomOfList');
    if (lastcard.name !== name)
        throw new Error('Name of last card is not ' + name);
    if (lastcard.desc !== desc)
        throw new Error('Desc of last card is not ' + desc);
    info('It should be able to updateExistingCardNameAndMoveToBottomOfList');
    await client.updateExistingCardNameAndMoveToBottomOfList({
        cardid: lastcard.id,
        name: name + '-updated',
        idList: genericlist2.id,
    });
    const result5 = await client.findListsAndCardsOnBoard({ boardid: genericboardid, listnames: ['GenericList2'] });
    const listafter2 = result5.find(l => l.name === 'GenericList2');
    if (!listafter2)
        throw new Error('Could not retrieve GenericList2 after updating card');
    const lastcard2 = listafter.cards?.slice(-1)?.[0];
    if (!lastcard2)
        throw new Error('There is no last card in GenericList2 after updateExistingCardNameAndMoveToBottomOfList');
    if (lastcard2.name !== name)
        throw new Error('Name of last card is not ' + name);
    info('All Trello universal Tests Passed');
}
//# sourceMappingURL=trello.test.js.map
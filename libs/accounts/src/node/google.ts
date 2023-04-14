import type { LivestockInventoryAccountTx, Account, AccountTx, FinalAccounts, RawSheetAccount, StatusFunction } from '../ledger/types.js';
import type { MissingTxResult } from '../inventory/index.js';
import type { Ten99Settings } from '../ten99/index.js';
import type { WorkBook } from 'xlsx-js-style';

export async function readAccountsFromGoogle(
  { status=null, accountsdir}:
  { status?: StatusFunction | null, accountsdir: string }
): Promise<RawSheetAccount[]> {
  throw `WARNING: readAccountsFromGoogle node implemented in node`;
}

export async function uploadXlsxWorkbookToGoogle(
  { parentpath, parentid, filename, workbook }:
  { parentpath?: string, parentid?: string, filename: string, workbook: WorkBook }
): Promise<{ id: string}> {
  throw `WARNING: uploadXlsxWorkbookToGoogle is not implemented in node`;
}

export async function read1099SettingsFromGoogle(
  { status=null, settingsdir}:
  { status?: StatusFunction | null, settingsdir: string }
): Promise<Ten99Settings> {
  throw `WARNING: uploadXlsxWorkbookToGoogle is not implemented in node`;
}


export async function reloadSomeAccountsFromGoogle(
  { status=null, accts, finalaccts }:
  { status?: StatusFunction | null,
    accts: Account[],
    finalaccts: FinalAccounts,
  }
): Promise<FinalAccounts | null> {
  throw `WARNING: reloadSomeAccountsFromGoogle is not implemented in node`;
}


export async function batchUpsertTx(
  { acct, lines, insertOrUpdate }: 
  { acct: Account, lines: AccountTx[], insertOrUpdate: 'INSERT' | 'UPDATE' }
) {
  throw `WARNING: batchUpsertTx is not implemented in node`;
}

export async function pasteBalancesOrTemplate({ acct }: { acct: Account }) {
  throw `WARNING: pasteBalancesOrTemplate is not implemented in node`;
}


export async function insertMissingIvtyTx(missing: MissingTxResult) {
  throw `WARNING: insertMissingIvtyTx is not implemented in node`;
}


export async function applyLivestockFifoUpdates({ acct, lines }: { acct: Account, lines: LivestockInventoryAccountTx[] }) {
  throw `WARNING: applyLivestockFifoUpdates is not implemented in node`;
}

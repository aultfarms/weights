import type { RawSheetAccount, StatusFunction } from '../ledger/types.js';
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

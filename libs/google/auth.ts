import { auth2 } from './gapi';

//--------------------------------------------
// Authorize must be called before anything else
let isAuthorized = false;
export async function authorize() : Promise<boolean> {
  if (isAuthorized) return true;
  const a = await auth2();
  if (a.getAuthInstance().isSignedIn.get()) {
    isAuthorized = true;
    return;
  }
  return a.getAuthInstance().signIn();
}

export async function deauthorize() {
  isAuthorized = false;
  const a = await auth2();
  return a.getAuthInstance().signOut();
}



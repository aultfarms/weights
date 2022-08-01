For some reason I can't figure out, when TS tries to import types from
this library, it has no end of trouble with the reference to @maxim_mazurok/gapi.client.drive
and @maxim_mazurok/gapi.client.sheets.  It is a dependency of @types/gapi.client.drive and
@types/gapi.client.sheets, but somehow it isn't getting figured out properly.

To make matters worse, the tests all pass until you try to import this library in a different
TS project, at which point it tells you that it cannot resolve that.  The solution was to 
just explicity add those two libraries as dependencies, and specificy EXACTLY the same 
version as the one being used in @types/gapi.client.drive and @types/gapi.client.sheets.

I don't expect this to be a long-term solution because the next time you install @types/gapi.client.drive,
it will likely pull a different version of @maxim_mazurok's library and you'll have to match it
there again.


    "@maxim_mazurok/gapi.client.drive": "3.0.20220116",
    "@maxim_mazurok/gapi.client.sheets": "4.0.20220118",

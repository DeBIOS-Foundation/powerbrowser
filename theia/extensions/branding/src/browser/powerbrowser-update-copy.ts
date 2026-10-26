/**
 * UPD-20/21/22/23/32 (46-02): the single site for every contracted
 * in-app-update string. The update client (tab-uris) imports these; no
 * literal update sentence lives in the client. The update-copy row
 * (scripts/verify-update-copy.mjs) derives these values at check time and
 * applies the no-internal-identifier shape test, so a string added here is
 * red until the row's affordance set covers it.
 *
 * Copy contract (REQUIREMENTS.md, verbatim seed values): every body names
 * "PowerBrowser", carries no pref key, port, timeout, sentinel or exception
 * text, and ends with the affordance it names. The version interpolates at
 * render, never stored.
 */
export const POWERBROWSER_UPDATE_COPY = Object.freeze({
    readyTitle: 'PowerBrowser update is ready',
    readyBody: 'PowerBrowser <version> is ready to install. Restart PowerBrowser to finish updating.',
    cannotUpdateBody: 'PowerBrowser cannot update this copy because its folder is read-only. Unpack PowerBrowser somewhere you own, or install it with your package manager.',
    cannotUpdateMacBody: 'PowerBrowser cannot update itself from this location. Move PowerBrowser to your Applications folder, then open it again.',
    couldNotCheckBody: 'PowerBrowser could not check for updates. Check your internet connection, then choose Check again.',
    restartToUpdateTitle: 'PowerBrowser: Restart to Update',
    checkForUpdatesTitle: 'PowerBrowser: Check for Updates',
});

export type PowerBrowserUpdateCopy = typeof POWERBROWSER_UPDATE_COPY;

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// GUI-08 (15-01): content-side half of the PowerBrowserGroup actor pair.
//
// The Theia frontend is unprivileged web content: it cannot reach the actor
// directly, so it posts PowerBrowserGroupRequest DOM events carrying
// { requestId, msg }. This child forwards each one over
// PowerBrowserGroupMutation to the parent and posts the ack back as a
// PowerBrowserGroupResponse DOM event carrying { requestId, reply }, which
// the frontend correlator matches up (5s ack timeout, then the contracted
// save-error bar).
//
// Boundary discipline (D-96): this file carries ZERO privileged reach -- no
// module import of any kind, only the actor globals plus DOM dispatch. It
// loads solely in documents matching the Theia local origin (the matches
// pin in the registration call), so stock-window web content never runs it.

export class PowerBrowserGroupChild extends JSWindowActorChild {
  handleEvent(event) {
    if (!event || event.type !== "PowerBrowserGroupRequest") {
      return;
    }
    const detail = event.detail || {};
    const requestId = detail.requestId;
    const msg = detail.msg;
    if (typeof requestId !== "string" || !requestId || !msg || typeof msg.kind !== "string") {
      return;
    }
    this.sendQuery("PowerBrowserGroupMutation", msg).then(
      reply => {
        this.sendResponse(requestId, reply);
      },
      error => {
        this.sendResponse(requestId, {
          ok: false,
          reason: "store",
          message: String((error && error.message) || error),
        });
      }
    );
  }

  sendResponse(requestId, reply) {
    const win = this.contentWindow;
    if (!win) {
      return;
    }
    win.dispatchEvent(
      new win.CustomEvent("PowerBrowserGroupResponse", {
        detail: { requestId, reply },
      })
    );
  }
}

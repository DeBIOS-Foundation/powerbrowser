# API Coverage — Phase 14.1.1 (GUI Conformance Sweep)

No external API integration: this phase closes GUI conformance gaps in the Gecko shell and the
Theia sidecar — hardening two in-tree verification scripts and reconciling the gap register. The
only "API" the detector matched is Theia's in-process `Widget` API, which is an existing internal
dependency of this tree, not an external API, SDK, or service being integrated.

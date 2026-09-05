# 08-04 (PKG-02): the mapping upstream/browser/defs.mk carries for its
# subtree. The fork's branding overlay (powerbrowser/branding-generated ->
# ../generated/branding) builds outside browser/, and the branding-generated
# symlink redirects the config.mk walk-up into generated/ and the repo root,
# so the walk never meets browser/defs.mk and `mach package` fails in the
# branding locales/content make contexts with "XPI_ROOT_APPID is not
# defined - langpacks will break". Same expression as upstream's file, so no
# ID literal is duplicated here -- MOZ_APP_ID stays patch 010's
# imply_option, the single source.
#
# Scope: reached only by make contexts whose kernel-resolved srcdir walk
# passes the repo root -- the branding overlay and powerbrowser/shell/ (the
# two symlinked-out subtrees). config/rules.mk reads this variable only
# beside XPI_NAME or DIST_SUBDIR, and only the branding moz.builds set
# DIST_SUBDIR (no XPI_NAME anywhere under powerbrowser/), so it is inert
# everywhere else it is visible.
XPI_ROOT_APPID=$(MOZ_APP_ID)

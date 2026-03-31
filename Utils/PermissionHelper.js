// src/Utils/PermissionHelper.js

export const RIGHTS = {
  R: "R",
  C: "C",
  U: "U",
  D: "D",
};

/**
 * Check if user has permission
 * @param {Array|string} permissions
 * @param {string} module
 * @param {string} action
 */
export const hasPermission = (permissions, module, action) => {
  if (!permissions || !module || !action) return false;

  const moduleUpper = module.toUpperCase().trim();
  const actionUpper = action.toUpperCase().trim();

  // Convert single string → array
  const permissionList = Array.isArray(permissions)
    ? permissions
    : [permissions];

  for (let perm of permissionList) {
    if (!perm || typeof perm !== "string") continue;

    const parts = perm.split(".");
    if (parts.length !== 2) continue;

    const permModule = parts[0].trim().toUpperCase();
    const permRights = parts[1].trim().toUpperCase();

    if (permModule === moduleUpper && permRights.includes(actionUpper)) {
      return true;
    }
  }

  return false;
};
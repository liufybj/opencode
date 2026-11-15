declare global {
  const OPENCODE_VERSION: string
  const OPENCODE_CHANNEL: string
  const OPENCODE_PLUGIN_VERSION: string
}

export const InstallationVersion = typeof OPENCODE_VERSION === "string" ? OPENCODE_VERSION : "local"
export const InstallationChannel = typeof OPENCODE_CHANNEL === "string" ? OPENCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
// [wxz-patch] npm 可解析的 @opencode-ai/plugin 版本：构建期取自 packages/plugin。
// preview 构建的 InstallationVersion（如 0.0.0-<branch>-<ts>）含 "/"，会被 npm 当成
// GitHub shorthand owner/repo 走 git 安装并失败。
export const InstallationPluginVersion =
  typeof OPENCODE_PLUGIN_VERSION === "string" ? OPENCODE_PLUGIN_VERSION : InstallationVersion

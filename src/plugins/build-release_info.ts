import fs from 'fs'
import path from 'path'
import { version } from '../../package.json'
import { PluginOption } from 'vite'

/**
 * Custom build plugin to write the version in a dedicated release_info.json file after bundling
 *
 * Moonraker's update_manager trusts project_owner over the configured `repo:`, so a fork has to
 * put its own owner here. RELEASE_PROJECT_OWNER and RELEASE_VERSION let a release workflow do
 * that; local builds keep the upstream values.
 */

export default function buildReleaseInfo(): PluginOption {
    return {
        name: 'build-release_info',
        writeBundle: () => {
            setImmediate(async () => {
                const projectOwner = process.env.RELEASE_PROJECT_OWNER || 'mainsail-crew'
                const releaseVersion = process.env.RELEASE_VERSION || `v${version.toString()}`
                const releaseInfoFile = await fs.promises.open(
                    path.resolve(__dirname, '../../dist/release_info.json'),
                    'w'
                )
                await releaseInfoFile.writeFile(
                    JSON.stringify({
                        project_name: 'mainsail',
                        project_owner: projectOwner,
                        version: releaseVersion,
                    })
                )
                await releaseInfoFile.close()
            })
        },
    }
}

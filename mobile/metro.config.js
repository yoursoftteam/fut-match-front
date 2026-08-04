const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, '../shared')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [sharedRoot]

if (config.resolver) {
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(projectRoot, '../node_modules'),
  ]
}

config.experiments = {
  ...(config.experiments ?? {}),
  tsconfigPaths: true,
}

module.exports = config

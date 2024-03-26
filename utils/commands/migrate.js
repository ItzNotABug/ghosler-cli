import fs from 'fs';
import path from 'path';
import Utils from '../utils.js';
import PM2Manager from '../pm2/manager.js';
import BaseCommand from './base/command.js';

/**
 * Class that attempts to perform a migration.
 */
export default class Migrate extends BaseCommand {

    static yargsCommand() {
        return {
            command: 'migrate',
            description: 'Migrate to newer syntax or format on updates.',
            builder: (_) => null,
            handler: async (argv) => await this.#performTask(argv)
        };
    }

    // noinspection JSUnusedLocalSymbols
    /**
     * Perform migration if necessary.
     *
     * @param argv {Object} - `yargs` argument object containing user input.
     * @returns {Promise<void>} - Nothing.
     */
    static async #performTask(argv) {
        // get current version
        Utils.logStart('Attempting migration...');
        const cliVersion = Utils.cliPackageVersion;
        const processes = await PM2Manager.listProcesses();

        if (processes.length === 0) {
            Utils.logSucceed('No processes found for migration!');
            return;
        }

        await this.#v1_0_84(cliVersion, processes);
        await this.#v1_0_86(cliVersion, processes);
    }

    /**
     * Perform a migration of version 1.0.84 if found.
     *
     * @param {string} cliVersion - Current CLI version.
     * @param {Array<{pid: string, name: string, path: string, status: string}>} processes - The process list to check.
     */
    static async #v1_0_84(cliVersion, processes) {
        // migration was first added on 1.0.84 for updating an instance's `config.production.json` file.
        if (Utils.versionToInt(cliVersion) >= Utils.versionToInt('1.0.84')) {
            if (processes.length === 1) {
                Utils.logStart('Migrating to 1.0.84');

                // let's see if the config file contains the instance & branch fields.
                const defaultProcess = processes[0];

                // branch was always `release` & the instance name was always `ghosler-app`
                await Utils.updateConfigurations('release', defaultProcess.name, defaultProcess.path, false, 2369, true);
                const status = await PM2Manager.forceRegisterForMigration('release', defaultProcess.name, defaultProcess.path);
                if (status) {
                    Utils.logSucceed('Migration 1.0.84 complete, restarting ghosler...');

                    const {status, message} = await PM2Manager.restart(defaultProcess.name, true);
                    status ? Utils.logSucceed(message) : Utils.logFail(message);
                } else {
                    Utils.logWarn('Migration failed for 1.0.84!');
                }
            } else {
                // more than one process, how!?
                Utils.logWarn('Multiple processes found on a previous version that Ghosler did not support. Migration failed.');
            }
        }
    }

    /**
     * Perform a migration of version 1.0.846 if found.
     *
     * @param {string} cliVersion - Current CLI version.
     * @param {Array<{pid: string, name: string, path: string, status: string}>} processes - The process list to check.
     */
    static async #v1_0_86(cliVersion, processes) {
        if (Utils.versionToInt(cliVersion) >= Utils.versionToInt('1.0.86')) {
            Utils.logStart('Migrating to 1.0.86');

            let migrationCompletedGracefully = true;

            for (const process of processes) {
                // Define file names and paths
                const configFileName = 'config.production.json';
                const configFilePath = path.join(process.path, configFileName);
                const newConfigPath = path.join(process.path, 'configuration');
                const newConfigFilePath = path.join(newConfigPath, configFileName);

                // Check if the config file exists
                if (fs.existsSync(configFilePath)) {
                    const packageJsonFilePath = 'package.json';
                    const pkgJsonFileContent = path.join(process.path, packageJsonFilePath);
                    const packageJsonContent = fs.readFileSync(pkgJsonFileContent, 'utf8');
                    const packageJsonFile = JSON.parse(packageJsonContent);

                    if (Utils.versionToInt(packageJsonFile.version) >= 94) {
                        if (!fs.existsSync(newConfigPath)) {
                            fs.mkdirSync(newConfigPath, {recursive: true});
                        }

                        // move the file.
                        fs.renameSync(configFilePath, newConfigFilePath);

                        // restart this instance.
                        const status = await PM2Manager.restart(process.name, true);
                        if (status) {
                            migrationCompletedGracefully = true;
                            Utils.logSucceed(`Migration for ${process.name} 1.0.86 complete.`);
                        } else {
                            migrationCompletedGracefully = false;
                            Utils.logWarn(`1.0.86 Migration failed for ${process.name}!`);
                        }
                    }
                }
            }

            migrationCompletedGracefully
                ? Utils.logSucceed('All instances migrated to 1.0.86!')
                : Utils.logWarn('Some instances were not migrated to 1.0.86!');
        }
    }
}
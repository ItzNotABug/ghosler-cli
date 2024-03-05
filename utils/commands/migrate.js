import Utils from '../utils.js';
import BaseCommand from './base/command.js';
import PM2Manager from '../pm2/manager.js';

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

        const instanceName = await this.#v1_0_84(cliVersion, processes);
        if (instanceName) {
            Utils.logStart('All migrations complete, restarting ghosler...');

            const {status, message} = await PM2Manager.restart(instanceName, true);
            status ? Utils.logSucceed(message) : Utils.logFail(message);
        } else {
            Utils.logSucceed('All migrations complete, unable to restart ghosler though.');
        }
    }

    /**
     * Perform a migration of version 1.0.84 if found.
     *
     * @param {string} cliVersion - Current CLI version.
     * @param {Array<{pid: string, name: string, path: string, status: string}>} processes - The process list to check.
     * @returns {Promise<string|null>} - The name of the instance if the migration was successful.
     */
    static async #v1_0_84(cliVersion, processes) {
        let instanceName = null;

        // migration was first added on 1.0.84 for updating an instance's `config.production.json` file.
        if (Utils.versionToInt(cliVersion) >= Utils.versionToInt('1.0.84')) {
            if (processes.length === 0) {
                Utils.logSucceed('No processes found for migration!');
            } else if (processes.length === 1) {
                Utils.logStart('Migrating to 1.0.84');

                // let's see if the config file contains the instance & branch fields.
                const defaultProcess = processes[0];

                instanceName = defaultProcess.name;

                // branch was always `release` & the instance name was always `ghosler-app`
                await Utils.updateConfigurations('release', defaultProcess.name, defaultProcess.path, false, 2369, true);
                const status = await PM2Manager.forceRegisterForMigration('release', defaultProcess.name, defaultProcess.path);
                status ? Utils.logSucceed('Migration 1.0.84 complete.') : Utils.logWarn('Migration failed for 1.0.84!');
            } else {
                // more than one process, how!?
                Utils.logWarn('Multiple processes found on a previous version that Ghosler did not support. Migration failed.');
            }
        }

        return instanceName;
    }
}
import fs from 'fs';
import path from 'path';
import Utils from '../utils.js';
import PM2Manager from '../pm2/manager.js';
import BaseCommand from './base/command.js';

/**
 * Class that performs a complete uninstall.
 */
export default class Uninstall extends BaseCommand {

    static yargsCommand() {
        return {
            command: 'uninstall',
            description: 'Remove Ghosler, its all data and configurations completely.',
            builder: (yargs) => {
                return yargs.option('name', {
                    type: 'string',
                    description: 'Name of the Ghosler instance to uninstall',
                });
            }, handler: (argv) => this.#performTask(argv)
        };
    }

    /**
     * Start the uninstallation task.
     *
     * @param {Object} argv - `yargs` argument object containing user input.
     * @returns {Promise<void>} - Nothing.
     */
    static async #performTask(argv) {
        const canProceed = await this.canProceed(argv);
        if (!canProceed) return;

        Utils.logStart('Uninstalling Ghosler...');

        const instancePath = await PM2Manager.uninstall(argv.name);
        this.#deleteDirectoryContents(instancePath);

        Utils.logSucceed('Ghosler uninstalled!');
    }

    /**
     * Delete everything in the current directory.
     *
     * @param {string|null} instancePath - The path of the ghosler instance to back up.
     */
    static #deleteDirectoryContents(instancePath) {
        if (!instancePath) {
            Utils.logWarn(`Ghosler uninstalled but unable to delete the directory contents! Given path: ${instancePath}`);
            return;
        }

        const files = fs.readdirSync(instancePath);

        for (const file of files) {
            const fullPath = path.join(instancePath, file);
            fs.rmSync(fullPath, {recursive: true, force: true});
        }
    }
}
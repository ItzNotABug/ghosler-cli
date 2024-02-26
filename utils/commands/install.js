import inquirer from 'inquirer';

import Utils from '../utils.js';
import BaseCommand from './base/command.js';
import PM2Manager from '../pm2/manager.js';

/**
 * Class that performs Ghosler installation.
 */
export default class Install extends BaseCommand {

    static yargsCommand() {
        return {
            command: 'install',
            description: 'Install Ghosler from its GitHub source.',
            builder: (yargs) => {
                return yargs.option('branch', {
                    type: 'string',
                    default: 'release',
                    description: 'Install ghosler from a specific branch or the latest release.',
                });
            },
            handler: async (argv) => {
                const answer = await inquirer.prompt([{
                    type: 'input',
                    message: 'Give a name to this instance (default: ghosler-app):',
                    name: 'instance',
                    default: 'ghosler-app',
                    validate(value) {
                        const patternPassed = value.match(/^[a-zA-Z0-9-_]+$/);
                        if (value.length >= 4 && patternPassed) return true;
                        return 'Name must be at-least 4 characters & can only include alphabets, numbers, hyphen and dashes!';
                    }
                }]);

                argv.instance = answer.instance;
                await this.#performTask(argv);
            }
        };
    }

    /**
     * Start the installation task.
     *
     * @param {Object} argv - `yargs` argument object containing user input.
     * @returns {Promise<void>} - Nothing.
     */
    static async #performTask(argv) {
        Utils.logStart('Initializing');

        const canProceed = await this.isDirectoryEmpty();
        if (!canProceed) {
            Utils.logFail('Current directory is not empty!');
            return;
        }

        // noinspection JSUnresolvedReference
        const branch = argv.branch;
        const instance = argv.instance ?? 'ghosler-app';

        // Cloning
        let message = 'Cloning ';
        if (branch === 'release') message += 'latest release...';
        else message += `${branch} branch...`;

        Utils.logStart(message);
        const clone = await Utils.cloneGhosler(branch);

        if (clone.success) Utils.logSucceed(clone.message);
        else {
            Utils.logFail(`Failed to clone the repository, ${clone.message}`);
            return;
        }

        // Setting up directories
        Utils.logStart("Setting up directories...");
        const extraction = await Utils.extractGhosler();

        if (!extraction.success) {
            Utils.logFail(`Failed to setup the directory, ${extraction.message}`);
            return;
        }

        Utils.logSucceed(extraction.message);

        Utils.logStart("Installing Ghosler...");

        await Utils.updateConfigurations(branch, instance, process.cwd());

        const result = await PM2Manager.register(branch, instance);
        result.status ? Utils.logSucceed(result.message) : Utils.logFail(result.message);
    }
}
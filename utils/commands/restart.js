import Utils from '../utils.js';
import PM2Manager from '../pm2/manager.js';
import BaseCommand from './base/command.js';

/**
 * Class that performs a restart via PM2.
 */
export default class Restart extends BaseCommand {

    static yargsCommand() {
        return {
            command: 'restart',
            description: 'Restart Ghosler if you made any changes to source.',
            builder: (yargs) => {
                return yargs.option('name', {
                    type: 'string',
                    description: 'Name of the Ghosler instance to restart.',
                });
            },
            handler: async (argv) => await this.#performTask(argv)
        };
    }

    /**
     * Start the restart task.
     *
     * @param {Object} argv - `yargs` argument object containing user input.
     * @returns {Promise<void>} - Nothing.
     */
    static async #performTask(argv) {
        // const canProceed = await this.canProceed(argv);
        // if (!canProceed) return;

        Utils.logStart('Restarting Ghosler...');
        const result = await PM2Manager.restart(argv.name);
        result.status ? Utils.logSucceed(result.message) : Utils.logFail(result.message);
    }
}
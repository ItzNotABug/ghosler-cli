import PM2Manager from '../pm2/manager.js';
import BaseCommand from './base/command.js';

/**
 * Class that prints Ghosler logs.
 */
export default class Logs extends BaseCommand {

    static yargsCommand() {
        return {
            command: 'logs',
            description: 'Print logs for Ghosler, Type: error, out.',
            builder: (yargs) => {
                return yargs.option('type', {
                    default: 'out',
                    choices: ['error', 'out'],
                    description: 'Type of log to print.',
                }).option('name', {
                    type: 'string',
                    description: 'Name of the Ghosler instance to show logs for.',
                });
            }, handler: async (argv) => await this.#performTask(argv)
        };
    }

    /**
     * Return logs for a given ghosler instance.
     *
     * @param argv {Object} - `yargs` argument object containing user input.
     * @returns {Promise<void>} - Nothing.
     */
    static async #performTask(argv) {
        const canProceed = await this.canProceed(argv);
        if (!canProceed) return;

        await PM2Manager.logs(argv.name, argv.type);
    }
}
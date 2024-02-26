import Utils from '../utils.js';
import PM2Manager from '../pm2/manager.js';
import BaseCommand from './base/command.js';

/**
 * Class that prints Ghosler logs.
 */
export default class Ls extends BaseCommand {

    static yargsCommand() {
        return {
            command: 'ls',
            description: 'Print all registered Ghosler processes.',
            builder: (_) => null,
            handler: async (argv) => await this.#performTask(argv)
        };
    }

    // noinspection JSUnusedLocalSymbols
    /**
     * Return logs for a given ghosler instance.
     *
     * @param argv {Object} - `yargs` argument object containing user input.
     * @returns {Promise<void>} - Nothing.
     */
    static async #performTask(argv) {
        const message = await PM2Manager.ls();
        Utils.logSucceed(message);
    }
}
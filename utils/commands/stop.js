import Utils from '../utils.js';
import PM2Manager from '../pm2/manager.js';
import BaseCommand from './base/command.js';

/**
 * Class that stops a ghosler instance.
 */
export default class Stop extends BaseCommand {

    static yargsCommand() {
        return {
            command: 'stop',
            description: 'Stop a Ghosler instance.',
            builder: (yargs) => {
                return yargs.option('name', {
                    type: 'string',
                    description: 'Name of the Ghosler instance stop.',
                });
            }, handler: (argv) => this.#performTask(argv)
        };
    }

    /**
     * Start the flush task.
     *
     * @param argv {Object} - `yargs` argument object containing user input.
     * @returns {Promise<void>} - Nothing.
     */
    static async #performTask(argv) {
        const canProceed = await this.canProceed(argv);
        if (!canProceed) return;

        Utils.logStart('Stopping Ghosler...');

        const instanceName = argv.name;
        await PM2Manager.stop(instanceName);

        Utils.logSucceed(`Ghosler instance (${instanceName}) stopped.\n  Use \`ghosler restart --name ${instanceName}\` to restart. `);
    }
}